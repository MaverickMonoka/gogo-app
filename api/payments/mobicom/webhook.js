const crypto=require('node:crypto');
module.exports.config={api:{bodyParser:false}};
const {createClient}=require('@supabase/supabase-js');
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
 const url=process.env.GOGO_SUPABASE_URL,key=process.env.GOGO_SUPABASE_SECRET_KEY;
 if(!url||!key)return res.status(503).json({error:'Database unavailable'});
 const db=createClient(url,key,{auth:{persistSession:false}});
 const {data:order,error:findError}=await db.from('gogo_orders').select('id,status,total_cents').eq('id',id).maybeSingle();
 if(findError)return res.status(503).json({error:'Database read failed'});
 if(!order)return res.status(404).json({error:'Order not found'});
 if(order.total_cents!==amount)return res.status(409).json({error:'Amount mismatch'});
 if(order.status==='paid'||!['payment_pending','payment_failed'].includes(order.status))return res.status(200).json({ok:true,unchanged:true});
 const status=event.event_type==='payment.paid'?'paid':'payment_failed';
 const {error}=await db.from('gogo_orders').update({status,payment_id:String(event.data.id||'')}).eq('id',id).in('status',['payment_pending','payment_failed']);
 if(error)return res.status(503).json({error:'Database update failed'});
 return res.status(200).json({ok:true});
};
