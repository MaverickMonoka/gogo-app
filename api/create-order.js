const crypto=require('node:crypto');
const {database,hasDatabase}=require('../lib/database');
const clean=(v,n=180)=>String(v||'').trim().slice(0,n);
module.exports=async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(!hasDatabase())return res.status(503).json({error:'Ordering is not configured'});
 try{
  const b=req.body||{},customer=clean(b.customer,100),phone=clean(b.phone,30),email=clean(b.email,160),address=clean(b.address,300),fulfilment=b.fulfilment||'Delivery',items=b.items;
  const paymentMethod=b.payment_method||'mobicom_pay';
  if(!customer||!/^\\+?[0-9 ()-]{8,25}$/.test(phone)||!address||!['Delivery','Collection'].includes(fulfilment)||!['mobicom_pay','cash_on_delivery'].includes(paymentMethod)||!Array.isArray(items)||items.length<1||items.length>30)return res.status(400).json({error:'Check your checkout details'});
  if(items.some(i=>!Number.isSafeInteger(Number(i.id))||Number(i.id)<1||!Number.isInteger(i.q)||i.q<1||i.q>99))return res.status(400).json({error:'Invalid basket quantities'});
  const ids=[...new Set(items.map(i=>Number(i.id)))],placeholders=ids.map((_,i)=>'$'+(i+1)).join(',');
  const found=await database().query('SELECT id,name,category,unit,price_cents,image_url FROM gogo_products WHERE active=1 AND id IN ('+placeholders+')',ids);
  if(found.rows.length!==ids.length)return res.status(409).json({error:'One or more products are unavailable. Refresh your basket.'});
  const byId=new Map(found.rows.map(p=>[Number(p.id),p]));
  const lines=items.map(i=>{const p=byId.get(Number(i.id));return {id:p.id,name:p.name,category:p.category,unit:p.unit,qty:i.q,unit_price_cents:p.price_cents,line_total_cents:p.price_cents*i.q}});
  const subtotal=lines.reduce((sum,i)=>sum+i.line_total_cents,0),delivery=fulfilment==='Collection'?0:3500,total=subtotal+delivery;
  const id='GOGO-'+Date.now().toString().slice(-8)+'-'+crypto.randomBytes(3).toString('hex').toUpperCase();
  const status=paymentMethod==='cash_on_delivery'?'placed':'payment_pending';
  const order={id,customer,phone,email:email||null,address,fulfilment,items:lines,subtotal_cents:subtotal,delivery_cents:delivery,total_cents:total,currency:'ZAR',status,payment_method:paymentMethod,payment_status:paymentMethod==='cash_on_delivery'?'due_on_delivery':'pending',created_at:new Date().toISOString()};
  await database().query('INSERT INTO gogo_orders(id,customer_name,phone,email,address,fulfilment,items,subtotal_cents,delivery_cents,total_cents,status,payment_method,payment_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',[id,customer,phone,email||null,address,fulfilment,JSON.stringify(lines),subtotal,delivery,total,status,paymentMethod,order.payment_status]);
  if(paymentMethod==='cash_on_delivery')return res.status(201).json({order,payment:{ready:false,method:'cash_on_delivery',message:'Pay the driver on delivery. The merchant must accept your order first.'}});
  const base=(process.env.MOBICOM_PAY_URL||'').replace(/\\/$/,''),apiKey=process.env.MOBICOM_PAY_API_KEY;
  if(!base||!apiKey)return res.status(201).json({order,payment:{ready:false,method:'mobicom_pay',message:'Online payment is not configured. No payment was taken.'}});
  const origin=(process.env.GOGO_APP_URL||('https://'+req.headers.host)).replace(/\\/$/,'');
  const pay=await fetch(base+'/api/v1/payments',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Idempotency-Key':id,'Content-Type':'application/json'},body:JSON.stringify({amount_cents:total,currency:'ZAR',description:'GoGo order '+id,external_reference:id,customer_email:email||undefined,success_url:origin+'/?payment=return&order='+encodeURIComponent(id),cancel_url:origin+'/?payment=cancel&order='+encodeURIComponent(id),webhook_url:origin+'/api/payments/mobicom/webhook',merchant_reference:id,metadata:{channel:'gogo',fulfilment}})});
  const payment=await pay.json();
  if(!pay.ok||!payment.checkout_url)throw new Error('Payment provider did not return a checkout URL');
  await database().query('UPDATE gogo_orders SET payment_id=$1 WHERE id=$2',[payment.payment_id||payment.id,id]);
  return res.status(201).json({order,payment:{ready:true,method:'mobicom_pay',id:payment.payment_id||payment.id,checkoutUrl:payment.checkout_url}});
 }catch(e){console.error('GoGo checkout error',e);return res.status(503).json({error:'Unable to complete checkout. No payment was taken.'})}
};
