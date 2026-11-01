/* Trade infrastructure quotes and observed traffic, shared with the map and UI. */
(function(root){
'use strict';
const G=typeof module!=='undefined'?require('./valley-world-geometry.js'):root.ValleyGeometry;
const P=typeof module!=='undefined'?require('./valley-paths.js'):root.ValleyPaths;
const cache=new WeakMap();
function infrastructure(s,points){
  let entries=cache.get(s);if(!entries){entries=new Map();cache.set(s,entries);}const key=JSON.stringify(points);if(entries.has(key))return entries.get(key);
  const bridges=P.bridgeSpans(points,G.createGeometry(s)).map(b=>({...b,wood:Math.ceil(b.length*.18),stone:Math.ceil(b.length*.035),workDays:Math.ceil(b.length/12)}));
  const result={version:1,bridges,wood:12+bridges.reduce((n,b)=>n+b.wood,0),stone:3+bridges.reduce((n,b)=>n+b.stone,0),days:9+bridges.reduce((n,b)=>n+b.workDays,0)};
  entries.set(key,result);if(entries.size>128)entries.delete(entries.keys().next().value);return result;
}
function vehicle(t){return (t.architecture?.level||0)===0?'sledge':t.architecture.level===1?'handcart':'wagon';}
function traffic(s,c,index){
  const a=c.path[index],b=c.path[index+1];if(typeof a!=='number'||typeof b!=='number'||c.people)return;
  const r=s.routes.find(r=>r.a===a&&r.b===b||r.a===b&&r.b===a);if(!r)return;
  r.tradeTraffic??={trips:0,food:0,wood:0,stone:0};r.tradeTraffic.trips++;r.tradeTraffic.lastDay=s.day;
  const kind=c.phase==='out'?c.kind:c.other,q=c.phase==='out'?c.q:c.payment;if(kind)r.tradeTraffic[kind]=(r.tradeTraffic[kind]||0)+q;
}
function stage(t){const trips=t.tradeTraffic?.trips||0;return trips>=12?2:trips>=3?1:0;}
const api={infrastructure,vehicle,traffic,stage,names:{sledge:'짐썰매',handcart:'손수레',wagon:'달구지'}};
root.ValleyCommerce=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
