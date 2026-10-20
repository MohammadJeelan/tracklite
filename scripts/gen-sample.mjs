// Generates public/sample-shipments.csv — fake data, seeded RNG
import fs from 'fs';
let s = 42; const r = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = a => a[Math.floor(r() * a.length)];
const cities = [['Bengaluru','560034'],['Mumbai','400069'],['Delhi','110017'],['Chennai','600040'],['Hyderabad','500081'],['Pune','411014'],['Kolkata','700091'],['Coimbatore','641004'],['Jaipur','302017'],['Ahmedabad','380015'],['Lucknow','226010'],['Kochi','682024'],['Indore','452010'],['Guwahati','781005']];
const hubs = {Bengaluru:'Bengaluru Hoskote Hub',Mumbai:'Bhiwandi Mother Hub',Delhi:'Gurgaon Bilaspur Hub',Chennai:'Chennai Poonamallee Hub',Hyderabad:'Hyderabad Shamshabad Hub',Pune:'Pune Chakan Hub',Kolkata:'Kolkata Dankuni Hub',Coimbatore:'Coimbatore Sulur Hub',Jaipur:'Jaipur Bagru Hub',Ahmedabad:'Ahmedabad Changodar Hub',Lucknow:'Lucknow Chinhat Hub',Kochi:'Kochi Kalamassery Hub',Indore:'Indore Pithampur Hub',Guwahati:'Guwahati Azara Hub'};
const C = {
 Delhivery:{pick:'Manifested',trans:'In Transit',hub:'Reached Hub',ofd:'Dispatched',del:'Delivered',fail:'Pending - Undelivered',rto:'RTO Initiated'},
 'Blue Dart':{pick:'PU',trans:'IT',hub:'HUB',ofd:'OFD',del:'DL',fail:'UD',rto:'RT'},
 Ekart:{pick:'shipment_picked',trans:'in_transit',hub:'reached_hub',ofd:'out_for_delivery',del:'delivered',fail:'delivery_attempt_failed',rto:'rto_initiated'},
 XpressBees:{pick:'PKD',trans:'IT',hub:'RAD',ofd:'OFD',del:'DLVD',fail:'UDL',rto:'RTO'},
};
const NOW = new Date('2026-10-20T18:00:00+05:30');
const fmt = d => new Date(d.getTime()+5.5*3600e3).toISOString().slice(0,16).replace('T',' ');
const add = (d,h) => new Date(d.getTime()+h*3600e3);
const rows = [['order_id','courier','origin_city','destination_city','pincode','created_at','promised_date','delivered_at','status_events']];
for (let i=0;i<200;i++){
  const courier = pick(Object.keys(C)), m = C[courier];
  const [o] = pick(cities.slice(0,6)); let d; do { d = pick(cities); } while (d[0]===o);
  const created = add(NOW, -(24 + r()*14*24));
  const transitDays = 2 + Math.floor(r()*4);
  const promised = add(created, transitDays*24);
  const ev = []; const e=(t,c,loc,rem='')=>ev.push([fmt(t),c,loc,rem].join('|'));
  let t = add(created, 3+r()*8); e(t,m.pick,o);
  t = add(t,2+r()*6); e(t,m.trans,hubs[o]);
  const scen = r(); let delivered='';
  const stuck = scen<0.12, fail = scen>=0.12&&scen<0.24, addr = scen>=0.24&&scen<0.30, rto = scen>=0.30&&scen<0.36, slow = scen>=0.36&&scen<0.46;
  t = add(t, 12+r()*(slow?60:24)); 
  if (t > NOW) { rows.push(row()); continue; }
  e(t,m.hub,hubs[d[0]]);
  if (stuck){ rows.push(row()); continue; } // no movement since hub
  t = add(t, (slow?30:6)+r()*14);
  if (t > NOW) { rows.push(row()); continue; }
  e(t,m.ofd,d[0]);
  if (fail||addr||rto){
    t=add(t,4+r()*5); e(t,m.fail,d[0], addr?pick(['Address incomplete','Incorrect pincode','Consignee address not found']):pick(['Customer not available','Door locked','Customer not reachable on phone']));
    if (rto){ t=add(t,30+r()*20); if(t<NOW) e(t,m.rto,d[0],'Max attempts exceeded'); }
    else if (r()<0.4){ t=add(t,20+r()*10); if(t<NOW){ e(t,m.ofd,d[0]); t=add(t,3+r()*4); e(t,m.del,d[0]); delivered=fmt(t);} }
  } else { t=add(t,2+r()*6); if (t<NOW){ e(t,m.del,d[0]); delivered=fmt(t);} }
  rows.push(row());
  function row(){ return [`TL${String(100245+i*7)}`,courier,o,d[0],d[1],fmt(created),fmt(promised).slice(0,10),delivered,ev.join(';')]; }
}
const csv = rows.map(r=>r.map(v=>/[",;\n]/.test(v)?`"${v.replace(/"/g,'""')}"`:v).join(',')).join('\n');
fs.writeFileSync('public/sample-shipments.csv', csv+'\n'); console.log(rows.length-1,'rows');
