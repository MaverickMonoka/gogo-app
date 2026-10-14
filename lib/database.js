const { AsyncLocalStorage } = require('node:async_hooks');
const requestEnv = new AsyncLocalStorage();
function withDatabaseEnv(env, fn) { return requestEnv.run(env, fn); }
function hasDatabase() { return Boolean(requestEnv.getStore()?.Gogo); }
function compile(input, params=[]) {
  let sql=input.replace(/::jsonb/gi,'').replace(/::bigint\[\]/gi,'');
  const match=sql.match(/(\w+)\s*=\s*ANY\(\$(\d+)\)/i);
  let array=null;
  if(match) {
    array=params[Number(match[2])-1];
    if(!Array.isArray(array)||!array.length) throw new Error('Invalid menu IDs');
    sql=sql.replace(match[0],match[1]+' IN ('+array.map(()=>'?').join(',')+')');
  }
  const indices=[];
  sql=sql.replace(/\$(\d+)/g,(_,i)=>{indices.push(Number(i)-1);return '?';});
  const bind=indices.map(i=>params[i]);
  // ANY appears at end of the existing restaurant menu SELECT.
  if(array) bind.push(...array);
  return {sql,bind:bind.map(x=>x===undefined?null:x)};
}
function database(){
 const db=requestEnv.getStore()?.Gogo;
 if(!db)throw new Error('Cloudflare D1 database binding Gogo is missing');
 return {async query(sql,params=[]){
  const q=compile(sql,params);
  const result=await db.prepare(q.sql).bind(...q.bind).all();
  if(!result.success)throw new Error('D1 query failed');
  const rows=result.results||[];
  for(const row of rows) if(typeof row.items==='string'){try{row.items=JSON.parse(row.items)}catch{}}
  return {rows,rowCount:rows.length};
 }};
}
module.exports={database,withDatabaseEnv,hasDatabase,compile};
