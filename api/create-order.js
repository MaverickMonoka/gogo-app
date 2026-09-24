const crypto=require("crypto");
const {createClient}=require("@supabase/supabase-js");

function db(){
 const url=process.env.GOGO_SUPABASE_URL,key=process.env.GOGO_SUPABASE_SECRET_KEY;
 return url&&key?createClient(url,key,{auth:{persistSession:false}}):null;
}
module.exports=async function handler(req,res){
 if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
 try{
  const {customer,phone,email,address,fulfilment="Delivery",items=[]}=req.body||{};
  if(!customer||!phone||!address||!Array.isArray(items)||!items.length) return res.status(400).json({error:"Missing checkout details"});
  const clean=items.map(i=>({id:Number(i.id),name:String(i.n||i.name||""),qty:Math.max(1,Number(i.q)||1),unitPrice:Number(i.p||i.unitPrice||0)}));
  const subtotal=clean.reduce((s,i)=>s+i.unitPrice*i.qty,0),delivery=fulfilment==="Collection"?0:35,total=subtotal+delivery;
  const orderId="GOGO-"+Date.now().toString().slice(-8)+"-"+crypto.randomBytes(2).toString("hex").toUpperCase();
  const order={id:orderId,customer,phone,email:email||null,address,fulfilment,items:clean,subtotal,delivery,total,currency:"ZAR",status:"payment_pending",createdAt:new Date().toISOString()};
  const database=db();
  if(database){
   const {error}=await database.from("gogo_orders").insert({id:orderId,customer_name:customer,phone,email:email||null,address,fulfilment,items:clean,subtotal_cents:Math.round(subtotal*100),delivery_cents:Math.round(delivery*100),total_cents:Math.round(total*100),status:"payment_pending"});
   if(error) throw new Error("Order persistence failed: "+error.message);
  }
  const base=(process.env.MOBICOM_PAY_URL||"").replace(/\/$/,""),apiKey=process.env.MOBICOM_PAY_API_KEY;
  if(!base||!apiKey) return res.status(200).json({order,payment:{ready:false}});
  const origin=(process.env.GOGO_APP_URL||("https://"+req.headers.host)).replace(/\/$/,"");
  const pay=await fetch(base+"/api/v1/payments",{method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Idempotency-Key":orderId,"Content-Type":"application/json"},body:JSON.stringify({amount_cents:Math.round(total*100),currency:"ZAR",description:"GoGo order "+orderId,external_reference:orderId,customer_email:email||undefined,return_url:origin+"/?payment=return&order="+encodeURIComponent(orderId),cancel_url:origin+"/?payment=cancel&order="+encodeURIComponent(orderId),metadata:{channel:"gogo",fulfilment}})});
  const payment=await pay.json();
  if(!pay.ok) throw new Error("Payment creation failed");
  if(database) await database.from("gogo_orders").update({payment_id:payment.id}).eq("id",orderId);
  return res.status(201).json({order,payment:{ready:true,id:payment.id,checkoutUrl:payment.checkout_url}});
 }catch(e){return res.status(500).json({error:e.message||"Could not create order"});}
}