module.exports=async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 res.setHeader('Cache-Control','no-store');
 const bindings=req.cloudflareEnv||{};
 const hasBinding=typeof bindings.DATABASE_URL==='string'&&bindings.DATABASE_URL.length>0;
 const hasProcess=Boolean(process.env.DATABASE_URL);
 return res.status(200).json({service:'gogo',status:'ok',orderingConfigured:hasBinding||hasProcess,paymentConfigured:Boolean((bindings.MOBICOM_PAY_URL||process.env.MOBICOM_PAY_URL)&&(bindings.MOBICOM_PAY_API_KEY||process.env.MOBICOM_PAY_API_KEY)),diagnostics:{databaseBindingPresent:hasBinding,databaseProcessPresent:hasProcess,restaurantAdminBindingPresent:Boolean(bindings.GOGO_RESTAURANT_ADMIN_TOKEN)},time:new Date().toISOString()});
};
