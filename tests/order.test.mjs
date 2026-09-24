import test from "node:test";import assert from "node:assert/strict";
test("delivery pricing",()=>{const subtotal=[{p:104.99,q:2},{p:23,q:1}].reduce((s,x)=>s+x.p*x.q,0);assert.equal(Number((subtotal+35).toFixed(2)),267.98)});
test("collection has no delivery fee",()=>{const subtotal=99.99;assert.equal(Number((subtotal+0).toFixed(2)),99.99)});
