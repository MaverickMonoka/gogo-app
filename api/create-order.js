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
  if(!["Delivery","Collection"].includes(fulfilment))return res.status(400).json({error:"Invalid fulfilment option"});
  if(!customer||!phone||!address||!Array.isArray(items)||!items.length) return res.status(400).json({error:"Missing checkout details"});
  const prices=[104.99,59.99,59.99,109.99,23,79.99,42.99,169.99,209.99,79.99,31.99,79.99,69.99,69.99,22,99.99];
  if(items.some(i=>!Number.isInteger(i.id)||i.id<1||i.id>prices.length||!Number.isInteger(i.q)||i.q<1||i.q>99))return res.status(400).json({error:"Invalid basket"});
  const clean=items.map(i=>({id:i.id,name:String(i.n||i.name||""),qty:i.q,unitPrice:prices[i.id-1]}));
  const subtotal=clean.reduce((s,i)=>s+i.unitPrice*i.qty,0),delivery=fulfilment==="Collection"?0:35,total=subtotal+delivery;
  const orderId="GOGO-"+Date.now().toString().slice(-8)+"-"+crypto.randomBytes(2).toString("hex").toUpperCase();
  const order={id:orderId,customer,phone,email:email||null,address,fulfilment,items:clean,subtotal,delivery,total,currency:"ZAR",status:"payment_pending",createdAt:new Date().toISOString()};
  const database=db();
  if(!database) return res.status(503).json({error:"Ordering is not yet activated. Database configuration is required; no order or payment has been created."});
  if(database){
   const {error}=await database.from("gogo_orders").insert({id:orderId,customer_name:customer,phone,email:email||null,address,fulfilment,items:clean,subtotal_cents:Math.round(subtotal*100),delivery_cents:Math.round(delivery*100),total_cents:Math.round(total*100),status:"payment_pending"});
   if(error) throw new Error("Order persistence failed: "+error.message);
  }
  const base=(process.env.MOBICOM_PAY_URL||"").replace(/\/$/,""),apiKey=process.env.MOBICOM_PAY_API_KEY;
  if(!base||!apiKey) return res.status(503).json({error:"Payment gateway is not yet activated. Your order reference is "+orderId+"; no payment was taken."});
  const origin=(process.env.GOGO_APP_URL||("https://"+req.headers.host)).replace(/\/$/,"");
  const pay=await fetch(base+"/api/v1/payments",{method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Idempotency-Key":orderId,"Content-Type":"application/json"},body:JSON.stringify({amount_cents:Math.round(total*100),currency:"ZAR",description:"GoGo order "+orderId,external_reference:orderId,customer_email:email||undefined,success_url:origin+"/?payment=return&order="+encodeURIComponent(orderId),cancel_url:origin+"/?payment=cancel&order="+encodeURIComponent(orderId),webhook_url:origin+"/api/payments/mobicom/webhook",merchant_reference:orderId,metadata:{channel:"gogo",fulfilment}})});
  const payment=await pay.json();
  if(!pay.ok) throw new Error("Payment creation failed");
  if(database) await database.from("gogo_orders").update({payment_id:payment.id}).eq("id",orderId);
  return res.status(201).json({order,payment:{ready:true,id:payment.id,checkoutUrl:payment.checkout_url}});
 }catch(e){return res.status(500).json({error:e.message||"Could not create order"});}
}