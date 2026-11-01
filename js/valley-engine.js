/* The same supply, construction and trade rules run for every settlement. */
(function (root) {
'use strict';
const KEY = 'everworld_valley_v2';
const PLANS = {
  home: { name: '주택', wood: 16, stone: 5, work: 6 },
  farm: { name: '공동 농장', wood: 12, stone: 2, work: 5 },
  workshop: { name: '목공 작업장', wood: 26, stone: 10, work: 8 },
  market: { name: '교역 시장', wood: 24, stone: 8, work: 7 },
  mill: { name: '풍차', wood: 32, stone: 16, work: 10 }
};
const JOBS = { food: '식량 생산', wood: '벌목', stone: '채석', build: '운반·건설' };
function random(s) { s.rng = (Math.imul(s.rng,1664525)+1013904223)>>>0; return s.rng/4294967296; }
function count(t, type) { return t.buildings.filter(b=>b.type===type&&!b.ruined).length; }
function capacity(t) { return 6 + count(t,'home')*6; }
function reserveDays(t) { return t.pop ? t.food/(t.pop*.20) : 0; }
function log(s, ids, text, type='life', meta={}) {
  for(const t of [...(s.towns||[]),...(s.plots||[])]){const end=t.name.charCodeAt(t.name.length-1),closed=(end>=44032&&end<=55203)&&(end-44032)%28!==0;for(const [a,b]of [['이 ','가 '],['을 ','를 '],['과 ','와 ']])text=text.replaceAll(t.name+a,t.name+(closed?a:b));}
  const event={id:s.nextEvent++,day:Math.floor(s.time),ids,text,type,...meta};
  s.events.unshift(event);s.events.length=Math.min(s.events.length,360);
  if(meta.story){const story=s.stories.find(x=>x.id===meta.story);if(story){story.ids=[...new Set([...story.ids,...ids])];story.steps.push({...event});story.steps=story.steps.slice(-48);story.updated=s.day;if(['war','territory','battle'].includes(type))story.important=true;}}
  return event.id;
}
function slot(t, type) {
  const n=t.buildings.filter(b=>b.type!=='hall').length;
  if(type==='farm') return {x:-10-count(t,'farm')*5,z:8};
  if(type==='mill') return {x:-14,z:0};
  if(type==='market') return {x:0,z:8};
  const positions=[[-5,-3],[5,-3],[-5,4],[5,4],[-5,-10],[5,-10],[-11,-7],[11,-7],[-11,0],[11,0],[-5,11],[5,11],[-11,7],[11,7],[-5,-17],[5,-17],[0,16],[12,13]];
  const used=new Set(t.buildings.map(b=>`${b.x},${b.z}`));
  const p=positions.find(([x,z])=>!used.has(`${x},${z}`))||[18+(n%3)*5,-10+Math.floor(n/3)*5];
  return {x:p[0],z:p[1]};
}
function addBuilding(t,type,day) { const p=slot(t,type); t.buildings.push({type,...p,day}); }
function makeTown(id,name,x,z,pop,style) {
  const t={id,name,x,z,pop,style,food:pop*5,wood:80,stone:35,coins:35,policy:'balanced',reserve:24,
    project:null,request:null,buildings:[{type:'hall',x:0,z:0,day:0}],workers:[],forest:1000,
    tradeOpen:true,immigration:true,parent:null,founded:0,starved:0,happiness:74,
    ledger:{food:0,wood:0,stone:0,eaten:0,born:0,died:0,arrived:0,left:0,trades:0,built:0}};
  for(let i=0;i<Math.ceil((pop-6)/6);i++)addBuilding(t,'home',0);
  addBuilding(t,'farm',0);addBuilding(t,'market',0);
  for(let i=0;i<6;i++)t.workers.push({id:i,x:x+(i%3)-1,z:z+4.5+Math.floor(i/3),job:i<2?'food':i<4?'wood':i===4?'stone':'build',phase:'필요한 일 찾는 중',cargo:null,task:null,work:0,delivered:0});
  return t;
}
function workSite(t,job) {
  if(job==='food')return {x:t.x-12,z:t.z+9};
  if(job==='wood')return {x:t.x+14,z:t.z-8};
  if(job==='stone')return {x:t.x+11,z:t.z+12};
  return {x:t.x,z:t.z};
}
function move(w,p,dt) {
  const dx=p.x-w.x,dz=p.z-w.z,d=Math.hypot(dx,dz),n=Math.min(d,dt*7);
  if(d<.15){w.x=p.x;w.z=p.z;return true;}
  w.x+=dx/d*n;w.z+=dz/d*n;return n>=d;
}
function plan(s,t,type) {
  if(!PLANS[type]||t.project||t.buildings.length>=24)return false;
  t.project={type,...slot(t,type),material:{wood:0,stone:0},reserved:{wood:0,stone:0},work:0};
  log(s,[t.id],t.name+' · '+PLANS[type].name+' 공사를 계획했다.','build');return true;
}
function decide(s,t) {
  if(t.pop<=0)return;
  const days=reserveDays(t),critical=days<10,workers=days<t.reserve||t.policy==='food'?3:2;
  const jobs=Array(critical?4:workers).fill('food');
  if(t.project&&(!critical||t.project.type==='farm'))jobs.push('build');
  if(t.fertility<.9)jobs.push(t.woodYield>t.stoneYield?'wood':'stone');
  while(jobs.length<6){const woodNeed=t.wood/(maintenance(t,'wood')+1),stoneNeed=t.stone/(maintenance(t,'stone')+.4);jobs.push(woodNeed<stoneNeed?'wood':'stone');if(jobs.length===5&&t.wood>6&&t.stone<8)jobs[4]='stone';}
  if(t.policy==='growth'&&!critical&&days>22&&t.project)jobs[3]='build';
  t.workers.forEach((w,i)=>{if(w.cargo){w.nextJob=jobs[i];}else if(w.job!==jobs[i]){w.job=jobs[i];w.work=0;w.nextJob=null;}});
  if(!t.project&&t.pop>2){
    const ruined=t.buildings.findIndex(b=>b.ruined);
    if(ruined>=0&&t.wood>8&&t.stone>3){const b=t.buildings[ruined];t.project={type:b.type,x:b.x,z:b.z,material:{wood:0,stone:0},reserved:{wood:0,stone:0},work:0,repair:ruined};return;}
    let next=t.request;
    if(!next){if(count(t,'farm')<Math.min(3,Math.ceil(t.land/35))&&days<35)next='farm';else if(t.pop>capacity(t)*.85&&days>24)next='home';else if(!count(t,'market')&&hasConnection(s,t.id)&&days>18)next='market';else if(!count(t,'workshop')&&days>24)next='workshop';else if(!count(t,'mill')&&days>32)next='mill';}
    if(next&&t.wood>=PLANS[next].wood*.6&&t.stone>=PLANS[next].stone*.5){plan(s,t,next);t.request=null;}
  }
}
function worker(s,t,w,dt) {
  if(t.pop<=0){w.phase='정착지 비어 있음';return;}if(t.expedition&&t.expedition.phase!=='waiting'&&w.id===5){w.phase=t.expedition.phase==='scout'?'이웃을 찾아 정찰 중':'숲길을 개척하는 중';move(w,t.expedition,dt);return;}
  const crew=Math.max(0,t.pop-t.deployed)*.5/6*(.65+t.condition*.35)*Math.max(.75,1-t.starved*.012);
  const depot={x:t.x+(w.id%2)*.6,z:t.z+4.4};
  if(w.cargo){
    const c=w.cargo,p=c.site&&t.project?{x:t.x+t.project.x,z:t.z+t.project.z+3.4}:depot;
    w.phase=c.site?'공사장에 '+(c.kind==='wood'?'목재':'석재')+' 운반':'창고로 '+({food:'곡물',wood:'목재',stone:'석재'}[c.kind])+' 운반';
    if(move(w,p,dt)){
      if(c.site&&t.project&&t.project.type===c.site){t.project.material[c.kind]+=c.q;t.project.reserved[c.kind]-=c.q;}
      else {t[c.kind]+=c.q;if(!c.site){t.ledger[c.kind]+=c.q;w.delivered+=c.q;}}
      w.cargo=null;w.work=0;if(w.nextJob){w.job=w.nextJob;w.nextJob=null;}
    }return;
  }
  if(w.job==='build'){
    const p=t.project;if(!p){w.phase='다음 공사 대기';return;}
    const spec=projectCost(p),needed=['wood','stone'].find(k=>p.material[k]+p.reserved[k]<spec[k]-.001);
    if(needed){
      if(!move(w,depot,dt)){w.phase='창고에서 자재 가져오기';return;}
      if(t[needed]<1){w.phase=(needed==='wood'?'목재':'석재')+' 공급 기다림';return;}
      const q=Math.min(4*crew,spec[needed]-p.material[needed]-p.reserved[needed],t[needed]);
      t[needed]-=q;p.reserved[needed]+=q;w.cargo={kind:needed,q,site:p.type};return;
    }
    if(p.material.wood<spec.wood-.001||p.material.stone<spec.stone-.001){w.phase='동료의 운반 기다림';return;}
    if(!move(w,{x:t.x+p.x,z:t.z+p.z+3.4},dt)){w.phase='공사장으로 이동';return;}
    w.phase=spec.name+' 짓는 중';p.work+=dt*Math.sqrt(crew);
    if(p.work>=spec.work){
      if(p.repair!==undefined){t.buildings[p.repair].ruined=false;t.condition=Math.min(1,t.condition+.12);}else t.buildings.push({type:p.type,x:p.x,z:p.z,day:Math.floor(s.time)});t.ledger.built++;
      log(s,[t.id],t.name+' · '+spec.name+' 완성. 실제 자재와 공동 노동으로 마을이 넓어졌다.','build');
      t.project=null;t.happiness=Math.min(95,t.happiness+2);
    }return;
  }
  const dest=workSite(t,w.job);
  if(!move(w,{x:dest.x+(w.id%2)*1.2,z:dest.z},dt)){w.phase=JOBS[w.job]+' 장소로 이동';return;}
  if(w.job==='wood'&&t.forest<=0){w.phase='숲 회복 기다림';return;}
  w.phase=({food:count(t,'farm')?'밭에서 수확 중':'강가에서 열매 채집 중',wood:'숲에서 벌목 중',stone:'채석장에서 일하는 중'})[w.job];
  w.work+=dt;
  if(w.work>=1.4){
    let q=crew*(w.job==='food'?(count(t,'farm')?3.8:2.8):1.8);
    q*=w.job==='food'?foodFactor(s,t):w.job==='wood'?t.woodYield:t.stoneYield;
    q*=w.job==='food'?1+count(t,'farm')*.08+count(t,'mill')*.15:1+count(t,'workshop')*.15;
    if(w.job==='wood'){q=Math.min(q,t.forest);t.forest-=q;}
    t.output[w.job]+=q;if(w.job==='food')t.taxAccrued+=q*t.taxRate;w.cargo={kind:w.job,q};w.work=0;
  }
}
function town(s,id){return s.towns.find(t=>t.id===id);}
function projectCost(p){const a=PLANS[p.type];return p.repair===undefined?a:{...a,wood:a.wood*.5,stone:a.stone*.5,work:a.work*.6};}
function season(s){return Math.floor(s.day/90)%4;}
function foodNeed(t){return Math.max(0,t.pop-t.deployed)*.20;}
function foodFactor(s,t){
  const land=t.land+s.plots.filter(p=>p.owner===t.id&&p.kind==='food').reduce((n,p)=>n+p.capacity,0);
  const bonus=s.plots.filter(p=>p.owner===t.id&&p.kind==='food').length*.14;
  const weather=s.weather&&s.weather.until>s.day&&s.weather.ids.includes(t.id)?s.weather.factor:1;
  return (t.fertility+bonus)*Math.min(1,land/Math.max(1,t.pop))*[1.05,1.3,1.12,.55][season(s)]*weather;
}
function maintenance(t,k){const n=t.buildings.filter(b=>!b.ruined).length;return k==='wood'?n*.045+(t.pop*.014*(t.season===3?1.8:1)):n*.018;}

function storage(t){return Math.max(20,t.pop*10+count(t,'farm')*35+count(t,'mill')*80);}
function population(s){return s.towns.reduce((n,t)=>n+t.pop,0)+s.caravans.reduce((n,c)=>n+(c.people||0),0);}
function hasConnection(s,id){return s.routes.some(r=>(r.a===id||r.b===id)&&r.open);}
function relation(s,a,b){const key=[a,b].sort((a,b)=>a-b).join(':');if(!s.relations[key])s.relations[key]={trust:10,refusals:0,peaceUntil:0,lastDemand:-100};return s.relations[key];}
function atWar(s,a,b){const first=town(s,a),second=town(s,b),belongs=(id,t)=>id===t?.id||(s.regional&&sameFaction(s,town(s,id),t));return s.armies.some(x=>!x.ended&&((belongs(x.from,first)&&belongs(x.to,second))||(belongs(x.from,second)&&belongs(x.to,first))));}
function findPath(s,from,to,military=false){
  if(from===to)return [from];const queue=[[from]],seen=new Set([from]);
  while(queue.length){const path=queue.shift(),id=path.at(-1);for(const r of s.routes){if(!r.open||r.blockedUntil>s.day)continue;const next=r.a===id?r.b:r.b===id?r.a:null;if(next===null||seen.has(next)||(!military&&atWar(s,id,next)))continue;const p=[...path,next];if(next===to)return p;seen.add(next);queue.push(p);}}
  return null;
}
function story(s,ids,title,reason,kind='need'){
  const id=s.nextStory++;s.stories.unshift({id,ids,title,reason,kind,start:s.day,updated:s.day,status:'developing',steps:[]});if(s.stories.length>64){const expendable=s.stories.findLastIndex(x=>!x.important&&x.id!==id);s.stories.splice(expendable>=0?expendable:s.stories.length-1,1);}return id;
}
function recordSample(s){for(const t of s.towns){t.history.push({day:s.day,pop:t.pop,food:t.food,condition:t.condition,buildings:t.buildings.filter(b=>!b.ruined).length,liege:t.liege});t.history=t.history.slice(-40);}}
function diagnose(s,t){
  const old=t.trend[0],duration=old?Math.max(1,s.day-old.day):1;
  const trend=old?(t.food-old.food)/duration:0;
  return {foodDays:reserveDays(t),trend,condition:t.condition,foodFactor:foodFactor(s,t),need:t.need,war:s.armies.some(a=>a.from===t.id||a.to===t.id),connected:hasConnection(s,t.id)};
}
function routeDistance(s,a,b){const path=findPath(s,a,b);if(!path)return Infinity;return path.slice(1).reduce((n,id,i)=>{const x=town(s,path[i]),y=town(s,id);return n+Math.hypot(x.x-y.x,x.z-y.z);},0);}
function price(t,k){const reserve=k==='food'?reserveDays(t):t[k]/Math.max(.2,maintenance(t,k));return ({food:1,wood:1.7,stone:2.3})[k]*Math.max(.7,Math.min(3,24/Math.max(4,reserve)));}
function surplus(t,k){return Math.max(0,t[k]-(k==='food'?foodNeed(t)*24:k==='wood'?maintenance(t,k)*14+5:maintenance(t,k)*16+3));}
function newCaravan(s,a,b,kind,q,other,payment,meta={}){
  const path=findPath(s,a.id,b.id);if(a.pop<=0||b.pop<=0||!path||q<=0||payment<0||a[kind]<q||(other&&b[other]<payment)||atWar(s,a.id,b.id))return false;
  a[kind]-=q;if(other)b[other]-=payment;
  s.caravans.push({id:s.nextCaravan++,from:a.id,to:b.id,kind,q,originalQ:q,other,payment,originalPayment:payment,phase:'out',progress:0,x:a.x,z:a.z,path,people:0,...meta});return true;
}
function trade(s){
  for(const buyer of s.towns.filter(t=>t.pop>0&&t.tradeOpen)){

    const needs=['food','wood','stone'].filter(k=>!s.caravans.some(c=>c.to===buyer.id&&c.phase==='out'&&c.kind===k&&!c.tribute&&!c.people)).filter(k=>k==='food'?reserveDays(buyer)<26:buyer[k]<maintenance(buyer,k)*18+4);
    for(const kind of needs){
      const sellers=s.towns.filter(t=>t.id!==buyer.id&&t.pop>0&&t.tradeOpen&&surplus(t,kind)>3&&findPath(s,t.id,buyer.id)&&!atWar(s,t.id,buyer.id)).sort((a,b)=>s.regional?routeDistance(s,a.id,buyer.id)-routeDistance(s,b.id,buyer.id):surplus(b,kind)-surplus(a,kind));
      let bought=false;
      for(const seller of sellers){
        const offered=['stone','wood','food'].filter(k=>k!==kind&&surplus(buyer,k)>2).sort((a,b)=>surplus(buyer,b)/price(seller,b)-surplus(buyer,a)/price(seller,a));
        for(const other of offered){const q=Math.min(kind==='food'?Math.min(80,Math.max(16,buyer.pop*.85)):18,surplus(seller,kind),surplus(buyer,other)*price(seller,other)/price(seller,kind));const payment=q*price(seller,kind)/price(seller,other);if(q<3)continue;
          if(newCaravan(s,seller,buyer,kind,q,other,payment,{story:buyer.needStory})){bought=true;relation(s,seller.id,buyer.id).trust+=2;log(s,[buyer.id,seller.id],seller.name+' → '+buyer.name+' · '+({food:'곡물',wood:'목재',stone:'석재'})[kind]+' '+Math.round(q)+'을 보내고 '+({food:'곡물',wood:'목재',stone:'석재'})[other]+' '+Math.round(payment)+'을 받기로 했다.','trade',{story:buyer.needStory,stage:'dispatch'});break;}
        }if(bought)break;
      }
    }
  }
}
function pathPosition(s,path,progress){
  const points=path.map(id=>typeof id==='object'?id:town(s,id)),lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.z-points[i].z)),total=lengths.reduce((a,b)=>a+b,0)||1;
  let distance=Math.min(1,progress)*total,index=0;while(index<lengths.length-1&&distance>lengths[index]){distance-=lengths[index++];}const k=Math.min(1,distance/(lengths[index]||1));return {segment:index,x:points[index].x+(points[index+1].x-points[index].x)*k,z:points[index].z+(points[index+1].z-points[index].z)*k,total};
}
function caravanStep(s,c,dt){
  if(!c.path)c.path=[c.from,c.to];const blocked=c.path.slice(1).some((id,i)=>{if(typeof id==='object'||typeof c.path[i]==='object')return false;const r=s.routes.find(r=>(r.a===id&&r.b===c.path[i])||(r.b===id&&r.a===c.path[i]));return !r||!r.open||r.blockedUntil>s.day||atWar(s,id,c.path[i]);});
  if(blocked&&!c.people){const end=c.phase==='out'?c.to:c.from,safe=c.path[Math.min(c.passed||0,c.path.length-1)],alternative=typeof safe==='number'?findPath(s,safe,end):null;if(alternative&&alternative.length>1){c.path=[{x:c.x,z:c.z},...alternative];c.progress=0;c.passed=0;c.wait=0;log(s,[c.from,c.to],'교역 수레가 통행 위험을 피해 다른 길로 돌아간다. 운송은 더 오래 걸린다.','route',{story:c.story});return;}c.wait=(c.wait||0)+dt;if(c.wait>10&&!c.warned){c.warned=true;log(s,[c.from,c.to],'통행이 끊겨 교역 수레가 길에서 기다린다. 재고는 아직 도착하지 않았다.','route',{story:c.story});}return;}
  const p=pathPosition(s,c.path,c.progress);c.progress+=dt*5/p.total;const pos=pathPosition(s,c.path,c.progress);c.x=pos.x;c.z=pos.z;if(pos.segment>(c.passed||0)){for(let i=(c.passed||0)+1;i<=pos.segment;i++){const port=town(s,c.path[i]);if(port?.style==='port'&&port.pop>0){const key=c.phase==='out'?'q':'payment',kind=c.phase==='out'?c.kind:c.other;if(kind&&c[key]>0){const toll=c[key]*.06;c[key]-=toll;port[kind]+=toll;port.ledger.tolls=(port.ledger.tolls||0)+toll;}}}c.passed=pos.segment;}
  if(c.progress<1)return;const a=town(s,c.from),b=town(s,c.to);
  if(c.phase==='out'){
    if(c.q>0){b[c.kind]+=c.q;if(c.kind==='food'&&!c.tribute)b.ledger.importedFood=(b.ledger.importedFood||0)+c.q;}c.q=0;
    if(c.people){b.pop+=c.people;b.ledger.arrived+=c.people;log(s,[a.id,b.id],a.name+'에서 떠난 '+c.people+'명이 '+b.name+'에 도착했다.','migration',{story:c.story});c.people=0;c.done=true;return;}
    if(c.tribute||!c.other){c.done=true;return;}
    c.phase='return';c.progress=0;c.passed=0;c.path=c.path.slice().reverse();
  }else{a[c.other]+=c.payment;c.payment=0;c.done=true;a.ledger.trades++;b.ledger.trades++;relation(s,a.id,b.id).trust+=3;
    log(s,[a.id,b.id],a.name+' ↔ '+b.name+' · 거래 물자가 왕복 도착했다. '+b.name+'의 '+({food:'식량',wood:'목재',stone:'석재'})[c.kind]+' 공급이 보충되었다.','trade',{story:c.story,stage:'arrival'});
    if(c.story){const episode=s.stories.find(x=>x.id===c.story);if(episode&&!episode.important&&episode.status!=='resolved'&&reserveDays(b)>22){episode.status='resolved';episode.outcome='교역으로 부족한 물자를 보충했다.';}}
  }
}
function initialize(t){
  const spec={capital:[1.05,.85,.6,86,.48,1.15],port:[.78,.75,.45,52,.32,.9],castle:[.62,.7,3.2,57,.86,1.55],farm:[1.65,.42,.23,110,.22,.85],forest:[.95,2.1,.3,48,.34,.9],outpost:[1.08,.9,.55,28,.25,.8]}[t.style];
  Object.assign(t,{fertility:spec[0],woodYield:spec[1],stoneYield:spec[2],land:spec[3],ambition:spec[4],defense:spec[5],condition:1,season:0,deployed:0,liege:null,taxRate:0,taxAccrued:0,auto:true,output:{food:0,wood:0,stone:0},trend:[],history:[],need:null,needStory:null,lastNeed:-100,lastDiplomacy:-100,explored:t.id!==0,expedition:null,refugeeCooldown:0});
  t.food=t.pop*8;t.wood=45;t.stone=24;t.reserve=26;t.initialPop=t.pop;
  t.ledger.battleDeaths=0;t.ledger.upkeepWood=0;t.ledger.upkeepStone=0;t.ledger.spoiled=0;t.ledger.tax=0;t.ledger.ruins=0;
}
function claimNeed(s,t){
  const days=reserveDays(t),recent=t.trend[0],trend=recent?(t.food-recent.food)/Math.max(1,s.day-recent.day):0;
  const oldNeed=t.need;const need=days<22?'food':t.condition<.8&&t.wood<5?'wood':t.condition<.8&&t.stone<3?'stone':null;t.need=need;
  if(!need&&oldNeed&&t.needStory){const ep=s.stories.find(x=>x.id===t.needStory);if(ep&&!ep.important&&ep.status==='developing'&&(oldNeed!=='food'||days>26)){ep.status='resolved';ep.outcome='비축과 공급 여건을 회복했다.';log(s,[t.id],t.name+'의 부족한 비축이 회복되었다.','recovery',{story:ep.id});}}
  if(need&&s.day-t.lastNeed>28&&(!t.needStory||oldNeed!==need||!s.stories.some(x=>x.id===t.needStory&&x.status==='developing'))){
    const reason=need==='food'?'식량 '+Math.floor(days)+'일분 · 최근 순증감 '+trend.toFixed(1)+'/일 · 수확 여건 '+Math.round(foodFactor(s,t)*100)+'%':(need==='wood'?'목재':'석재')+' 부족 · 시설 상태 '+Math.round(t.condition*100)+'%';
    t.needStory=story(s,[t.id],t.name+'의 '+({food:'식량',wood:'목재',stone:'석재'})[need]+' 확보',reason);
    log(s,[t.id],t.name+'이 '+({food:'식량 공급처',wood:'수리용 목재',stone:'수리용 석재'})[need]+'를 찾고 있다. '+reason,'need',{story:t.needStory});t.lastNeed=s.day;
  }
}
function propose(s,a,b,plotId){
  if(s.negotiations.some(n=>n.from===a.id&&!n.done))return null;
  const plot=s.plots.find(p=>p.id===plotId&&p.owner===b.id);if(!plot||!findPath(s,a.id,b.id,true)||a.id===b.id)return null;
  const goal=(a.ledger.importedFood||0)>30&&a.fertility<.8?'security':'survival';if(goal==='security')a.needStory=story(s,[a.id,b.id],a.name+'의 식량 자립', '누적 곡물 수입 '+Math.floor(a.ledger.importedFood)+' · 지역 수확 여건 '+Math.round(foodFactor(s,a)*100)+'% · 외부 공급 의존을 줄이려 한다.');
  const n={goal,id:s.nextNegotiation++,from:a.id,to:b.id,plot:plot.id,kind:'land',stage:'request',started:s.day,deadline:s.day+7,story:a.needStory,done:false,reason:goal==='security'?'외부 곡물 수입에 의존해 자체 경작지를 확보하려 한다':'곡물 공급 부족으로 경작권을 요청한다'};
  s.negotiations.push(n);log(s,[a.id,b.id],a.name+'이 '+b.name+'에 '+plot.name+' 경작권을 요청했다. '+n.reason+'.','diplomacy',{story:n.story});return n;
}
function negotiate(s,n){
  const a=town(s,n.from),b=town(s,n.to),plot=s.plots.find(p=>p.id===n.plot);if(!a||!b||!plot||plot.owner!==b.id){n.done=true;return;}
  if(sameFaction(s,a,b)){n.done=true;log(s,[a.id,b.id],'두 마을이 같은 세력의 보호 관계로 연결되어 경작권 압박을 중단했다.','agreement',{story:n.story});return;}
  if(n.stage==='request'){
    if(b.pop<=0){n.done=true;if(a.wood>=6){a.wood-=6;plot.owner=a.id;log(s,[a.id,b.id],a.name+'이 주민 없는 '+plot.name+'을 목재 6을 들여 정비하고 경작권을 확보했다.','territory',{story:n.story});}return;}
    if(n.goal!=='security'&&reserveDays(a)>30){n.done=true;log(s,[a.id,b.id],a.name+'이 공급 사정이 나아져 경작권 요청을 거뒀다.','diplomacy',{story:n.story});return;}
    // Transfer rights only when the owner has a genuine surplus and receives payment.
    if(reserveDays(b)>46&&a.stone>=12&&relation(s,a.id,b.id).trust>=0){a.stone-=12;b.stone+=12;plot.owner=a.id;n.done=true;log(s,[a.id,b.id],b.name+'이 석재 12를 받고 '+plot.name+' 경작권을 '+a.name+'에 넘겼다. 전쟁 없이 합의했다.','agreement',{story:n.story});return;}
    n.stage='refused';n.deadline=s.day+9;relation(s,a.id,b.id).refusals++;relation(s,a.id,b.id).trust-=8;
    log(s,[a.id,b.id],b.name+'이 경작권 요청을 거절했다. 자기 식량 비축 '+Math.floor(reserveDays(b))+'일분을 지키려 한다.','diplomacy',{story:n.story});return;
  }
  if(n.stage==='refused'){
    if(n.goal!=='security'&&reserveDays(a)>28){n.done=true;log(s,[a.id,b.id],a.name+'이 대체 공급을 확보해 압박을 멈췄다.','agreement',{story:n.story});return;}
    n.stage='ultimatum';n.deadline=s.day+8;relation(s,a.id,b.id).trust-=15;
    log(s,[a.id,b.id],a.name+'이 '+plot.name+' 경작권을 요구하며 최후통첩을 보냈다. 식량 '+Math.floor(reserveDays(a))+'일분, 군사 부담을 감수할지 판단 중이다.','threat',{story:n.story});return;
  }
  if(n.stage==='ultimatum'){
    n.done=true;if(n.goal!=='security'&&reserveDays(a)>28){log(s,[a.id,b.id],a.name+'이 수입 회복으로 최후통첩을 철회했다.','agreement',{story:n.story});return;}
    if(!prepareWar(s,a,b,plot,n.story)){relation(s,a.id,b.id).peaceUntil=s.day+40;log(s,[a.id,b.id],a.name+'이 원정의 식량·인명 부담을 감당할 수 없어 철수했다.','agreement',{story:n.story});}
  }
}
function prepareWar(s,a,b,plot,storyId){
  if(!a||!b||!plot)return false;
  const rel=relation(s,a.id,b.id),soldiers=Math.min(Math.floor(a.pop*.24),Math.floor(a.pop-a.deployed-5)),defenders=Math.max(2,Math.floor((b.pop-b.deployed)*.14));
  const kit=soldiers*(4.5+(s.regional?Math.hypot(plot.x-a.x,plot.z-a.z)*.09:0)),benefit=plot.capacity*.20*90;
  const expected=soldiers*a.defense/(defenders*b.defense*(b.liege!==null?1.5:1));
  if(sameFaction(s,a,b)||a.pop<18||a.deployed||b.deployed||rel.peaceUntil>s.day||soldiers<4||a.food<kit+foodNeed(a)*5||benefit<kit*1.5||expected<(1.5-a.ambition*.45)||a.ambition<.4)return false;
  a.food-=kit;a.deployed+=soldiers;b.deployed+=defenders;const protector=b.liege!==null?town(s,b.liege):null,allied=protector&&protector.pop>12&&!protector.deployed&&reserveDays(protector)>12?Math.floor(protector.pop*.1):0;if(allied){protector.deployed+=allied;log(s,[protector.id,b.id],protector.name+'이 보호 약속에 따라 '+allied+'명을 '+b.name+'의 방어에 보냈다. 해당 인원은 생산에서 빠진다.','war',{story:storyId});}
  const army={ally:allied?protector.id:null,allies:allied,initialAllies:allied,id:s.nextArmy++,from:a.id,to:b.id,plot:plot.id,story:storyId,troops:soldiers,initial:soldiers,defenders,initialDefenders:defenders,supplies:kit,loot:0,phase:'march',progress:0,x:a.x,z:a.z,started:s.day,battleDay:0,ended:false};
  s.armies.push(army);s.wars++;
  log(s,[a.id,b.id],a.name+'이 '+plot.name+' 확보를 위해 '+soldiers+'명을 출정시켰다. 협상 거절 뒤 곡물 '+Math.round(kit)+'을 보급에 투입했고 그만큼 생산 인력이 줄었다.','war',{story:storyId});
  for(const t of s.towns)if(t.id!==a.id&&t.id!==b.id&&findPath(s,t.id,b.id))relation(s,a.id,t.id).trust-=6;
  return true;
}
function casualties(s,t,number,cause,storyId){const q=Math.max(0,Math.min(number,t.pop,t.deployed));if(!q)return 0;t.pop-=q;t.deployed-=q;t.ledger.died+=q;t.ledger.battleDeaths+=q;log(s,[t.id],t.name+' · '+cause+'로 '+q+'명을 잃었다.','battle',{story:storyId});return q;}
function endWar(s,a,result){
  const source=town(s,a.from),target=town(s,a.to),plot=s.plots.find(p=>p.id===a.plot);
  if(a.ally!==null&&a.ally!==undefined){const p=town(s,a.ally);p.deployed=Math.max(0,p.deployed-a.allies);a.allies=0;}target.deployed=Math.max(0,target.deployed-a.defenders);a.defenders=0;a.phase='return';a.progress=0;a.ended=true;relation(s,source.id,target.id).peaceUntil=s.day+100;
  if(result==='capture'&&plot){plot.owner=source.id;plot.changed=s.day;source.ledger.captures=(source.ledger.captures||0)+1;const loot=Math.min(target.food,a.troops*1.8);target.food-=loot;a.loot=loot;target.condition=Math.max(.15,target.condition-.12);
    log(s,[source.id,target.id],source.name+'이 '+plot.name+'을 장악했다. 경작 능력이 이전되고 '+target.name+'의 식량 생산 기반이 줄었다.','territory',{story:a.story});
  }else if(result==='pact')log(s,[source.id,target.id],'두 마을이 같은 세력의 보호 관계로 연결되어 원정을 중단했다. 생존 병력과 보급은 귀로를 마친 뒤 돌아온다.','agreement',{story:a.story});
  else log(s,[source.id,target.id],source.name+'의 원정이 철수했다. 경작권은 바뀌지 않았고 보급과 인명만 소모되었다.','peace',{story:a.story});
  const episode=s.stories.find(x=>x.id===a.story);if(episode){episode.status='resolved';episode.outcome=result==='capture'?'경작권 이전과 전쟁 피해':result==='pact'?'보호 관계에 따른 원정 중단':'원정 실패와 소모';}
}
function armyStep(s,a,dt){
  const from=town(s,a.from),to=s.plots.find(p=>p.id===a.plot)||town(s,a.to),distance=Math.hypot(to.x-from.x,to.z-from.z)||1;
  if(a.phase==='march'||a.phase==='return'){
    a.progress+=dt*4/distance;const k=Math.min(1,a.progress),returning=a.phase==='return';a.x=(returning?to.x:from.x)+((returning?from.x:to.x)-(returning?to.x:from.x))*k;a.z=(returning?to.z:from.z)+((returning?from.z:to.z)-(returning?to.z:from.z))*k;
    if(a.progress>=1){if(returning){from.deployed=Math.max(0,from.deployed-a.troops);from.food+=a.supplies+a.loot;a.supplies=0;a.loot=0;a.done=true;log(s,[from.id],from.name+'의 생존 병력 '+a.troops+'명이 돌아왔다. 남은 보급과 전리품이 창고에 도착했다.','peace',{story:a.story});}else{a.phase='battle';a.battleDay=s.day;}}
  }
}
function armiesDaily(s){for(const a of s.armies){const from=town(s,a.from),to=town(s,a.to);if(!a.ended&&sameFaction(s,from,to)){endWar(s,a,'pact');continue;}a.supplies=Math.max(0,a.supplies-a.troops*.18);
  if(a.supplies<=0&&s.day%5===0&&a.troops>0){const q=casualties(s,from,1,'원정 보급 부족',a.story);a.troops-=q;}
  if(a.phase==='battle'&&s.day-a.battleDay>=3){a.battleDay=s.day;const attack=a.troops*from.defense,defend=a.defenders*to.defense+(a.allies||0)*(a.ally!==null?town(s,a.ally).defense:1);
    const la=Math.min(a.troops,Math.max(1,Math.floor(random(s)*2+defend/(attack+1)))),ld=Math.min(a.defenders+(a.allies||0),Math.max(1,Math.floor(random(s)*2+attack/(defend+1))));
    a.troops-=casualties(s,from,la,'경작지 전투',a.story);const allyLoss=Math.min(a.allies||0,Math.max(Math.floor(ld*.5),ld-a.defenders)),localLoss=Math.min(a.defenders,ld-allyLoss);a.defenders-=casualties(s,to,localLoss,'경작지 방어',a.story);if(allyLoss)a.allies-=casualties(s,town(s,a.ally),allyLoss,'동맹 마을 방어',a.story);
    if(a.troops<=a.initial*.4)endWar(s,a,'retreat');else if(a.defenders+(a.allies||0)<=(a.initialDefenders+(a.initialAllies||0))*.3||to.pop<5)endWar(s,a,'capture');
  }
  if(a.troops<=0){if(!a.ended)endWar(s,a,'retreat');a.done=true;s.lostWarFood=(s.lostWarFood||0)+a.supplies+a.loot;a.supplies=0;a.loot=0;log(s,[a.from],'원정대가 돌아오지 못해 남은 보급도 회수하지 못했다.','battle',{story:a.story});}
}}
function startExploration(s,id=0){const t=town(s,id);if(t.explored||t.expedition)return '이미 접촉했거나 정찰 중입니다';if(t.food<5||t.pop<5)return '정찰대를 보낼 식량 5와 인력이 필요합니다';const neighbor=s.towns.filter(n=>n.id!==id&&n.pop>0).sort((a,b)=>Math.hypot(a.x-t.x,a.z-t.z)-Math.hypot(b.x-t.x,b.z-t.z))[0];t.food-=5;t.expedition={phase:'scout',target:neighbor.id,x:neighbor.x,z:neighbor.z,until:s.day+10};log(s,[id],'버들나루가 식량 5와 한 작업조를 정찰에 보냈다. 그동안 이 작업조는 생산하지 않는다.','explore');return '';}
function explorationDaily(s){for(const t of s.towns){const ex=t.expedition;if(!ex)continue;if(t.pop<3){t.expedition=null;continue;}if(s.day<ex.until)continue;const target=town(s,ex.target);
  if(ex.phase==='scout'){t.explored=true;t.contact=target.id;ex.phase='waiting';log(s,[t.id,target.id],t.name+'의 정찰대가 '+target.name+'을 발견했다. 아직 길과 교역은 연결되지 않았다.','discovery');}
  if(ex.phase==='waiting'&&t.wood>=12&&t.stone>=3){t.wood-=12;t.stone-=3;ex.phase='road';ex.until=s.day+9;log(s,[t.id,target.id],t.name+'이 목재 12·석재 3을 들여 '+target.name+'까지 숲길을 개척한다.','route');}
  else if(ex.phase==='road'){s.routes.push({id:'outpost-'+t.id,a:t.id,b:target.id,open:true,blockedUntil:0,created:s.day});t.expedition=null;relation(s,t.id,target.id).trust=20;log(s,[t.id,target.id],t.name+'과 '+target.name+' 사이에 첫 교역로가 열렸다. 이제 물자가 실제로 오갈 수 있다.','route');s.offers.push({from:target.id,to:t.id,deadline:s.day+15,status:'pending'});}
}}
function acceptProtection(s,offer){const a=town(s,offer.from),b=town(s,offer.to);if(!a||!b||offer.status!=='pending'||!findPath(s,a.id,b.id))return '유효한 보호 제안이 없습니다';b.liege=a.id;b.faction=a.faction??null;b.taxRate=.12;offer.status='accepted';relation(s,a.id,b.id).trust+=35;log(s,[a.id,b.id],b.name+'이 '+a.name+'의 보호 아래 들어갔다. 수확의 12%를 조공으로 보내는 대신 강한 상대의 보호를 얻었다.','pact');if(a.food>foodNeed(a)*24+12)newCaravan(s,a,b,'food',12,null,0,{tribute:true});return '';}
function migrate(s,t){if(t.pop-t.deployed<7||t.refugeeCooldown>s.day)return;const options=s.towns.filter(b=>b.id!==t.id&&b.immigration&&b.pop>0&&reserveDays(b)>24&&b.pop+2<=capacity(b)&&findPath(s,t.id,b.id)&&!s.armies.some(a=>!a.ended&&(a.to===b.id||a.from===b.id))).sort((a,b)=>reserveDays(b)-reserveDays(a));const dest=options[0];if(!dest)return;const q=2,pack=Math.min(t.food,3);t.pop-=q;t.ledger.left+=q;t.food-=pack;t.refugeeCooldown=s.day+20;s.caravans.push({id:s.nextCaravan++,from:t.id,to:dest.id,kind:'food',q:pack,originalQ:pack,other:null,payment:0,phase:'out',progress:0,x:t.x,z:t.z,path:findPath(s,t.id,dest.id),people:q,story:t.needStory});log(s,[t.id,dest.id],t.name+'의 '+q+'명이 생계 악화로 '+dest.name+'을 향해 떠났다. 도착하기 전에는 어느 마을 인구에도 더하지 않는다.','migration',{story:t.needStory});}
function weatherDaily(s){if(s.forecast&&s.day>=s.forecast.start){s.weather=s.forecast;s.forecast=null;const w=s.weather;w.story=story(s,w.ids,w.name+'과 계곡의 공급',w.ids.map(id=>town(s,id).name).join('·')+'의 수확 계수 '+w.factor,'climate');log(s,w.ids,w.name+'이 시작됐다. 해당 지역의 실제 식량 생산이 '+Math.round(w.factor*100)+'%로 바뀐다.','weather',{story:w.story});}if(s.weather&&s.day>=s.weather.until){log(s,s.weather.ids,s.weather.name+'이 끝났다. 줄어든 재고와 이주·전쟁 피해는 남는다.','weather',{story:s.weather.story});s.weather=null;}
  if(!s.forecast&&!s.weather&&s.day>=s.nextWeather){const r=random(s),candidates=s.towns.filter(t=>t.id!==0&&t.pop>0);if(!candidates.length)return;const origin=candidates[Math.floor(random(s)*candidates.length)],id=origin.id,ids=[id];if(random(s)>.5){const near=candidates.filter(t=>t.id!==id).sort((a,b)=>Math.hypot(a.x-origin.x,a.z-origin.z)-Math.hypot(b.x-origin.x,b.z-origin.z))[0];if(near)ids.push(near.id);}const drought=r<.5;const duration=20+Math.floor(random(s)*16);s.forecast={ids,name:drought?'가뭄':'좋은 비',factor:drought?.48:1.28,start:s.day+6,until:s.day+6+duration};s.nextWeather=s.day+60+Math.floor(random(s)*35);log(s,ids,ids.map(id=>town(s,id).name).join('·')+'에 '+s.forecast.name+' 징후. 6일 뒤 수확 여건이 달라질 전망이다.','forecast');}}
