const test=require('node:test');
const assert=require('node:assert/strict');
const {compile,withDatabaseEnv,database,hasDatabase}=require('../lib/database');
test('postgres numbered parameters become D1 positional parameters',()=>{
 assert.deepEqual(compile('UPDATE gogo_orders SET status=$1 WHERE id=$2 AND status=$1',['paid','ABC']),{sql:'UPDATE gogo_orders SET status=? WHERE id=? AND status=?',bind:['paid','ABC','paid']});
});
test('restaurant array predicate compiles to safe placeholders',()=>{
 assert.deepEqual(compile('SELECT id FROM gogo_menu_items WHERE restaurant_id=$1 AND id=ANY($2::bigint[])',[5,[3,4]]),{sql:'SELECT id FROM gogo_menu_items WHERE restaurant_id=? AND id IN (?,?)',bind:[5,3,4]});
});
test('D1 binding is request scoped',async()=>{
 const calls=[];
 const db={prepare(sql){return {bind(...args){calls.push({sql,args});return {async all(){return {success:true,results:[{id:'a',items:'[{"id":1}]'}]}}}}}}};
 await withDatabaseEnv({DB:db},async()=>{assert.equal(hasDatabase(),true);const r=await database().query('SELECT * FROM gogo_orders WHERE id=$1',['a']);assert.equal(r.rowCount,1);assert.deepEqual(r.rows[0].items,[{id:1}]);});
 assert.equal(hasDatabase(),false);
 assert.deepEqual(calls,[{sql:'SELECT * FROM gogo_orders WHERE id=?',args:['a']}]);
});
