/* Real transport limits and paid roads. Reading a quote never changes the economy. */
(function(root){
'use strict';
const G=typeof module!=='undefined'?require('./valley-world-geometry.js'):root.ValleyGeometry;
const P=typeof module!=='undefined'?require('./valley-paths.js'):root.ValleyPaths;
const cache=new WeakMap();
const tiers=[
 {name:'도보 오솔길',tech:0,speed:2.8,capacity:8,crew:2,width:.16,wood:0,stone:0,work:0},
 {name:'다진 흙길',tech:1,speed:4,capacity:24,crew:1,width:.48,wood:.075,stone:.02,work:.07},
 {name:'자갈 수레길',tech:2,speed:5,capacity:60,crew:1,width:.75,wood:.045,stone:.15,work:.09},
 {name:'포장 대로',tech:3,speed:6,capacity:90,crew:1,width:1,wood:.025,stone:.3,work:.12}
];
function enable(s,newWorld=false){
 if(s.frontierEconomy)return s;s.frontierEconomy={version:1,started:s.day};
 for(const t of s.towns){t.transporting=0;t.tradeBalance={started:s.day,foodIn:0,foodOut:0,woodIn:0,woodOut:0,stoneIn:0,stoneOut:0,haulFood:0};t.ledger.transportFood??=0;t.ledger.roadWood??=0;t.ledger.roadStone??=0;}
 for(const r of s.routes){const a=s.towns.find(t=>t.id===r.a),b=s.towns.find(t=>t.id===r.b);r.level=newWorld?Math.max(1,Math.min(a.architecture?.level||1,b.architecture?.level||1,3)):1;r.condition=1;r.owner=r.a;r.bridges??=infrastructure(s,r.waypoints||[],1).bridges;r.roadLedger={wood:0,stone:0,upkeepWood:0,upkeepStone:0};}
 // In-flight old shipments keep their original load and handling agreement.
 if(newWorld)s.towns[0].tradeOpen=false;return s;
}
function infrastructure(s,points,tier=1,previous=0,built=[]){
 let entries=cache.get(s);if(!entries){entries=new Map();cache.set(s,entries);}const key=JSON.stringify([points,tier,previous,built.map(b=>[b.x,b.z])]);if(entries.has(key))return entries.get(key);
 const spans=P.bridgeSpans(points,G.createGeometry(s)),all=spans.map(b=>({...b,wood:Math.ceil(b.length*.18),stone:Math.ceil(b.length*.035),workDays:Math.ceil(b.length/12)}));
 let result;
 if(!s.frontierEconomy)result={version:1,bridges:all,wood:12+all.reduce((n,b)=>n+b.wood,0),stone:3+all.reduce((n,b)=>n+b.stone,0),days:9+all.reduce((n,b)=>n+b.workDays,0)};
 else{
  const length=P.length(points),bridges=all.filter(b=>tier>0||b.length>10),fresh=bridges.filter(b=>!built.some(old=>Math.hypot(old.x-b.x,old.z-b.z)<1));
  let wood=0,stone=0,days=0;for(let level=Math.max(1,previous+1);level<=tier;level++){wood+=Math.ceil(length*tiers[level].wood);stone+=Math.ceil(length*tiers[level].stone);days+=Math.max(2,Math.ceil(length*tiers[level].work));}
  result={version:2,tier,previous,length,bridges,fords:tier===0?all.filter(b=>b.length<=10):[],wood:wood+fresh.reduce((n,b)=>n+b.wood,0),stone:stone+fresh.reduce((n,b)=>n+b.stone,0),days:days+fresh.reduce((n,b)=>n+b.workDays,0)};
 }
 entries.set(key,result);if(entries.size>128)entries.delete(entries.keys().next().value);return result;
}
function stage(r){const level=r.level??(r.created>.1?1:2);return r.condition<.3?Math.max(0,level-1):level;}
function vehicle(t,level=3){return Math.min(t.architecture?.level||0,level)<1?'porter':Math.min(t.architecture?.level||0,level)<2?'handcart':'wagon';}
function transport(s,path,source){
 if(!path||path.length<2)return {level:0,effective:0,vehicle:'porter',speed:2.8,capacity:0,crew:2,days:Infinity,food:Infinity};
 const length=P.course(s,path)?.total||0;let level=3;
 for(let i=1;i<path.length;i++){const r=s.routes.find(r=>r.a===path[i-1]&&r.b===path[i]||r.a===path[i]&&r.b===path[i-1]);if(!r){level=0;break;}level=Math.min(level,stage(r));}
 const effective=Math.min(level,source.architecture?.level||0),t=tiers[effective],days=length/t.speed,food=Math.ceil(days*2*t.crew*.03);
 return {level,effective,vehicle:vehicle(source,level),speed:t.speed,capacity:t.capacity,crew:t.crew,days,food};
}
function release(s,c){if(!c.logistics||c.crewReleased)return;const owner=s.towns.find(t=>t.id===c.from);owner.transporting=Math.max(0,(owner.transporting||0)-c.logistics.crew);c.crewReleased=true;}
function traffic(s,c,index){
 const a=c.path[index],b=c.path[index+1];if(typeof a!=='number'||typeof b!=='number'||c.people)return;const r=s.routes.find(r=>r.a===a&&r.b===b||r.a===b&&r.b===a);if(!r)return;
 r.tradeTraffic??={trips:0,food:0,wood:0,stone:0};r.tradeTraffic.trips++;r.tradeTraffic.lastDay=s.day;const kind=c.phase==='out'?c.kind:c.other,q=c.phase==='out'?c.q:c.payment;if(kind)r.tradeTraffic[kind]=(r.tradeTraffic[kind]||0)+q;
}
function daily(s){if(!s.frontierEconomy)return;
 for(const r of s.routes){if(!r.open||!(r.level>0))continue;const payer=s.towns.find(t=>t.id===(r.owner??r.a)),distance=r.length||P.length(r.waypoints||[]),wood=distance*.00003*(r.level===1?1:.25),stone=distance*.00002*Math.max(0,r.level-1),uw=Math.min(payer.wood,wood),us=Math.min(payer.stone,stone);
  payer.wood-=uw;payer.stone-=us;const ledger=r.roadLedger??={wood:0,stone:0,upkeepWood:0,upkeepStone:0};ledger.upkeepWood+=uw;ledger.upkeepStone+=us;payer.ledger.roadWood=(payer.ledger.roadWood||0)+uw;payer.ledger.roadStone=(payer.ledger.roadStone||0)+us;r.condition=Math.max(.1,Math.min(1,(r.condition??1)+(uw+.000001>=wood&&us+.000001>=stone?.003:-.004)));
 }
}
function investment(s,r,target,owner){
 const quote=infrastructure(s,r.waypoints,target,r.level??0,r.bridges||[]),old=tiers[stage(r)],next=tiers[target],roundOld=2*(r.length||quote.length)/old.speed,roundNew=2*(r.length||quote.length)/next.speed;
 const savedFood=next.capacity*(roundOld*old.crew*.03/old.capacity)-roundNew*next.crew*.03,upkeep=(r.length||quote.length)*.00003*roundNew*1.7+(r.length||quote.length)*.00002*Math.max(0,target-1)*roundNew*2.3;
 const gain=savedFood-upkeep,cost=quote.wood*1.7+quote.stone*2.3;
 return {...quote,target,tech:tiers[target].tech,canTech:(owner.architecture?.level||0)>=tiers[target].tech,savedFood,netSaved:gain,paybackLoads:gain>0?Math.ceil(cost/gain):null};
}
const api={enable,infrastructure,vehicle,transport,traffic,stage,daily,release,investment,tiers,names:{porter:'짐꾼',sledge:'짐썰매',handcart:'손수레',wagon:'달구지'}};
root.ValleyCommerce=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
