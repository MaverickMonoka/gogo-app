const crypto=require("crypto");const {createClient}=require("@supabase/supabase-js");
module.exports=async function handler(req,res){
 if(req.method!=="POST")return res.status(405).end();
 const secret=process.env.MOBICOM_WEBHOOK_SECRET;if(!secret)return res.status(503).json({error:"Webhook secret not configured"});
 const raw=typeof req.body==="string"?req.body:JSON.stringify(req.body||{}),sup=String(req.headers["x-mobicom-signature"]||"").replace(/^sha256=/,""),exp=crypto.createHmac("sha256",secret).update(raw).digest("hex");
 const a=Buffer.from(sup),b=Buffer.from(exp);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return res.status(401).json({error:"Invalid signature"});
 const event=req.body||{},type=req.headers["x-mobicom-event"]||event.type||"unknown",payment=event.payment||event.data||event,orderId=payment.external_reference||payment.metadata?.order_id;
 const url=process.env.GOGO_SUPABASE_URL,key=process.env.GOGO_SUPABASE_SECRET_KEY;
 if(url&&key){const db=createClient(url,key,{auth:{persistSession:false}});await db.from("gogo_payment_events").upsert({event_type:type,payment_id:payment.id||null,order_id:orderId||null,payload:event},{onConflict:"event_type,payment_id",ignoreDuplicates:true});if(orderId&&type==="payment.paid")await db.from("gogo_orders").update({status:"paid",updated_at:new Date().toISOString()}).eq("id",orderId);if(orderId&&["payment.failed","payment.cancelled","payment.refunded"].includes(type))await db.from("gogo_orders").update({status:type.split(".")[1],updated_at:new Date().toISOString()}).eq("id",orderId);}
 return res.status(200).json({received:true});
}