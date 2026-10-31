let products=[];
let stays=[];
let cart=JSON.parse(localStorage.getItem("gogo_cart")||"[]"),cat="All";const $=s=>document.querySelector(s);const money=n=>"R"+n.toFixed(2);
function save(){localStorage.setItem("gogo_cart",JSON.stringify(cart))}
function render(){let q=$("#search").value.toLowerCase();let list=products.filter(x=>(cat==="All"||x.c===cat)&&x.n.toLowerCase().includes(q));$("#products").innerHTML=list.map(x=>`<article class="card"><div class="media">${x.img?`<img src="${x.img}" alt="${x.n}">`:`<div class="placeholder">${x.e}</div>`}</div><div class="info"><small>${x.c} · ${x.s}</small><h3>${x.n}</h3><button class="add" aria-label="Add ${x.n}" onclick="add(${x.id})">+</button><div class="price">${money(x.p)}</div></div></article>`).join("")}
async function loadProducts(){
 try{
  const response=await fetch('/api/products',{cache:'no-store'}),data=await response.json();
  if(!response.ok)throw new Error(data.error||'Catalogue unavailable');
  products=(data.products||[]).map(p=>({id:Number(p.id),n:p.name,s:p.unit,p:Number(p.price_cents)/100,c:p.category,e:p.emoji||'🛒',img:p.image_url||''}));
  cart=cart.map(item=>{const current=products.find(p=>p.id===Number(item.id));return current?{...current,q:item.q}:item});
  save();cats();render();basket();
 }catch(error){$('#products').innerHTML='<p class="notice">The live grocery catalogue is temporarily unavailable. Please try again shortly.</p>'}
}
function cats(){let cs=["All",...new Set(products.map(x=>x.c))];$("#cats").innerHTML=cs.map(c=>`<button class="${c===cat?"active":""}" onclick="setCat('${c}')">${c}</button>`).join("")}
window.setCat=c=>{cat=c;cats();render()};window.add=id=>{let p=products.find(x=>x.id===id),i=cart.find(x=>x.id===id);i?i.q++:cart.push({...p,q:1});save();basket();$("#drawer").classList.add("open")};window.qty=(id,d)=>{let i=cart.find(x=>x.id===id);if(!i)return;i.q+=d;if(i.q<1)cart=cart.filter(x=>x.id!==id);save();basket()};
function basket(){let sub=cart.reduce((a,x)=>a+x.p*x.q,0),del=sub?35:0;$("#count").textContent=cart.reduce((a,x)=>a+x.q,0);$("#items").innerHTML=cart.length?cart.map(x=>`<div class="cartrow"><span><b>${x.n}</b><br><small>${money(x.p)} each</small></span><div class="qty"><button onclick="qty(${x.id},-1)">−</button><b>${x.q}</b><button onclick="qty(${x.id},1)">+</button></div></div>`).join(""):'<div class="empty">Your basket is empty.</div>';$("#subtotal").textContent=money(sub);$("#delivery").textContent=money(del);$("#total").textContent=money(sub+del)}
function modal(html){$("#modalBody").innerHTML=html;$("#modal").classList.add("open")}
function checkout(){
 if(!cart.length)return modal("<h2>Your basket is empty</h2><p>Add groceries before checkout.</p>");
 let sub=cart.reduce((a,x)=>a+x.p*x.q,0),total=sub+35;
 $("#drawer").classList.remove("open");
 modal(`<small>SECURE CHECKOUT</small><h2>Delivery details</h2>
 <div class="field"><label>Full name</label><input id="custName" required maxlength="100"></div>
 <div class="field"><label>Mobile number</label><input id="custPhone" inputmode="tel" required></div>
 <div class="field"><label>Email (for payment receipt)</label><input id="custEmail" type="email"></div>
 <div class="field"><label>Delivery address</label><input id="custAddress" placeholder="Street / village / landmark" required></div>
 <div class="field"><label>Fulfilment</label><select id="fulfil" onchange="updateCheckoutTotal()"><option>Delivery</option><option>Collection</option></select></div>
 <div class="field"><label>Payment method</label><select id="paymentMethod"><option value="mobicom_pay">Mobicom Pay · Online payment</option><option value="cash_on_delivery">Cash on delivery</option></select></div>
 <p class="notice">Online payment is processed securely through Mobicom Pay. Cash on delivery is payable to the driver after delivery.</p>
 <p><b>Total: <span id="checkoutTotal">${money(total)}</span></b></p>
 <button class="primary wide" onclick="placeOrder()">Place order</button>`);
}
window.updateCheckoutTotal=()=>{const sub=cart.reduce((a,x)=>a+x.p*x.q,0),delivery=$("#fulfil")?.value==="Collection"?0:35;$("#checkoutTotal").textContent=money(sub+delivery)};
window.placeOrder=async()=>{
 const n=$("#custName")?.value,p=$("#custPhone")?.value,email=$("#custEmail")?.value||"",a=$("#custAddress")?.value,fulfilment=$("#fulfil")?.value||"Delivery",payment_method=$("#paymentMethod")?.value||"mobicom_pay";
 if(!n||!p||!a)return alert("Complete your name, mobile number and address.");
 const btn=document.querySelector("#modalBody .primary");if(btn){btn.disabled=true;btn.textContent="Submitting order…"}
 try{
  const r=await fetch("/api/create-order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customer:n,phone:p,email,address:a,fulfilment,payment_method,items:cart})});
  const data=await r.json();if(!r.ok)throw new Error(data.error||"Checkout failed");
  if(payment_method==="cash_on_delivery"){
   cart=[];save();basket();modal(`<h2>Order received</h2><p>Reference <b>${data.order.id}</b></p><p>Your order has been submitted. Payment is due in cash on delivery after the merchant accepts the order.</p><p>Total <b>${money(data.order.total_cents/100)}</b></p>`);return;
  }
  if(data.payment?.ready&&data.payment.checkoutUrl){cart=[];save();basket();location.href=data.payment.checkoutUrl;return}
  modal(`<h2>Order saved</h2><p>Reference <b>${data.order.id}</b></p><div class="notice">Online payment is not configured yet. No payment was taken. Your basket has been kept so you can retry after payment is enabled.</div><p>Total <b>${money(data.order.total_cents/100)}</b></p>`);
 }catch(e){modal(`<h2>Checkout unavailable</h2><p>${e.message}</p><div class="notice">No payment was taken.</div>`)}
};
function orders(){let os=JSON.parse(localStorage.getItem("gogo_orders")||"[]");modal("<h2>Your orders</h2>"+(os.length?os.map(o=>`<div class="pay-option"><b>${o.id}</b><br><small>${new Date(o.createdAt||o.date||Date.now()).toLocaleString()} · ${o.status}</small><p>${money(o.total)}</p></div>`).join(""):"<p>No orders yet.</p>"))}
async function renderStays(){try{const response=await fetch("/data/emlm-stays.json");if(!response.ok)throw new Error("Listings unavailable");stays=await response.json();$("#stayGrid").innerHTML=stays.map(s=>`<article class="staycard"><div class="stayimg">🏡</div><h3>${s.n}</h3><p>${s.area} · Elias Motsoaledi</p><small>Rates and availability to be confirmed</small><p><button onclick="stayEnquiryById(${s.id})">Enquire</button></p></article>`).join("")}catch(e){$("#stayGrid").textContent="Unable to load local stays."}}
window.stayEnquiryById=id=>{const s=stays.find(x=>x.id===id);if(s)stayEnquiry(s.n)};
window.stayEnquiry=n=>{const s=stays.find(x=>x.n===n);const safe=t=>String(t||"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));modal(`<h2>${safe(n)}</h2><p>Accommodation enquiry · Availability is not yet confirmed.</p><form id="stayForm"><div class="field"><label>Name</label><input name="name" required maxlength="100"></div><div class="field"><label>Mobile</label><input name="phone" type="tel" required maxlength="20"></div><div class="field"><label>Check-in</label><input name="checkin" type="date" required min="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>Nights</label><input name="nights" type="number" min="1" max="30" value="1" required></div><button class="primary wide" type="submit">Prepare enquiry</button></form>`);$("#stayForm").onsubmit=e=>{e.preventDefault();const d=new FormData(e.target);const message=`Accommodation enquiry for ${n}\\nName: ${d.get("name")}\\nPhone: ${d.get("phone")}\\nCheck-in: ${d.get("checkin")}\\nNights: ${d.get("nights")}`;const phone=(s?.whatsapp||"").replace(/\D/g,"").replace(/^0/,"27");if(phone){window.open("https://wa.me/"+phone+"?text="+encodeURIComponent(message),"_blank","noopener,noreferrer")}else{modal("<h2>Enquiry prepared</h2><p>This property has not yet provided a verified booking contact. No enquiry was sent.</p><div class='notice'>Please check back after merchant onboarding.</div>")}}};
function switchView(v){document.querySelectorAll(".service").forEach(x=>x.classList.toggle("active",x.dataset.view===v));$("#groceries").hidden=v!=="groceries";$("#rides").hidden=v!=="rides";$("#stays").hidden=v!=="stays";scrollTo({top:0,behavior:"smooth"})}
document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>switchView(b.dataset.view));$("#search").oninput=render;$("#cartBtn").onclick=()=>$("#drawer").classList.add("open");$("#close").onclick=()=>$("#drawer").classList.remove("open");$("#checkout").onclick=checkout;$("#modalClose").onclick=()=>$("#modal").classList.remove("open");$("#ordersBtn").onclick=orders;$("#bottomOrders").onclick=orders;$("#accountBtn").onclick=()=>modal("<h2>GoGo account</h2><p>Customer profile, saved addresses, favourites and payment preferences will live here.</p>");$("#onboardBtn").onclick=()=>{modal('<h2>Register your lodge</h2><p>Apply to offer GoGo transport bookings to your guests.</p><form id="lodgeForm"><div class="field"><label>Property name</label><input name="name" required></div><div class="field"><label>Contact person</label><input name="contact_name" required></div><div class="field"><label>Phone</label><input name="contact_phone" type="tel" required></div><div class="field"><label>Area</label><input name="area" required></div><button class="primary wide">Submit application</button></form>');$("#lodgeForm").onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{const response=await fetch('/api/lodges',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});const data=await response.json();if(!response.ok)throw Error(data.error);modal('<h2>Application received</h2><p>Your property is awaiting verification. Transport bookings are not yet activated.</p>')}catch(err){alert(err.message);b.disabled=false}}};loadProducts();basket();renderStays();
let bookingType='now';document.querySelectorAll('[data-booking]').forEach(b=>b.onclick=()=>{bookingType=b.dataset.booking;document.querySelectorAll('[data-booking]').forEach(x=>x.classList.toggle('selected',x===b));document.querySelector('#rideWhenField').hidden=bookingType!=='scheduled';document.querySelector('[name=pickup_at]').required=bookingType==='scheduled'});
document.querySelector('#rideForm').onsubmit=async e=>{e.preventDefault();const form=e.target,button=form.querySelector('button[type=submit]'),feedback=document.querySelector('#rideFeedback');const payload={...Object.fromEntries(new FormData(form)),booking_type:bookingType};button.disabled=true;feedback.textContent='Submitting ride request…';try{const r=await fetch('/api/rides',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await r.json();if(!r.ok)throw Error(data.error||'Unable to book ride');feedback.textContent='Request '+data.id+' received. A driver and fare are not yet confirmed.';form.reset()}catch(err){feedback.textContent=err.message}finally{button.disabled=false}};

document.querySelector('#exploreGroceries')?.addEventListener('click',()=>document.querySelector('#search')?.focus());
