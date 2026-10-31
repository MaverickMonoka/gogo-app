import test from 'node:test';
import assert from 'node:assert/strict';
import dbModule from '../lib/database.js';
import createOrder from '../api/create-order.js';
const {withDatabaseEnv}=dbModule;

test('cash-on-delivery checkout uses D1 catalogue prices, not client basket prices', async()=>{
 const writes=[];
 const d1={
  prepare(sql){
   return {
    bind(...args){
     return {
      async all(){
       if(sql.includes('FROM gogo_products')){
        return {success:true,results:[{id:1,name:'Apples',category:'Produce',unit:'1 kg',price_cents:500,image_url:null}]};
       }
       writes.push({sql,args});
       return {success:true,results:[]};
      }
     };
    }
   };
  }
 };
 const req={method:'POST',body:{customer:'Test Customer',phone:'0821234567',email:'test@example.com',address:'Groblersdal',fulfilment:'Delivery',payment_method:'cash_on_delivery',items:[{id:1,q:2,n:'Fake item',p:0}]}};
 const res={status(code){this.code=code;return this},json(body){this.body=body;return this}};
 await withDatabaseEnv({Gogo:d1},()=>createOrder(req,res));
 assert.equal(res.code,201);
 assert.equal(res.body.order.subtotal_cents,1000);
 assert.equal(res.body.order.delivery_cents,3500);
 assert.equal(res.body.order.total_cents,4500);
 assert.equal(res.body.order.items[0].name,'Apples');
 assert.equal(res.body.order.items[0].unit_price_cents,500);
 assert.equal(res.body.order.payment_status,'due_on_delivery');
 assert.equal(writes.length,1);
 assert.match(writes[0].sql,/INSERT INTO gogo_orders/);
 assert.equal(writes[0].args[10],'placed');
 assert.equal(writes[0].args[11],'cash_on_delivery');
 assert.equal(writes[0].args[12],'due_on_delivery');
});