function diplomacyDaily(s){
  if(s.regional)for(const member of s.towns){if(member.liege===null||!member.pop||reserveDays(member)>14||s.caravans.some(c=>c.to===member.id&&c.kind==='food'&&c.phase==='out'))continue;const ruler=town(s,member.liege),q=Math.min(ruler.food-foodNeed(ruler)*28,foodNeed(member)*18);if(q>3&&newCaravan(s,ruler,member,'food',q,null,0,{tribute:true,story:member.needStory}))log(s,[ruler.id,member.id],ruler.name+'이 보호 중인 '+member.name+'에 비축 곡물 '+Math.round(q)+'을 지원 수레로 보냈다. 도착하기 전까지 상대의 재고는 늘지 않는다.','pact',{story:member.needStory});}
  for(const n of s.negotiations)if(!n.done&&s.day>=n.deadline)negotiate(s,n);
  for(const t of s.towns){claimNeed(s,t);if(t.pop<1)continue;
    if(t.id===0&&t.auto&&!t.explored&&!t.expedition&&reserveDays(t)>16&&s.day-t.founded>12)startExploration(s,t.id);
    if(((t.need==='food'&&reserveDays(t)<22&&!s.caravans.some(c=>c.to===t.id&&c.kind==='food'&&c.phase==='out'))||((t.ledger.importedFood||0)>30&&t.fertility<.8&&foodFactor(s,t)<1&&reserveDays(t)<42))&&t.ambition>=.4&&s.day-t.lastDiplomacy>60&&!t.deployed){
      const plots=s.plots.filter(p=>p.kind==='food'&&p.owner!==t.id&&!sameFaction(s,t,town(s,p.owner))&&town(s,p.owner).liege!==t.id&&findPath(s,t.id,p.owner,true)&&relation(s,t.id,p.owner).peaceUntil<=s.day).sort((a,b)=>Math.hypot(a.x-t.x,a.z-t.z)-Math.hypot(b.x-t.x,b.z-t.z));
      if(plots[0]){propose(s,t,town(s,plots[0].owner),plots[0].id);t.lastDiplomacy=s.day;}
    }
    if((t.starved>=4||t.condition<.5)&&s.day%10===0)migrate(s,t);
  }
  for(const offer of s.offers)if(offer.status==='pending'&&s.day>=offer.deadline){const t=town(s,offer.to);if(t.auto&&reserveDays(t)<18)acceptProtection(s,offer);else{offer.status='declined';log(s,[offer.from,offer.to],t.name+'이 당장은 보호와 조공 제안을 받아들이지 않고 독립을 유지했다.','pact');}}
}
function daily(s){for(const t of s.towns)t.season=season(s);weatherDaily(s);armiesDaily(s);
  for(const t of s.towns){
    if(t.pop<=0){if(t.state!=='abandoned'){t.state='abandoned';log(s,[t.id],t.name+'에 남은 주민이 없다. 빈 정착지가 되었다.','ruin',{story:t.needStory});}t.condition=Math.max(.1,t.condition-.002);if(s.day%30===0){const b=t.buildings.find(b=>!b.ruined);if(b)b.ruined=true;}continue;}
    if(t.liege!==null&&town(s,t.liege).pop<=0){const former=t.liege;t.liege=null;t.faction=null;t.taxRate=0;t.taxAccrued=0;log(s,[t.id,former],t.name+'의 보호자가 사라져 조공 관계가 끝났다. 독립된 생계를 다시 꾸려야 한다.','pact');}
    if(s.regional&&t.liege!==null)t.faction=town(s,t.liege).faction??null;
    const need=foodNeed(t),eaten=Math.min(t.food,need);t.food-=eaten;t.ledger.eaten+=eaten;t.starved=eaten+1e-8<need?t.starved+1:Math.max(0,t.starved-1);t.forest=Math.min(1000,t.forest+1.2);
    const spoil=Math.min(t.food,t.food*.002+Math.max(0,t.food-storage(t))*.15);t.food-=spoil;t.ledger.spoiled+=spoil;
    let supplied=1;for(const key of ['wood','stone']){const want=maintenance(t,key),used=Math.min(t[key],want);t[key]-=used;t.ledger[key==='wood'?'upkeepWood':'upkeepStone']+=used;if(want>0)supplied=Math.min(supplied,used/want);}
    t.condition=Math.max(.1,Math.min(1,t.condition+(supplied>.98?.004:-.004*(1-supplied))));
    if(t.condition<.45&&s.day%30===0){const b=t.buildings.find(b=>b.type!=='hall'&&!b.ruined);if(b){b.ruined=true;t.ledger.ruins++;log(s,[t.id],t.name+'의 '+PLANS[b.type].name+'이 유지 자재 부족으로 폐쇄되었다.','decline',{story:t.needStory});}}
    if(t.starved>8&&s.day%7===0&&t.pop>t.deployed){t.pop--;t.ledger.died++;t.happiness=Math.max(5,t.happiness-7);log(s,[t.id],t.name+' · 식량 부족으로 주민 한 명을 잃었다.','crisis',{story:t.needStory});}
    if(s.day%45===0&&reserveDays(t)>30&&t.condition>.75&&t.pop<capacity(t)&&t.pop>3){t.pop++;t.ledger.born++;log(s,[t.id],t.name+'에 아이가 태어났다.','life');}
    if(t.pop===0&&t.state!=='abandoned'){t.state='abandoned';log(s,[t.id],t.name+'에 남은 주민이 없다. 생산이 멈추고 빈 정착지가 되었다.','ruin',{story:t.needStory});}
    else if(t.pop>0){const previous=t.history.findLast(h=>h.day<=s.day-30);t.state=t.starved>3||t.condition<.6||(previous&&previous.pop>t.pop+1)?'declining':reserveDays(t)>30&&t.condition>.8?'growing':'stable';}
    let housed=Math.max(0,Math.ceil((t.pop-6)/6));for(const b of t.buildings)if(b.type==='home'&&!b.ruined){b.vacant=housed<=0;housed--;}
    if(s.day%5===0)decide(s,t);
    t.trend.push({day:s.day,food:t.food});t.trend=t.trend.slice(-15);
    if(t.liege!==null&&s.day%10===0&&t.food>foodNeed(t)*8){const due=Math.min(t.food-foodNeed(t)*8,t.taxAccrued);if(due>0&&newCaravan(s,t,town(s,t.liege),'food',due,null,0,{tribute:true})){t.ledger.tax+=due;t.taxAccrued-=due;log(s,[t.id,t.liege],t.name+'이 보호의 대가로 곡물 '+Math.round(due)+'을 조공 수레에 실었다.','tax');}}
  }
  s.negotiations=s.negotiations.filter(n=>!n.done||n.id>s.nextNegotiation-100);if(s.day%5===0){trade(s);diplomacyDaily(s);}explorationDaily(s);if(s.day%10===0)recordSample(s);
}
function step(s,dt){if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.25);s.time+=dt;
  for(const t of s.towns)for(const w of t.workers)worker(s,t,w,dt);
  for(const c of s.caravans)caravanStep(s,c,dt);s.caravans=s.caravans.filter(c=>!c.done);
  for(const a of s.armies)armyStep(s,a,dt);s.armies=s.armies.filter(a=>!a.done);
  const day=Math.floor(s.time);if(day>s.day){s.day=day;daily(s);}
}
// A polity consists of real settlements, a protector, and physical tribute flows.
function factionOf(s,t){return s.factions?.find(f=>f.id===t.faction)||null;}
function sameFaction(s,a,b){return a?.faction!=null&&a.faction===b?.faction;}
function bounds(s){return s.bounds||{minX:-115,maxX:115,minZ:-98,maxZ:98};}
function factionSummary(s,id){const f=s.factions?.find(f=>f.id===id);if(!f)return null;const members=s.towns.filter(t=>t.faction===id&&t.pop>0),ids=new Set(members.map(t=>t.id));return {...f,members,pop:members.reduce((n,t)=>n+t.pop,0),tribute:members.reduce((n,t)=>n+t.ledger.tax,0),wars:s.armies.filter(a=>!a.ended&&(ids.has(a.from)||ids.has(a.to))),caravans:s.caravans.filter(c=>ids.has(c.from)||ids.has(c.to))};}
function regionalize(s,legacy=false){
  if(s.regional)return s;
  s.regional=1;s.bounds={minX:-340,maxX:330,minZ:-270,maxZ:280};
  s.factions=[
    {id:'river',name:'해오름 상단연맹',color:'#478d9e',seat:1,identity:'강변 교역 도시와 곡창이 맺은 연맹',x:0,z:0},
    {id:'iron',name:'흑철 변경백령',color:'#ac685e',seat:6,identity:'북서 산지의 채석과 성채를 기반으로 한 영지',x:-210,z:-155},
    {id:'pine',name:'청송 삼림동맹',color:'#729253',seat:11,identity:'북동 숲의 목재와 경작지로 이어진 마을들',x:195,z:-155},
    {id:'wheat',name:'금빛 평원공국',color:'#ba984d',seat:16,identity:'남서 평원의 곡창과 장인 마을을 거느린 공국',x:-210,z:155},
    {id:'tide',name:'남해 자유도시',color:'#8a7da6',seat:21,identity:'남동 해안으로 향하는 교역로의 도시 연합',x:195,z:155}
  ];
  const names=[['흑철성','잿물나루','칼바람 보루','호밀벌','서리숲'],['청송도','이끼나루','솔바람 보루','연둣들','깊은가지'],['금빛궁','밀물장','황토성','넓은보리','느티울'],['보랏빛 항도','남해문','해풍성','소금들','비취숲']];
  const patterns=[[-12,-37,66,'capital'],[58,12,54,'port'],[-58,-8,48,'castle'],[-18,53,36,'farm'],[-66,49,30,'forest']];
  let added=0;
  for(let region=0;region<5;region++){
    const f=s.factions[region];
    if(region)for(let j=0;j<5;j++){const [x,z,pop,style]=patterns[j],n=makeTown(f.seat+j,names[region-1][j],f.x+x,f.z+z,pop,style);initialize(n);n.founded=0;decide(s,n);s.towns.push(n);added+=pop;}
    for(let j=0;j<5;j++){const n=town(s,f.seat+j);n.faction=f.id;if(!legacy||region){n.liege=j===0?null:f.seat;n.taxRate=j===0?0:.08;}if(!legacy&&n.style==='castle')n.reserve=40;if(region===1)n.ambition=Math.min(.95,n.ambition+.12);}
    if(region){for(const [a,b]of [[0,1],[1,3],[3,2],[2,4],[4,0]])s.routes.push({id:'region-'+region+'-'+a,a:f.seat+a,b:f.seat+b,open:true,blockedUntil:0,created:0});
      for(const [j,dx,dz,capacity]of [[3,-11,-19,24],[0,14,25,18],[1,-15,14,16]]){const owner=town(s,f.seat+j);s.plots.push({id:'region-'+region+'-field-'+j,name:owner.name+' 경작지',kind:'food',owner:owner.id,x:owner.x+dx,z:owner.z+dz,capacity});}}
  }
  for(const[a,b]of [[3,7],[5,19],[2,15],[4,23],[7,15],[19,23],[10,17],[15,22]])s.routes.push({id:'highroad-'+a+'-'+b,a,b,open:true,blockedUntil:0,created:0});
  if(legacy){s.initialPopulation+=added;const own=town(s,0);if(own)own.faction=own.liege!==null?town(s,own.liege).faction:null;recordSample(s);log(s,s.factions.map(f=>f.seat),'주변 네 지역의 지도와 세력 관계를 관찰하기 시작했다. 새로 관찰한 마을의 이전 사건 기록은 없다.','discovery');}
  return s;
}
function world(seed=7341){return fresh(seed,true);}

