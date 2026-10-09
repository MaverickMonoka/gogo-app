const {database}=require('../lib/database');
const crypto=require('node:crypto');
const roles=['merchant','driver'];
const transitions={payment_pending:[],paid:['accepted','cancelled'],accepted:['preparing','cancelled'],preparing:['ready'],ready:['out_for_delivery','collected'],out_for_delivery:['delivered'],delivered:[],collected:[],cancelled:[]};
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 const role=String(req.query.role||'');if(!roles.includes(role))return res.status(400).json({error:'Invalid role'});
 const token=String(req.headers.authorization||'').replace(/^Bearer /i,'');const expected=process.env[role==='merchant'?'GOGO_MERCHANT_TOKEN':'GOGO_DRIVER_TOKEN'];
 if(!expected||!token||Buffer.byteLength(token)!==Buffer.byteLength(expected)||!crypto.timingSafeEqual(Buffer.from(token),Buffer.from(expected)))return res.status(401).json({error:'Access denied. Configure dashboard credentials.'});
 if(!process.env.DATABASE_URL)return res.status(503).json({error:'Neon database not configured'});
 try{
 if(req.method==='GET'){
  const driver=role==='driver';
  const result=await database().query('SELECT id,customer_name,phone,address,fulfilment,items,total_cents,status,created_at,driver_name,driver_phone FROM gogo_orders '+(driver?"WHERE status IN ('ready','out_for_delivery') ":'')+'ORDER BY created_at DESC LIMIT 100');
  return res.status(200).json({orders:result.rows});
 }
 if(req.method!=='PATCH')return res.status(405).json({error:'Method not allowed'});
 const {id,status,driver_name,driver_phone}=req.body||{};
 if(typeof id!=='string'||id.length>90)return res.status(400).json({error:'Invalid order ID'});
 const found=await database().query('SELECT id,status,fulfilment FROM gogo_orders WHERE id=$1',[id]);const order=found.rows[0];
 if(!order)return res.status(404).json({error:'Order not found'});
 if(!transitions[order.status]?.includes(status))return res.status(409).json({error:'Invalid status transition'});
 if(role==='driver'&&!['ready','out_for_delivery'].includes(order.status))return res.status(403).json({error:'Order not assigned for dispatch'});
 if(role==='driver'&&!['out_for_delivery','delivered'].includes(status))return res.status(403).json({error:'Driver cannot set that status'});
 if(role==='merchant'&&['out_for_delivery','delivered'].includes(status))return res.status(403).json({error:'Driver must confirm dispatch and delivery'});
 if(status==='out_for_delivery'&&order.fulfilment==='Collection')return res.status(409).json({error:'Collection orders cannot be dispatched'});
 const update={status};if(role==='driver'&&status==='out_for_delivery'){update.driver_name=String(driver_name||'').slice(0,100);update.driver_phone=String(driver_phone||'').slice(0,30)}
 const result=await database().query('UPDATE gogo_orders SET status=$1,driver_name=COALESCE($2,driver_name),driver_phone=COALESCE($3,driver_phone) WHERE id=$4 AND status=$5 RETURNING id,status',[status,update.driver_name||null,update.driver_phone||null,id,order.status]);
 if(!result.rowCount)return res.status(409).json({error:'Order changed. Refresh and retry.'});
