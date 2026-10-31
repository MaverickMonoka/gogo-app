const crypto=require('node:crypto');
const {database,hasDatabase}=require('../lib/database');
const clean=(v,n=180)=>String(v||'').trim().slice(0,n);
const merchantAuth=req=>{
 const expected=req.cloudflareEnv?.GOGO_MERCHANT_TOKEN||process.env.GOGO_MERCHANT_TOKEN;
 const token=String(req.headers.authorization||'').replace(/^Bearer /i,'');
 if(!expected||!token)return false;
 const a=Buffer.from(token),b=Buffer.from(expected);
 return a.length===b.length&&crypto.timingSafeEqual(a,b);
};
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(!hasDatabase())return res.status(503).json({error:'Grocery catalogue is not configured'});
 try{
  if(req.method==='GET'){
   const result=await database().query('SELECT id,sku,name,description,category,unit,price_cents,image_url,emoji FROM gogo_products WHERE active=1 ORDER BY category,name');
   return res.status(200).json({products:result.rows});
  }
  if(req.method==='POST'||req.method==='PATCH'){
   if(!merchantAuth(req))return res.status(401).json({error:'Merchant access required'});
   const b=req.body||{},price=Number(b.price_cents),name=clean(b.name),category=clean(b.category,60),unit=clean(b.unit,60),image=clean(b.image_url,1000),emoji=clean(b.emoji,12)||'🛒';
   if(!Number.isSafeInteger(price)||price<0||price>100000000||name.length<2||category.length<2||unit.length<1)return res.status(400).json({error:'Enter a valid product name, category, unit and price'});
   if(image&&!/^https:\/\//i.test(image))return res.status(400).json({error:'Product image must use HTTPS'});
   if(req.method==='POST'){
    const sku=clean(b.sku,50)||('GRO-'+Date.now().toString(36).toUpperCase());
    const result=await database().query('INSERT INTO gogo_products(sku,name,description,category,unit,price_cents,image_url,emoji) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,sku,name,category,unit,price_cents,image_url,emoji',[sku,name,clean(b.description,500),category,unit,price,image||null,emoji]);
    return res.status(201).json({product:result.rows[0]});
   }
   const id=Number(b.id);
   if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:'Invalid product ID'});
   const active=b.active===false?0:1;
   const result=await database().query('UPDATE gogo_products SET name=$1,category=$2,unit=$3,price_cents=$4,image_url=$5,emoji=$6,active=$7,updated_at=CURRENT_TIMESTAMP WHERE id=$8 RETURNING id,name,category,unit,price_cents,image_url,emoji,active',[name,category,unit,price,image||null,emoji,active,id]);
   if(!result.rowCount)return res.status(404).json({error:'Product not found'});
   return res.status(200).json({product:result.rows[0]});
  }
  return res.status(405).json({error:'Method not allowed'});
 }catch(e){console.error('grocery catalogue error',e);return res.status(503).json({error:'Grocery catalogue unavailable'})}
};