function fresh(seed=7341,regional=false){
  const s={version:2,seed,rng:seed,time:0,day:0,started:false,foundingDay:0,nextCaravan:1,nextEvent:1,nextStory:1,nextArmy:1,nextNegotiation:1,caravans:[],events:[],stories:[],armies:[],negotiations:[],offers:[],relations:{},weather:null,forecast:null,nextWeather:20,wars:0,routes:[{a:1,b:2},{a:2,b:4},{a:4,b:3},{a:3,b:5},{a:5,b:1}].map((r,i)=>({...r,id:'r'+i,open:true,blockedUntil:0,created:0})),plots:[{id:'south-grain',name:'남쪽 곡창',kind:'food',owner:4,x:-29,z:34,capacity:24},{id:'river-fields',name:'강변 경작지',kind:'food',owner:1,x:2,z:-12,capacity:18},{id:'harbor-fields',name:'항구 배후 농지',kind:'food',owner:2,x:43,z:26,capacity:16}],towns:[makeTown(1,'오크헤이븐',-12,-37,66,'capital'),makeTown(2,'해오름 항구',58,12,54,'port'),makeTown(3,'돌마루 성채',-58,-8,48,'castle'),makeTown(4,'황금들녘',-18,53,36,'farm'),makeTown(5,'녹음숲',-66,49,30,'forest')]};
  for(const t of s.towns){initialize(t);decide(s,t);}if(regional)regionalize(s);for(let i=0;i<901;i++)step(s,.2);
  const child=makeTown(0,'버들나루',12,17,12,'outpost');initialize(child);child.buildings=[{type:'hall',x:0,z:0,day:s.day}];child.food=22;child.wood=18;child.stone=6;child.coins=0;child.parent=null;child.founded=s.day;child.forest=300;child.explored=false;child.reserve=24;child.ledger.arrived=12;
  s.towns.unshift(child);s.plots.push({id:'outpost-clearing',name:'버들나루 개간지',kind:'food',owner:0,x:16,z:22,capacity:10});s.started=true;s.foundingDay=s.day;s.initialPopulation=regional?1182:246;recordSample(s);log(s,[0],'낯선 정착민 열두 사람이 계곡 외곽에 버들나루를 세웠다. 식량 약 9일분, 외부 교역로와 보호자는 없다.','founding');decide(s,child);return s;
}

