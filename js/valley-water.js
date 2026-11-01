/* Community water supply: finite sources, actual fuel, reserves and consumption. */
(function(root){
'use strict';
const need=t=>Math.max(0,t.pop-t.deployed)*.2;
const well=t=>t.buildings.find(b=>b.type==='well'&&!b.ruined);
function protectedAccess(t){return !!t.water&&(t.water.existingSupply||!!well(t));}
function enable(s){
  if(s.waterSystem&&s.towns.every(t=>t.water))return s;s.waterSystem||={version:1,started:s.day};
  for(const t of s.towns){if(t.water)continue;const initial=need(t)*6;t.water={version:1,stock:initial,source:{x:t.x,z:t.z-12,yield:Math.max(3.6,t.pop*.3),name:'담수 샘'},existingSupply:t.id!==0||t.buildings.some(b=>b.type==='home'&&!b.ruined),policy:'collect',shortage:0,dryDays:0,lastWarning:-100,ledger:{initial,cleaned:0,drank:0,spilled:0,fuel:0},last:{drawn:0,cleaned:0,drank:0,fuel:0},baseline:{day:s.day,stock:initial}};t.ledger.waterDeaths??=0;}
  return s;
}
function status(s,t){
  const w=t.water;if(!w)return null;const safe=protectedAccess(t),dailyNeed=need(t),ration=w.policy==='ration',tier=well(t)?.tier||0;
  const region=t.id===0?s.towns.filter(n=>n.id!==0).reduce((a,b)=>!a||Math.hypot(b.x-t.x,b.z-t.z)<Math.hypot(a.x-t.x,a.z-t.z)?b:a,null):t;
  const weather=s.weather&&(s.weather.ids.includes(t.id)||s.weather.ids.includes(region?.id))?s.weather:null;
  const climate=weather?(weather.factor<1?(safe?.72:.48):1.15):1,winter=t.season===3?(safe?.95:.85):1;
  const sourceYield=w.source.yield*(safe?1+tier*.25:.8)*climate*winter*(.6+.4*t.condition),distance=Math.hypot(w.source.x-t.x,w.source.z-t.z),labor=Math.max(0,t.pop-t.deployed)*.1,transport=labor/((safe?.03:.04)+distance*(safe?.001:.005));
  const available=Math.max(0,Math.min(sourceYield,transport)),fuelRate=safe?0:.02,supply=fuelRate?Math.min(available,t.wood/fuelRate):available;
  const demand=dailyNeed*(ration?.65:1),days=dailyNeed?w.stock/Math.max(.001,demand):0;
  return {stock:w.stock,days,normalDays:dailyNeed?w.stock/dailyNeed:0,demand,normalDemand:dailyNeed,supply,sourceYield,protected:safe,boiling:!safe,fuelRate,fuelNeeded:available*fuelRate,policy:w.policy,drought:!!weather&&weather.factor<1,shortage:w.shortage,workFactor:(ration?.88:1)*Math.max(.45,1-w.shortage*.55),capacity:Math.max(4,dailyNeed*8),source:w.source,last:w.last,queued:!!well(t)||t.project?.type==='well'||t.request==='well'};
}
function daily(s,t,log){
  if(!t.water||t.pop<=0)return;const w=t.water,x=status(s,t),drawn=Math.max(0,Math.min(x.sourceYield,(Math.max(0,t.pop-t.deployed)*.1)/((x.protected?.03:.04)+Math.hypot(w.source.x-t.x,w.source.z-t.z)*(x.protected?.001:.005)),Math.max(0,x.capacity-w.stock)));
  const cleaned=Math.min(drawn,x.fuelRate?t.wood/x.fuelRate:drawn),fuel=cleaned*x.fuelRate;t.wood=Math.max(0,t.wood-fuel);w.stock+=cleaned;
  const drank=Math.min(w.stock,x.demand);w.stock-=drank;const spilled=Math.max(0,w.stock-x.capacity);w.stock-=spilled;
  w.ledger.cleaned+=cleaned;w.ledger.drank+=drank;w.ledger.spilled+=spilled;w.ledger.fuel+=fuel;w.last={drawn,cleaned,drank,fuel,sourceYield:x.sourceYield,demand:x.demand};
  w.shortage=x.demand?Math.max(0,1-drank/x.demand):0;w.dryDays=w.shortage>.5?w.dryDays+1:Math.max(0,w.dryDays-1);
  if(w.shortage>.1&&s.day-w.lastWarning>=5){w.lastWarning=s.day;log(s,[t.id],t.name+'의 마실 물이 부족하다. '+(!x.protected&&t.wood<.1?'물을 끓일 땔감이 없다.':'샘의 공급이 소비를 따라가지 못한다.')+' 절수하거나 급수 기반을 정비해야 한다.','water');}
  if(w.dryDays>=3&&s.day%3===0&&t.pop>t.deployed){t.pop--;t.ledger.died++;t.ledger.waterDeaths++;log(s,[t.id],t.name+'에서 계속된 식수 부족으로 주민 한 명을 잃었다.','water');}
}
function workFactor(t){return t.water?(t.water.policy==='ration'?.88:1)*Math.max(.45,1-t.water.shortage*.55):1;}
const api={enable,need,well,protectedAccess,status,daily,workFactor};root.ValleyWater=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
