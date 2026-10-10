// Cloudflare Worker adapter for GoGo's existing Node-style API handlers.
// Requires nodejs_compat and nodejs_compat_populate_process_env.
import health from './api/health.js';
import rides from './api/rides.js';
import lodges from './api/lodges.js';
import rideDispatch from './api/ride-dispatch.js';
import restaurants from './api/restaurants.js';
import operations from './api/operations.js';
import createOrder from './api/create-order.js';
import webhook from './api/payments/mobicom/webhook.js';

const handlers={
 '/api/health':health,
 '/api/rides':rides,
 '/api/lodges':lodges,
 '/api/ride-dispatch':rideDispatch,
 '/api/restaurants':restaurants,
 '/api/operations':operations,
 '/api/create-order':createOrder,
 '/api/payments/mobicom/webhook':webhook
};
function respond(handler,request,url,raw){
 return new Promise((resolve,reject)=>{
  const headers=new Headers({'content-type':'application/json; charset=utf-8'});
  let status=200,finished=false;
  const res={
   setHeader:(key,value)=>{headers.set(key,String(value));return res},
   status:(code)=>{status=code;return res},
   json:(data)=>{if(!finished){finished=true;resolve(new Response(JSON.stringify(data),{status,headers}))}return res},
   send:(data)=>{if(!finished){finished=true;resolve(new Response(data,{status,headers}))}return res}
  };
  const req={
   method:request.method,
   headers:Object.fromEntries(request.headers.entries()),
   query:Object.fromEntries(url.searchParams.entries()),
   body:undefined,
   [Symbol.asyncIterator]:async function*(){yield new Uint8Array(raw)}
  };
  try{
   if(raw.length&&url.pathname!=='/api/payments/mobicom/webhook'){
    try{req.body=JSON.parse(new TextDecoder().decode(raw))}catch{return resolve(new Response(JSON.stringify({error:'Invalid JSON'}),{status:400,headers}))}
   }
   Promise.resolve(handler(req,res)).then(result=>{
    if(!finished&&result instanceof Response){finished=true;resolve(result)}
    else if(!finished){finished=true;resolve(new Response(JSON.stringify({error:'No response from handler'}),{status:500,headers}))}
   }).catch(reject);
  }catch(e){reject(e)}
 });
}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  const handler=handlers[url.pathname];
  if(!handler)return env.ASSETS.fetch(request);
  if(!['GET','POST','PATCH'].includes(request.method))return Response.json({error:'Method not allowed'},{status:405});
  if(Number(request.headers.get('content-length')||0)>262144)return Response.json({error:'Request too large'},{status:413});
  try{
   const raw=request.method==='GET'?new Uint8Array():new Uint8Array(await request.arrayBuffer());
   if(raw.byteLength>262144)return Response.json({error:'Request too large'},{status:413});
   return await respond(handler,request,url,raw);
  }catch(e){console.error('GoGo Worker API error',e);return Response.json({error:'Service temporarily unavailable'},{status:503})}
 }
};