function policy(s,key,value){const t=s.towns[0];if(key==='policy'&&!['balanced','food','growth','trade'].includes(value))return '알 수 없는 방침입니다';if(key==='reserve'&&![14,24,40].includes(Number(value)))return '선택할 수 없는 비축 목표입니다';if(!['policy','reserve','tradeOpen','immigration','auto'].includes(key))return '알 수 없는 설정입니다';t[key]=key==='reserve'?Number(value):value;decide(s,t);log(s,[0],t.name+' · '+({policy:'마을 우선순위',reserve:'식량 비축 목표',tradeOpen:'교역 방침',immigration:'정착민 수용',auto:'외교 자동 판단'})[key]+'를 바꿨다.','policy');return '';}
function request(s,type){if(!PLANS[type])return '알 수 없는 건물입니다';const t=s.towns[0];t.request=type;decide(s,t);log(s,[0],t.name+' · 다음 건설을 '+PLANS[type].name+'으로 정했다.','policy');return '';}
function validate(s){return !!s&&s.version===2&&Number.isFinite(s.time)&&Number.isInteger(s.day)&&s.towns?.length>=6&&s.towns.length<=32&&s.towns[0]?.id===0&&Array.isArray(s.caravans)&&Array.isArray(s.events)&&Array.isArray(s.routes)&&Array.isArray(s.stories)&&Array.isArray(s.armies)&&s.towns.every(t=>['food','wood','stone','pop'].every(k=>Number.isFinite(t[k])&&t[k]>=0)&&Array.isArray(t.workers)&&t.workers.length===6&&Array.isArray(t.buildings));}
function stocks(s,key){return s.towns.reduce((n,t)=>n+t[key],0)+s.towns.reduce((n,t)=>n+t.workers.reduce((q,w)=>q+(w.cargo?.kind===key?w.cargo.q:0),0)+(t.project?(t.project.material[key]||0):0),0)+s.caravans.reduce((q,c)=>q+(c.kind===key?c.q:0)+(c.other===key?c.payment:0),0)+(key==='food'?s.armies.reduce((n,a)=>n+a.supplies+a.loot,0):0);}
const api={world,regionalize,factionOf,sameFaction,factionSummary,bounds,KEY,PLANS,JOBS,fresh,step,policy,request,validate,count,capacity,reserveDays,workSite,stocks,newCaravan,caravanStep,findPath,foodFactor,maintenance,foodNeed,storage,diagnose,propose,negotiate,prepareWar,startExploration,acceptProtection,story,log,projectCost,population,recordSample};
if(typeof module!=='undefined')module.exports=api;else root.Valley=api;
})(typeof window==='undefined'?globalThis:window);
