const products=[
{id:1,n:"Beef Chuck or Brisket",s:"per kg",p:104.99,c:"Meat",e:"🥩"},
{id:2,n:"Assorted Chicken Flatties",s:"per kg",p:59.99,c:"Meat",e:"🍗"},
{id:3,n:"Your Butcher by SPAR Pork Loin Chops",s:"per kg",p:59.99,c:"Meat",e:"🥩"},
{id:4,n:"Ouma Boerewors",s:"per kg",p:109.99,c:"Meat",e:"🌭"},
{id:5,n:"Danone Danup Multigrain & Yoghurt Blend",s:"950 g · 2 for R46",p:23,c:"Dairy",e:"🥛"},
{id:6,n:"Sea Harvest Oven Crisp Fish Portions",s:"600 g",p:79.99,c:"Frozen",e:"🐟"},
{id:7,n:"SPAR Frozen Chicken Feet",s:"1 kg",p:26.99,c:"Frozen",e:"🍗"},
{id:8,n:"Nestlé Nido 3+ Milk Powder",s:"900 g",p:169.99,c:"Baby",e:"🍼"},
{id:9,n:"Huggies Extra Care Disposable Nappies",s:"Jumbo pack",p:209.99,c:"Baby",e:"👶"},
{id:10,n:"Savlon Antiseptic Liquid",s:"750 ml",p:79.99,c:"Personal Care",e:"🧴"},
{id:11,n:"Sunlight Dishwashing Liquid",s:"750 ml",p:31.99,c:"Household",e:"🧽"},
{id:12,n:"SPAR Briquettes",s:"4 kg",p:79.99,c:"Household",e:"🔥"}];
let cart=[];let cat="All";const $=s=>document.querySelector(s);
function render(){let q=$("#search").value.toLowerCase();let list=products.filter(x=>(cat==="All"||x.c===cat)&&x.n.toLowerCase().includes(q));$("#products").innerHTML=list.map(x=>`<article class="card"><div class="media">${x.img?`<img src="${x.img}" alt="${x.n}">`:`<div class="placeholder">${x.e}</div>`}</div><div class="info"><small>${x.c} · ${x.s}</small><h3>${x.n}</h3><button class="add" onclick="add(${x.id})">+</button><div class="price">R${x.p.toFixed(2)}</div></div></article>`).join("")}
function cats(){let cs=["All",...new Set(products.map(x=>x.c))];$("#cats").innerHTML=cs.map(c=>`<button class="${c===cat?"active":""}" onclick="setCat('${c}')">${c}</button>`).join("")}window.setCat=c=>{cat=c;cats();render()};window.add=id=>{let p=products.find(x=>x.id===id),i=cart.find(x=>x.id===id);i?i.q++:cart.push({...p,q:1});basket()};function basket(){$("#count").textContent=cart.reduce((a,x)=>a+x.q,0);$("#items").innerHTML=cart.map(x=>`<div class="cartrow"><span>${x.q} × ${x.n}</span><b>R${(x.p*x.q).toFixed(2)}</b></div>`).join("");$("#total").textContent="R"+cart.reduce((a,x)=>a+x.p*x.q,0).toFixed(2)}
$("#search").oninput=render;$("#cartBtn").onclick=()=>$("#drawer").classList.add("open");$("#close").onclick=()=>$("#drawer").classList.remove("open");$("#checkout").onclick=()=>alert("Checkout foundation ready. Payment gateway keys are configured server-side before live transactions.");
document.querySelectorAll(".service").forEach(b=>b.onclick=()=>{document.querySelectorAll(".service").forEach(x=>x.classList.remove("active"));b.classList.add("active");let v=b.dataset.view;$("#groceries").hidden=v!=="groceries";$("#stays").hidden=v!=="stays"});cats();render();