const crypto=require('node:crypto');
module.exports.config={api:{bodyParser:false}};
const {database}=require('../../../lib/database');
module.exports=async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const secret=process.env.MOBICOM_PAY_WEBHOOK_SECRET;
 if(!secret)return res.status(503).json({error:'Webhook not configured'});
 const chunks=[];for await(const chunk of req)chunks.push(chunk);const raw=Buffer.concat(chunks).toString('utf8');
 const supplied=String(req.headers['x-mobicom-signature']||'').replace(/^sha256=/,'');
 if(!/^[a-f0-9]{64}$/i.test(supplied))return res.status(401).json({error:'Invalid signature'});
 const expected=crypto.createHmac('sha256',secret).update(raw).digest('hex');
 if(!crypto.timingSafeEqual(Buffer.from(supplied,'hex'),Buffer.from(expected,'hex')))return res.status(401).json({error:'Invalid signature'});
 let event;try{event=JSON.parse(raw)}catch{return res.status(400).json({error:'Invalid event'})}
 const id=event?.data?.merchant_reference;const amount=event?.data?.amount_minor;
 if(!id||!Number.isInteger(amount)||!['payment.paid','payment.failed'].includes(event.event_type))return res.status(400).json({error:'Invalid payment event'});
 if(!process.env.DATABASE_URL)return res.status(503).json({error:'Database unavailable'});
 const result=await database().query('SELECT id,status,total_cents FROM gogo_orders WHERE id=$1',[id]);const order=result.rows[0];
 if(!order)return res.status(404).json({error:'Order not found'});
 if(order.total_cents!==amount)return res.status(409).json({error:'Amount mismatch'});
 if(order.status==='paid'||!['payment_pending','payment_failed'].includes(order.status))return res.status(200).json({ok:true,unchanged:true});
 const status=event.event_type==='payment.paid'?'paid':'payment_failed';
 await database().query("UPDATE gogo_orders SET status=$1,payment_id=$2 WHERE id=$3 AND status IN ('payment_pending','payment_failed')",[status,String(event.data.id||''),id]);
 return res.status(200).json({ok:true});
};
