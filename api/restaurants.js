const crypto=require('crypto');
const {database}=require('../lib/database');
const clean=(v,n=150)=>String(v||'').trim().slice(0,n);
const admin=req=>{const key=process.env.GOGO_RESTAURANT_ADMIN_TOKEN;const auth=req.headers.authorization||'';return Boolean(key&&auth==='Bearer '+key)};
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 try{
  if(req.method==='GET'){
   const id=Number(req.query.restaurant_id);
   if(req.query.mode==='admin'){
    if(!admin(req))return res.status(401).json({error:'Admin access required'});
    const [restaurants,orders]=await Promise.all([database().query('SELECT * FROM gogo_restaurants ORDER BY created_at DESC LIMIT 200'),database().query('SELECT * FROM gogo_restaurant_orders ORDER BY created_at DESC LIMIT 100')]);
    return res.json({restaurants:restaurants.rows,orders:orders.rows});
   }
   if(req.query.mode==='menu'){
    if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:'Invalid restaurant'});
    const restaurant=await database().query("SELECT id,name,area,cuisine,description FROM gogo_restaurants WHERE id=$1 AND status='approved'",[id]);
    if(!restaurant.rowCount)return res.status(404).json({error:'Restaurant unavailable'});
    const menu=await database().query('SELECT id,name,description,price_cents,available FROM gogo_menu_items WHERE restaurant_id=$1 AND available=true ORDER BY id',[id]);
    return res.json({restaurant:restaurant.rows[0],menu:menu.rows});
   }
   const data=await database().query("SELECT id,name,area,cuisine,description FROM gogo_restaurants WHERE status='approved' ORDER BY name LIMIT 200");
   return res.json({restaurants:data.rows});
  }
  if(req.method==='POST'){
   const b=req.body||{};
   if(b.action==='register'){
    const fields=['name','area','address','contact_name','contact_phone'];if(fields.some(k=>clean(b[k]).length<2))return res.status(400).json({error:'Complete all restaurant contact fields'});
    const result=await database().query('INSERT INTO gogo_restaurants(name,area,address,contact_name,contact_phone,cuisine,description) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,status',[clean(b.name),clean(b.area),clean(b.address,250),clean(b.contact_name),clean(b.contact_phone,25),clean(b.cuisine,60)||'Other',clean(b.description,500)]);
    return res.status(201).json({id:result.rows[0].id,status:'pending',message:'Application received; awaiting verification'});
   }
   if(b.action==='order'){
    const restaurantId=Number(b.restaurant_id),items=b.items;
    if(!Number.isSafeInteger(restaurantId)||restaurantId<1||!Array.isArray(items)||items.length<1||items.length>30||clean(b.customer_name).length<2||clean(b.customer_phone).length<5||clean(b.delivery_address).length<3)return res.status(400).json({error:'Invalid order details'});
    if(items.some(i=>!Number.isSafeInteger(Number(i.id))||!Number.isInteger(i.qty)||i.qty<1||i.qty>20))return res.status(400).json({error:'Invalid menu quantities'});
    const restaurant=await database().query("SELECT id FROM gogo_restaurants WHERE id=$1 AND status='approved'",[restaurantId]);
    if(!restaurant.rowCount)return res.status(404).json({error:'Restaurant unavailable'});
    const ids=[...new Set(items.map(i=>Number(i.id)))];
    const menu=await database().query('SELECT id,name,price_cents FROM gogo_menu_items WHERE restaurant_id=$1 AND available=true AND id=ANY($2::bigint[])',[restaurantId,ids]);
    if(menu.rows.length!==ids.length)return res.status(400).json({error:'Some menu items are unavailable'});
    const byId=new Map(menu.rows.map(i=>[Number(i.id),i]));
    const lines=items.map(i=>({id:Number(i.id),name:byId.get(Number(i.id)).name,qty:i.qty,price_cents:byId.get(Number(i.id)).price_cents}));
    const subtotal=lines.reduce((sum,i)=>sum+i.qty*i.price_cents,0),delivery=3500,total=subtotal+delivery;
    const id='GGR-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomBytes(3).toString('hex').toUpperCase();
    await database().query('INSERT INTO gogo_restaurant_orders(id,restaurant_id,customer_name,customer_phone,delivery_address,items,subtotal_cents,delivery_cents,total_cents) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)',[id,restaurantId,clean(b.customer_name),clean(b.customer_phone,25),clean(b.delivery_address,300),JSON.stringify(lines),subtotal,delivery,total]);
    return res.status(201).json({id,status:'requested',payment_status:'unpaid',total_cents:total,message:'Order request recorded. Restaurant acceptance, delivery and payment are not yet confirmed. Do not pay until instructed.'});
   }
   if(b.action==='approve'||b.action==='menu_add'||b.action==='status'){
    if(!admin(req))return res.status(401).json({error:'Admin access required'});
    if(b.action==='approve'){
     if(!['approved','suspended','pending'].includes(b.status))return res.status(400).json({error:'Invalid status'});
     const q=await database().query('UPDATE gogo_restaurants SET status=$1 WHERE id=$2 RETURNING id,status',[b.status,Number(b.restaurant_id)]);return res.json({restaurant:q.rows[0]||null});
    }
    if(b.action==='menu_add'){
     const price=Number(b.price_cents);if(!Number.isSafeInteger(price)||price<0||price>10000000||clean(b.name).length<2)return res.status(400).json({error:'Invalid menu item'});
     const q=await database().query('INSERT INTO gogo_menu_items(restaurant_id,name,description,price_cents) VALUES($1,$2,$3,$4) RETURNING id',[Number(b.restaurant_id),clean(b.name),clean(b.description,300),price]);return res.status(201).json({item:q.rows[0]});
    }
    const allowed={requested:['accepted','cancelled'],accepted:['preparing','cancelled'],preparing:['ready','cancelled'],ready:['out_for_delivery','cancelled'],out_for_delivery:['delivered','cancelled']};
    const existing=await database().query('SELECT status FROM gogo_restaurant_orders WHERE id=$1',[clean(b.order_id,100)]);
    if(!existing.rowCount||!allowed[existing.rows[0].status]?.includes(b.status))return res.status(400).json({error:'Invalid order status transition'});
    const q=await database().query('UPDATE gogo_restaurant_orders SET status=$1 WHERE id=$2 RETURNING id,status',[b.status,clean(b.order_id,100)]);return res.json({order:q.rows[0]});
   }
   return res.status(400).json({error:'Unknown action'});
  }
  return res.status(405).json({error:'Method not allowed'});
 }catch(e){console.error('restaurant api error',e);return res.status(503).json({error:'Restaurant service unavailable. Check database setup.'})}
};