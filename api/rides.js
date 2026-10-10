const crypto=require('node:crypto');
const {database}=require('../lib/database');
const safe=(v,max)=>String(v||'').trim().slice(0,max);
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(!process.env.DATABASE_URL)return res.status(503).json({error:'Neon connection not configured'});
 const b=req.body||{},type=b.booking_type,when=type==='now'?new Date():new Date(b.pickup_at);
 const name=safe(b.rider_name,100),phone=safe(b.rider_phone,30),pickup=safe(b.pickup,250),destination=safe(b.destination,250),lodge=safe(b.lodge_name,150),notes=safe(b.notes,400),vehicle=b.vehicle_type||'car',passengers=Number(b.passengers||1);
 if(!['now','scheduled'].includes(type)||!name||!/^\\+?[0-9 ()-]{8,25}$/.test(phone)||!pickup||!destination||pickup.toLowerCase()===destination.toLowerCase()||!['car','shuttle'].includes(vehicle)||!Number.isInteger(passengers)||passengers<1||passengers>12||!Number.isFinite(when.getTime()))return res.status(400).json({error:'Check the booking details'});
 if(type==='scheduled'&&(when.getTime()<Date.now()+15*60000||when.getTime()>Date.now()+90*86400000))return res.status(400).json({error:'Scheduled pickups must be 15 minutes to 90 days ahead'});
 const id='RIDE-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomBytes(3).toString('hex').toUpperCase();
 try{await database().query('INSERT INTO gogo_rides(id,booking_type,rider_name,rider_phone,pickup,destination,pickup_at,passengers,vehicle_type,lodge_name,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[id,type,name,phone,pickup,destination,when.toISOString(),passengers,vehicle,lodge||null,notes||null]);return res.status(201).json({id,status:'requested',booking_type:type,pickup_at:when.toISOString(),message:'Request received. A driver has not yet been assigned; fare and pickup are not confirmed.'})}catch(e){return res.status(503).json({error:'Unable to save ride request'})}
};
