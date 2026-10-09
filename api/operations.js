const {createClient}=require('@supabase/supabase-js');
const crypto=require('node:crypto');
const roles=['merchant','driver'];
const transitions={payment_pending:[],paid:['accepted','cancelled'],accepted:['preparing','cancelled'],preparing:['ready'],ready:['out_for_delivery','collected'],out_for_delivery:['delivered'],delivered:[],collected:[],cancelled:[]};
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 const role=String(req.query.role||'');if(!roles.includes(role))return res.status(400).json({error:'Invalid role'});
 const token=String(req.headers.authorization||'').replace(/^Bearer /i,'');const expected=process.env[role==='merchant'?'GOGO_MERCHANT_TOKEN':'GOGO_DRIVER_TOKEN'];
 if(!expected||!token||Buffer.byteLength(token)!==Buffer.byteLength(expected)||!crypto.timingSafeEqual(Buffer.from(token),Buffer.from(expected)))return res.status(401).json({error:'Access denied. Configure dashboard credentials.'});
 const url=process.env.GOGO_SUPABASE_URL,key=process.env.GOGO_SUPABASE_SECRET_KEY;
 if(!url||!key)return res.status(503).json({error:'Database not configured'});
 const db=createClient(url,key,{auth:{persistSession:false}});
 try{
 if(req.method==='GET'){
  let q=db.from('gogo_orders').select('id,customer_name,phone,address,fulfilment,items,total_cents,status,created_at,driver_name,driver_phone').order('created_at',{ascending:false}).limit(100);
  if(role==='driver')q=q.in('status',['ready','out_for_delivery']);
  const {data,error}=await q;if(error)throw error;
  return res.status(200).json({orders:data||[]});
 }
 if(req.method!=='PATCH')return res.status(405).json({error:'Method not allowed'});
 const {id,status,driver_name,driver_phone}=req.body||{};
 if(typeof id!=='string'||id.length>90)return res.status(400).json({error:'Invalid order ID'});
 const {data:order,error:findError}=await db.from('gogo_orders').select('id,status,fulfilment').eq('id',id).maybeSingle();if(findError)throw findError;
 if(!order)return res.status(404).json({error:'Order not found'});
 if(!transitions[order.status]?.includes(status))return res.status(409).json({error:'Invalid status transition'});
 if(role==='driver'&&!['ready','out_for_delivery'].includes(order.status))return res.status(403).json({error:'Order not assigned for dispatch'});
 if(role==='driver'&&!['out_for_delivery','delivered'].includes(status))return res.status(403).json({error:'Driver cannot set that status'});
 if(role==='merchant'&&['out_for_delivery','delivered'].includes(status))return res.status(403).json({error:'Driver must confirm dispatch and delivery'});
 if(status==='out_for_delivery'&&order.fulfilment==='Collection')return res.status(409).json({error:'Collection orders cannot be dispatched'});
 const update={status};if(role==='driver'&&status==='out_for_delivery'){update.driver_name=String(driver_name||'').slice(0,100);update.driver_phone=String(driver_phone||'').slice(0,30)}
 const {data,error}=await db.from('gogo_orders').update(update).eq('id',id).eq('status',order.status).select('id,status').maybeSingle();if(error)throw error;
 if(!data)return res.status(409).json({error:'Order changed. Refresh and retry.'});return res.status(200).json({order:data});
 }catch(e){return res.status(500).json({error:'Dashboard request failed'});}
};
