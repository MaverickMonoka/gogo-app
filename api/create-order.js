const crypto=require("crypto");
module.exports=async function handler(req,res){
 if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
 try{
  const {customer,phone,address,fulfilment="Delivery",items=[]}=req.body||{};
  if(!customer||!phone||!address||!Array.isArray(items)||!items.length) return res.status(400).json({error:"Missing checkout details"});
  const clean=items.map(i=>({id:Number(i.id),name:String(i.n||i.name||""),qty:Math.max(1,Number(i.q)||1),unitPrice:Number(i.p||i.unitPrice||0)}));
  const subtotal=clean.reduce((s,i)=>s+i.unitPrice*i.qty,0);
  const delivery=fulfilment==="Collection"?0:35;
  const order={id:"GOGO-"+Date.now().toString().slice(-8),customer,phone,address,fulfilment,items:clean,subtotal,delivery,total:subtotal+delivery,currency:"ZAR",status:"payment_pending",createdAt:new Date().toISOString()};
  const payload=Buffer.from(JSON.stringify(order)).toString("base64url");
  const secret=process.env.GOGO_ORDER_SECRET;
  const signature=secret?crypto.createHmac("sha256",secret).update(payload).digest("hex"):null;
  return res.status(200).json({order,payment:{provider:"mobicom-pay",ready:Boolean(process.env.MOBICOM_PAY_URL),checkoutUrl:process.env.MOBICOM_PAY_URL||null},orderToken:signature?payload+"."+signature:null});
 }catch(e){return res.status(500).json({error:"Could not create order"});}
}