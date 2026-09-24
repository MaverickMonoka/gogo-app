const crypto=require("crypto");
module.exports=async function handler(req,res){
 if(req.method!=="POST") return res.status(405).end();
 const secret=process.env.MOBICOM_WEBHOOK_SECRET;
 if(!secret) return res.status(503).json({error:"Webhook secret not configured"});
 const raw=typeof req.body==="string"?req.body:JSON.stringify(req.body||{});
 const supplied=req.headers["x-mobicom-signature"]||"";
 const expected=crypto.createHmac("sha256",secret).update(raw).digest("hex");
 const a=Buffer.from(String(supplied)),b=Buffer.from(expected);
 if(a.length!==b.length||!crypto.timingSafeEqual(a,b)) return res.status(401).json({error:"Invalid signature"});
 // Production persistence/fulfilment hook: write payment event to database here.
 return res.status(200).json({received:true});
}