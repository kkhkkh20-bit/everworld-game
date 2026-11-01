/* The same supply, construction and trade rules run for every settlement. */
(function (root) {
'use strict';
const Paths=typeof module!=='undefined'?require('./valley-paths.js'):root.ValleyPaths;
const Livelihood=typeof module!=='undefined'?require('./valley-livelihood.js'):root.ValleyLivelihood;
const Commerce=typeof module!=='undefined'?require('./valley-commerce.js'):root.ValleyCommerce;
const Water=typeof module!=='undefined'?require('./valley-water.js'):root.ValleyWater;
const Travel=typeof module!=='undefined'?require('./valley-travel.js'):root.ValleyTravel;
const travel=Travel.createTravelCache(Paths),roadCourse=travel.course,travelCourse=travel.line;
function enableRoads(s){
  Paths.enable(s);
  for(const c of s.caravans){
    if(c.roadVersion===1){const first=c.path?.[0],next=c.path?.[1];if(first&&typeof first==='object'&&!first.rejoin&&!Paths.course(s,c.path))first.rejoin=Paths.rejoin(s,first,typeof next==='object'?next:Paths.depot(town(s,next)));continue;}
    const old=c.path||[c.from,c.to],points=old.map(id=>typeof id==='object'?id:town(s,id)),lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.z-points[i].z));
    let d=(c.progress||0)*lengths.reduce((a,b)=>a+b,0),i=0;while(i<lengths.length-1&&d>lengths[i])d-=lengths[i++];
    const position={x:c.x,z:c.z},next=old[i+1],destination=typeof next==='object'?next:Paths.depot(town(s,next));
    if(!Paths.between(s,position,destination))position.rejoin=Paths.rejoin(s,position,destination);
    c.path=[position,...old.slice(i+1)];c.progress=0;c.passed=0;c.roadVersion=1;
  }
  return s;
}
const WATERSHED_KEY='everworld_watershed_v1';
const KEY = 'everworld_continent_v1',LEGACY_KEY='everworld_valley_v2';
const PLANS = {
  boat:{name:'통나무배·계류장',wood:8,stone:0,work:4},
  well: { name:'물긷는 자리·저장',wood:4,stone:2,work:3 },
  home: { name: '주택', wood: 16, stone: 5, work: 6 },
  farm: { name: '공동 농장', wood: 12, stone: 2, work: 5 },
  workshop: { name: '공동 작업장', wood: 26, stone: 10, work: 8, minTech:1 },
  market: { name: '교역 시장', wood: 24, stone: 8, work: 7, minTech:1 },
  mill: { name: '풍차', wood: 32, stone: 16, work: 10, minTech:2 }
};
const JOBS = { food: '식량 생산', wood: '벌목', stone: '채석', build: '운반·건설' };
const TECH = [
  {name:'개척기',material:'지푸라기·나무 기둥',icon:'⛺',description:'천막과 초가로 비바람을 피합니다.'},
  {name:'목조 건축',material:'통나무·판자',icon:'🪵',description:'나무를 다듬어 튼튼한 집을 짓습니다.'},
  {name:'석조 건축',material:'돌벽·기와',icon:'🧱',description:'돌벽과 기와 지붕을 올릴 수 있습니다.'},
  {name:'도시 건축',material:'다듬은 돌·장식 지붕',icon:'🏛',description:'여러 층의 주택과 큰 공공 건물을 짓습니다.'}
];
function ensureArchitecture(t,initialLevel) {
  if(!t.architecture){const level=initialLevel??(count(t,'mill')&&count(t,'market')?3:count(t,'workshop')?2:count(t,'home')?1:0);t.architecture={level,experience:0,learned:null};}
  t.nextBuildingId=Math.max(1,t.nextBuildingId||1);
  const used=new Set(t.buildings.filter(b=>b.id).map(b=>b.id));
  for(const b of t.buildings){if(!b.id){do{b.id=t.id+':b'+t.nextBuildingId++;}while(used.has(b.id));used.add(b.id);}if(!Number.isInteger(b.tier))b.tier=t.architecture.level;}
}
function enableArchitecture(s){for(const t of s.towns)ensureArchitecture(t);return s;}
function architectureStatus(t){
  const level=t.architecture?.level??0,experience=t.architecture?.experience||0,next=level<3?TECH[level+1]:null;
  const target=[24,100,220][level]||220;
  const reason=level===0&&!count(t,'home')?'첫 주택을 완성하며 목조 기술을 익혀요.':level===1&&!count(t,'workshop')?'작업장이 있어야 돌 다듬는 법을 익혀요.':level===2&&(!count(t,'mill')||!count(t,'market'))?'방앗간과 시장을 갖춰야 도시 건축을 익혀요.':next?'건설·작업장 운영·이웃과의 교역으로 익히는 중이에요.':'모든 건축 기술을 익혔어요.';
  return {...TECH[level],level,experience,target,next,progress:Math.min(1,experience/target),reason};
}
function architectureDaily(s,t){
  ensureArchitecture(t);
  const a=t.architecture;if(a.level===3)return;
  if(count(t,'workshop')&&t.condition>.6&&t.starved===0)a.experience+=.5;
  const required=[24,100,220][a.level],ready=a.level===0?count(t,'home')>0:a.level===1?count(t,'workshop')>0:count(t,'mill')>0&&count(t,'market')>0;
  if(ready&&a.experience>=required){a.level++;a.learned=s.day;log(s,[t.id],t.name+'이 '+TECH[a.level].name+'을 익혔다. 새 건물과 여유가 생긴 뒤의 개축에 적용한다.','technology',{level:a.level});}
}
function exchangeKnowledge(s,a,b){
  for(const [learner,teacher]of [[a,b],[b,a]]){
    if(!learner.architecture||!teacher.architecture||learner.architecture.level>=teacher.architecture.level)continue;
    const sources=learner.architecture.contacts||(learner.architecture.contacts={}),last=sources[teacher.id];
    if(last!=null&&s.day-last<20)continue;
    sources[teacher.id]=s.day;learner.architecture.experience+=6;
    log(s,[learner.id,teacher.id],learner.name+'의 교역대가 '+teacher.name+'에서 건축 기법을 배워 왔다. 왕복 교역으로 건축 경험 6이 쌓였다.','technology',{teacher:teacher.id,experience:6});
  }
}
function buildingInfo(s,townId,buildingId){
  const t=town(s,townId),b=t?.buildings.find(b=>b.id===buildingId);if(!b)return null;
  const names={boat:'배와 계류장',well:'취수·저장 시설',hall:'마을 중심',home:'주택',farm:'공동 농장',workshop:'공동 작업장',market:'교역 시장',mill:'방앗간'};
  const roles={boat:'주민들이 배를 대고 어로를 준비하는 곳이에요. 배 한 척에는 한 작업조가 탑니다.',well:'주변 강물을 길어 오고 담아 두는 시설이에요. 강물은 끓여야 마실 물이 됩니다.',hall:'마을의 물건을 모으고 함께 지내는 곳이에요.',home:'주민이 잠자리를 나누어 쓰는 집이에요.',farm:'함께 먹을 곡물을 기르는 곳이에요.',workshop:'나무와 돌을 더 잘 다듬도록 돕는 곳이에요.',market:'다른 마을과 오가는 거래를 살펴보는 곳이에요.',mill:'먹거리 생산을 돕고 더 많이 보관하는 곳이에요.'};
  const homes=t.buildings.filter(x=>x.type==='home'&&!x.ruined),homeIndex=homes.indexOf(b),beds=(b.type==='hall'||b.type==='home')&&!b.ruined&&t.pop>0?6:0;
  const occupants=b.ruined?0:b.type==='hall'?Math.min(6,t.pop):b.type==='home'?Math.max(0,Math.min(6,t.pop-6-homeIndex*6)):0;
  const workers=t.workers.filter(w=>{if(b.ruined)return false;if(b.type==='hall')return !!w.cargo&&!w.cargo.site;if(b.type==='boat'){const crews=t.workers.filter(w=>w.transport==='boat'),docks=t.buildings.filter(b=>b.type==='boat'&&!b.ruined);return crews[docks.indexOf(b)]===w;}if(b.type==='farm'){const farms=t.buildings.filter(x=>x.type==='farm'&&!x.ruined);return w.job==='food'&&(!w.foodTask||w.foodTask.method==='farm')&&(!w.cargo?.source||['grain','wild'].includes(w.cargo.source))&&farms[0]?.id===b.id;}if(b.type==='workshop')return w.job==='wood'||w.job==='stone';return false;});
  return {town:t,building:b,name:names[b.type],role:roles[b.type],tech:{...TECH[b.tier??0],material:b.type==='farm'?'경작지·공동 수확터':TECH[b.tier??0].material},level:b.tier??0,beds,occupants,workers,status:b.ruined?'폐쇄 · 수리 필요':b.vacant?'빈집':t.pop<=0?'남은 주민 없음':'사용 중',shared:b.type==='workshop',caravans:s.caravans.filter(c=>(c.from===t.id||c.to===t.id)&&!c.people&&!c.tribute&&!c.aid)};
}
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
  if(type==='boat'&&t.livelihood?.fishing)return {x:(t.livelihood.fishing.landing||t.livelihood.fishing.bank).x-t.x,z:(t.livelihood.fishing.landing||t.livelihood.fishing.bank).z-t.z};
  if(type==='well')return {x:(t.water?.source.x??t.x)-t.x,z:(t.water?.source.z??t.z-12)-t.z};
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
  if(job==='food'){const farms=t.buildings.filter(b=>b.type==='farm'&&!b.ruined),b=farms[0];return b?{x:t.x+b.x-2,z:t.z+b.z+1}:{x:t.x-12,z:t.z+9};}
  if(job==='wood')return {x:t.x+14,z:t.z-8};
  if(job==='stone')return {x:t.x+11,z:t.z+12};
  return {x:t.x,z:t.z};
}
function follow(w,journey,dt){journey.distance=(journey.distance||0)+dt*7;const course=travelCourse(journey.points),p=Paths.position(course,journey.distance);w.x=p.x;w.z=p.z;return journey.distance>=course.total;}
function move(w,p,dt) {
  const dx=p.x-w.x,dz=p.z-w.z,d=Math.hypot(dx,dz),n=Math.min(d,dt*7);
  if(d<.15){w.x=p.x;w.z=p.z;return true;}
  w.x+=dx/d*n;w.z+=dz/d*n;return n>=d;
}
function plan(s,t,type) {
  if(!PLANS[type]||t.project||t.buildings.length>=24||(t.architecture?.level??0)<(PLANS[type].minTech||0))return false;
  t.project={type,tier:t.architecture?.level??0,...slot(t,type),material:{wood:0,stone:0},reserved:{wood:0,stone:0},work:0};
  log(s,[t.id],t.name+' · '+PLANS[type].name+' 공사를 계획했다.','build');return true;
}
function decide(s,t) {
  if(t.pop<=0)return;
  const days=reserveDays(t),critical=days<10,workers=days<t.reserve||t.policy==='food'?3:2;
  const jobs=Array(critical?4:workers).fill('food');
  if(t.project&&(!critical||['farm','well','boat'].includes(t.project.type)))jobs.push('build');
  if(t.fertility<.9)jobs.push(t.woodYield>t.stoneYield?'wood':'stone');
  while(jobs.length<6){const woodNeed=t.wood/(maintenance(t,'wood')+1),stoneNeed=t.stone/(maintenance(t,'stone')+.4);jobs.push(woodNeed<stoneNeed?'wood':'stone');if(jobs.length===5&&t.wood>6&&t.stone<8)jobs[4]='stone';}
  if(t.policy==='trade'&&!critical){jobs[4]=t.wood<6&&t.stone<3?'stone':'wood';if(!t.project)jobs[5]='wood';}
  if(t.policy==='growth'&&!critical&&days>22&&t.project)jobs[3]='build';
  t.workers.forEach((w,i)=>{if(w.cargo||w.foodTask||w.buildGather){w.nextJob=jobs[i];}else if(w.job!==jobs[i]){w.job=jobs[i];w.work=0;w.nextJob=null;}});
  if(!t.project&&t.pop>2){
    const ruined=t.buildings.findIndex(b=>b.ruined);
    if(ruined>=0&&t.wood>8&&t.stone>3){const b=t.buildings[ruined];t.project={type:b.type,x:b.x,z:b.z,material:{wood:0,stone:0},reserved:{wood:0,stone:0},work:0,repair:ruined};return;}
    let next=t.request;if(next&&(t.architecture?.level??0)<(PLANS[next]?.minTech||0))next=null;
    if(!next&&t.water&&!Water.protectedAccess(t)&&(t.water.policy==='secure'||Water.status(s,t).supply<Water.status(s,t).demand)&&t.water.policy!=='ration')next='well';
    if(!next){if(count(t,'farm')<Math.min(3,Math.ceil(t.land/35))&&days<35)next='farm';else if(t.pop>capacity(t)*.85&&days>(s.village&&t.id===0?17:24))next='home';else if(!count(t,'market')&&hasConnection(s,t.id)&&days>18)next='market';else if(!count(t,'workshop')&&days>24)next='workshop';else if(!count(t,'mill')&&days>32)next='mill';}
    if(next&&(t.architecture?.level??0)<(PLANS[next].minTech||0))next=null;
    if(next&&!(s.village&&t.id===0&&(t.expedition||(s.village.plan?.kind==='trade'&&s.village.plan.lastShipment<0))&&!['farm','well','boat'].includes(next))&&(t.request===next&&['well','boat'].includes(next)||t.wood>=PLANS[next].wood*.6&&t.stone>=PLANS[next].stone*.5)){if(plan(s,t,next)&&t.request===next)t.request=null;}
    if(!next&&!t.project&&days>32&&t.pop<=capacity(t)){
      const b=t.buildings.find(b=>!b.ruined&&b.type!=='farm'&&(b.tier??0)<(t.architecture?.level??0));
      if(b){const upgrade={type:b.type,tier:b.tier+1,upgrade:b.id,x:b.x,z:b.z,material:{wood:0,stone:0},reserved:{wood:0,stone:0},work:0},cost=projectCost(upgrade);if(t.wood>cost.wood+24&&t.stone>cost.stone+12){t.project=upgrade;log(s,[t.id],t.name+'이 '+(b.type==='hall'?'마을 중심':PLANS[b.type].name)+'을 '+TECH[upgrade.tier].name+'으로 고쳐 짓기 시작했다.','build');}}
    }
  }
}
function worker(s,t,w,dt) {
  if(t.pop<=0){w.phase='정착지 비어 있음';return;}if(w.journey){w.phase='숲길을 따라 마을로 돌아오는 중';if(follow(w,w.journey,dt))delete w.journey;return;}if(t.expedition&&t.expedition.phase!=='waiting'&&w.id===5){const ex=t.expedition;w.phase=ex.phase==='scout'?'이웃을 찾아 정찰 중':'숲길을 개척하는 중';if(!ex.journey){ex.waypoints ||= Paths.between(s,Paths.depot(t),Paths.depot(town(s,ex.target)));ex.journey={points:Paths.between(s,{x:w.x,z:w.z},Paths.depot(town(s,ex.target)))||ex.waypoints,distance:0};}follow(w,ex.journey,dt);return;}
  const crew=Math.max(0,t.pop-t.deployed)*.5/6*(.65+t.condition*.35)*Math.max(.75,1-t.starved*.012)*Water.workFactor(t);
  const depot={x:t.x+(w.id%2)*.6,z:t.z+4.4};
  if(Livelihood.worker(s,t,w,dt,{move,crew,workSite,count,foodFactor}))return;
  if(w.cargo){
    const c=w.cargo,p=c.site&&t.project?{x:t.x+t.project.x,z:t.z+t.project.z+3.4}:depot;
    w.phase=c.site?'공사장에 '+(c.kind==='wood'?'목재':'석재')+' 운반':'창고로 '+(c.source?Livelihood.names[c.source]:{food:'먹거리',wood:'목재',stone:'석재'}[c.kind])+' 운반';
    if(move(w,p,dt)){
      if(c.site&&t.project&&t.project.type===c.site){t.project.material[c.kind]+=c.q;t.project.reserved[c.kind]-=c.q;}
      else {t[c.kind]+=c.q;if(!c.site){t.ledger[c.kind]+=c.q;w.delivered+=c.q;Livelihood.deposit(s,t,c,log);}}
      w.cargo=null;w.work=0;if(w.nextJob){w.job=w.nextJob;w.nextJob=null;}
    }return;
  }
  if(w.buildGather){if(w.job==='build'&&t.project){gather(s,t,w,dt,crew,w.buildGather);w.phase='공사 자재 확보 · '+w.phase;if(w.cargo)w.buildGather=null;return;}w.buildGather=null;}
  if(w.job==='build'){
    const p=t.project;if(!p){w.phase='다음 공사 대기';return;}
    const spec=projectCost(p),needed=['wood','stone'].find(k=>p.material[k]+p.reserved[k]<spec[k]-.001);
    if(needed){
      if(!move(w,depot,dt)){w.phase='창고에서 자재 가져오기';return;}
      if(t[needed]<1){if(t.id===0&&t.water&&['well','boat'].includes(p.type)){w.buildGather=needed;gather(s,t,w,dt,crew,needed);if(w.cargo)w.buildGather=null;w.phase='공사 자재 확보 · '+w.phase;}else w.phase=(needed==='wood'?'목재':'석재')+' 공급 기다림';return;}
      const q=Math.min(4*crew,spec[needed]-p.material[needed]-p.reserved[needed],t[needed]);
      t[needed]-=q;p.reserved[needed]+=q;w.cargo={kind:needed,q,site:p.type};return;
    }
    if(p.material.wood<spec.wood-.001||p.material.stone<spec.stone-.001){w.phase='동료의 운반 기다림';return;}
    if(!move(w,{x:t.x+p.x,z:t.z+p.z+3.4},dt)){w.phase='공사장으로 이동';return;}
    w.phase=spec.name+' 짓는 중';p.work+=dt*Math.sqrt(crew);
    if(p.work>=spec.work){
      if(p.repair!==undefined){t.buildings[p.repair].ruined=false;t.condition=Math.min(1,t.condition+.12);}else if(p.upgrade){const b=t.buildings.find(b=>b.id===p.upgrade);if(b){b.tier=p.tier;b.upgraded=s.day;}}else t.buildings.push({type:p.type,tier:p.tier??t.architecture?.level??0,x:p.x,z:p.z,day:Math.floor(s.time)});t.ledger.built++;ensureArchitecture(t);t.architecture.experience+=p.upgrade?8:16;
      log(s,[t.id],t.name+' · '+spec.name+' 완성. '+(p.upgrade?'실제 자재와 공사로 건축 재료를 바꿨다.':p.repair!==undefined?'시설을 수리해 다시 쓸 수 있다.':'실제 자재와 공동 노동으로 마을이 넓어졌다.'),'build',{buildingId:p.upgrade||(p.repair!==undefined?t.buildings[p.repair].id:t.buildings.at(-1).id),tier:p.tier,renovation:!!p.upgrade});
      t.project=null;t.happiness=Math.min(95,t.happiness+2);
    }return;
  }
  gather(s,t,w,dt,crew,w.job);
}
function gather(s,t,w,dt,crew,job){
  const dest=workSite(t,job);
  if(!move(w,{x:dest.x+(w.id%2)*1.2,z:dest.z},dt)){w.phase=JOBS[job]+' 장소로 이동';return;}
  if(job==='wood'&&t.forest<=0){w.phase='숲 회복 기다림';return;}
  w.phase=({food:count(t,'farm')?'밭에서 수확 중':'강가에서 열매 채집 중',wood:'숲에서 벌목 중',stone:'채석장에서 일하는 중'})[job];
  w.work+=dt;
  if(w.work>=1.4){
    let q=crew*(job==='food'?(count(t,'farm')?3.8:2.8):1.8);
    q*=job==='food'?foodFactor(s,t):job==='wood'?t.woodYield:t.stoneYield;
    q*=job==='food'?1+count(t,'farm')*.08+count(t,'mill')*.15:1+count(t,'workshop')*.15;
    if(job==='wood'){q=Math.min(q,t.forest);t.forest-=q;}
    t.output[job]+=q;if(job==='food')t.taxAccrued+=q*t.taxRate;w.cargo={kind:job,q};w.work=0;
  }
}
function town(s,id){return s.towns.find(t=>t.id===id);}
function projectCost(p){const a=PLANS[p.type]||{name:'마을 중심',wood:16,stone:5,work:6};if(p.upgrade)return {...a,name:TECH[p.tier].name+' 개축',wood:8+p.tier*4,stone:p.tier<2?2:8+p.tier*3,work:5+p.tier*2};const spec=a;return p.repair===undefined?spec:{...spec,wood:spec.wood*.5,stone:spec.stone*.5,work:spec.work*.6};}
function season(s){return Math.floor(s.day/90)%4;}
function foodNeed(t){return Math.max(0,t.pop-t.deployed)*.20;}
function foodFactor(s,t){
  const land=t.land+s.plots.filter(p=>p.owner===t.id&&p.kind==='food').reduce((n,p)=>n+p.capacity,0);
  const bonus=s.plots.filter(p=>p.owner===t.id&&p.kind==='food').length*.14;
  const weather=s.weather&&s.weather.until>s.day&&s.weather.ids.includes(t.id)?s.weather.factor:1;
  return (t.fertility+bonus)*Math.min(1,land/Math.max(1,t.pop))*[1.05,1.3,1.12,.55][season(s)]*weather;
}
function maintenance(t,k){const n=t.buildings.filter(b=>!b.ruined&&b.type!=='well').length;return k==='wood'?n*.045+(t.pop*.014*(t.season===3?1.8:1)):n*.018;}

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
  const id=s.nextStory++;s.stories.unshift({id,ids,title,reason,kind,start:s.day,updated:s.day,status:'developing',steps:[]});if(s.stories.length>64){const expendable=s.stories.findLastIndex(x=>!x.important&&x.kind!=='village'&&x.id!==id);s.stories.splice(expendable>=0?expendable:s.stories.length-1,1);}return id;
}
function recordSample(s){for(const t of s.towns){t.history.push({day:s.day,pop:t.pop,food:t.food,condition:t.condition,buildings:t.buildings.filter(b=>!b.ruined).length,liege:t.liege});t.history=t.history.slice(-40);}}
function diagnose(s,t){
  const old=t.trend[0],duration=old?Math.max(1,s.day-old.day):1;
  const trend=old?(t.food-old.food)/duration:0;
  return {foodDays:reserveDays(t),trend,condition:t.condition,foodFactor:foodFactor(s,t),need:t.need,war:s.armies.some(a=>a.from===t.id||a.to===t.id),connected:hasConnection(s,t.id)};
}
function routeDistance(s,a,b){const path=findPath(s,a,b);return path?roadCourse(s,path)?.total??Infinity:Infinity;}
function price(t,k){const reserve=k==='food'?reserveDays(t):t[k]/Math.max(.2,maintenance(t,k));return ({food:1,wood:1.7,stone:2.3})[k]*Math.max(.7,Math.min(3,24/Math.max(4,reserve)));}
function surplus(t,k){return Math.max(0,t[k]-(k==='food'?foodNeed(t)*24:k==='wood'?maintenance(t,k)*14+5:maintenance(t,k)*16+3));}
function newCaravan(s,a,b,kind,q,other,payment,meta={}){
  const path=findPath(s,a.id,b.id);if(a.pop<=0||b.pop<=0||!path||q<=0||payment<0||a[kind]<q||(other&&b[other]<payment)||atWar(s,a.id,b.id)||!roadCourse(s,path))return false;
  a[kind]-=q;if(other)b[other]-=payment;
  s.caravans.push({id:s.nextCaravan++,from:a.id,to:b.id,kind,q,originalQ:q,other,payment,originalPayment:payment,phase:'out',progress:0,...Paths.depot(a),path,roadVersion:1,vehicle:Commerce.vehicle(a),people:0,...meta});return true;
}
function trade(s){
  for(const buyer of s.towns.filter(t=>t.pop>0&&t.tradeOpen)){

    if(buyer.id===0&&s.village?.plan?.kind==='trade')continue;
    const needs=['food','wood','stone'].filter(k=>!s.caravans.some(c=>c.to===buyer.id&&c.phase==='out'&&c.kind===k&&!c.tribute&&!c.people)).filter(k=>k==='food'?reserveDays(buyer)<26:buyer[k]<maintenance(buyer,k)*18+4);
    for(const kind of needs){
      const sellers=s.towns.filter(t=>t.id!==buyer.id&&t.pop>0&&t.tradeOpen&&!(t.id===0&&s.village?.plan?.kind==='trade')&&surplus(t,kind)>3&&findPath(s,t.id,buyer.id)&&!atWar(s,t.id,buyer.id)).sort((a,b)=>s.regional?routeDistance(s,a.id,buyer.id)-routeDistance(s,b.id,buyer.id):surplus(b,kind)-surplus(a,kind));
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
  const c=roadCourse(s,path);if(!c)return {segment:0,x:typeof path[0]==='object'?path[0].x:town(s,path[0]).x,z:typeof path[0]==='object'?path[0].z:town(s,path[0]).z,total:Infinity};
  const distance=Math.min(1,progress)*c.total,p=Paths.position(c,distance);let segment=0;while(segment<c.ends.length-1&&distance>c.ends[segment])segment++;return {segment,x:p.x,z:p.z,total:c.total||1};
}
function caravanStep(s,c,dt){
  if(!c.path)c.path=[c.from,c.to];const blocked=c.path.slice(1).some((id,i)=>{if(typeof id==='object'||typeof c.path[i]==='object')return false;const r=s.routes.find(r=>(r.a===id&&r.b===c.path[i])||(r.b===id&&r.a===c.path[i]));return !r||!r.open||r.blockedUntil>s.day||atWar(s,id,c.path[i]);});
  if(blocked&&!c.people){const end=c.phase==='out'?c.to:c.from,safe=c.path[Math.min(c.passed||0,c.path.length-1)],alternative=typeof safe==='number'?findPath(s,safe,end):null;if(alternative&&alternative.length>1){c.path=[{x:c.x,z:c.z},...alternative];c.progress=0;c.passed=0;c.wait=0;log(s,[c.from,c.to],'교역 수레가 통행 위험을 피해 다른 길로 돌아간다. 운송은 더 오래 걸린다.','route',{story:c.story});return;}c.wait=(c.wait||0)+dt;if(c.wait>10&&!c.warned){c.warned=true;log(s,[c.from,c.to],'통행이 끊겨 교역 수레가 길에서 기다린다. 재고는 아직 도착하지 않았다.','route',{story:c.story});}return;}
  c.wait=0;const p=pathPosition(s,c.path,c.progress);c.progress+=dt*5/p.total;const pos=pathPosition(s,c.path,c.progress);for(let leg=(c.passed||0);leg<pos.segment;leg++)Commerce.traffic(s,c,leg);c.heading=Math.atan2(pos.x-c.x,pos.z-c.z);c.x=pos.x;c.z=pos.z;if(pos.segment>(c.passed||0)){for(let i=(c.passed||0)+1;i<=pos.segment;i++){const port=town(s,c.path[i]);if(port?.style==='port'&&port.pop>0){const key=c.phase==='out'?'q':'payment',kind=c.phase==='out'?c.kind:c.other;if(kind&&c[key]>0){const toll=c[key]*.06;c[key]-=toll;port[kind]+=toll;port.ledger.tolls=(port.ledger.tolls||0)+toll;}}}c.passed=pos.segment;}
  if(c.progress<1)return;Commerce.traffic(s,c,c.path.length-2);const a=town(s,c.from),b=town(s,c.to);
  if(c.phase==='out'){
    if(c.q>0){b[c.kind]+=c.q;if(c.aid)b.ledger.aidReceived=(b.ledger.aidReceived||0)+c.q;if(c.kind==='food'&&!c.tribute)b.ledger.importedFood=(b.ledger.importedFood||0)+c.q;}c.q=0;
    if(c.people){b.pop+=c.people;b.ledger.arrived+=c.people;log(s,[a.id,b.id],a.name+'에서 떠난 '+c.people+'명이 '+b.name+'에 도착했다.','migration',{story:c.story});c.people=0;c.done=true;return;}
    if(c.tribute||!c.other){c.done=true;return;}
    c.phase='return';c.progress=0;c.passed=0;c.path=findPath(s,c.to,c.from)||c.path.slice().reverse();
  }else{a[c.other]+=c.payment;c.payment=0;c.done=true;a.ledger.trades++;b.ledger.trades++;relation(s,a.id,b.id).trust+=3;
    exchangeKnowledge(s,a,b);
    log(s,[a.id,b.id],a.name+' ↔ '+b.name+' · 거래 물자가 왕복 도착했다. '+b.name+'의 '+({food:'식량',wood:'목재',stone:'석재'})[c.kind]+' 공급이 보충되었다.','trade',{story:c.story,stage:'arrival'});
    if(c.story){const episode=s.stories.find(x=>x.id===c.story);if(episode&&!episode.important&&episode.status!=='resolved'&&reserveDays(b)>22){episode.status='resolved';episode.outcome='교역으로 부족한 물자를 보충했다.';}}
  }
}
function initialize(t){
  const spec={capital:[1.05,.85,.6,86,.48,1.15],port:[.78,.75,.45,52,.32,.9],castle:[.62,.7,3.2,57,.86,1.55],farm:[1.65,.42,.23,110,.22,.85],forest:[.95,2.1,.3,48,.34,.9],outpost:[1.08,.9,.55,28,.25,.8]}[t.style];
  Object.assign(t,{fertility:spec[0],woodYield:spec[1],stoneYield:spec[2],land:spec[3],ambition:spec[4],defense:spec[5],condition:1,season:0,deployed:0,liege:null,taxRate:0,taxAccrued:0,auto:true,output:{food:0,wood:0,stone:0},trend:[],history:[],need:null,needStory:null,lastNeed:-100,lastDiplomacy:-100,explored:t.id!==0,expedition:null,refugeeCooldown:0});
  t.food=t.pop*8;t.wood=45;t.stone=24;t.reserve=26;t.initialPop=t.pop;
  t.ledger.battleDeaths=0;t.ledger.upkeepWood=0;t.ledger.upkeepStone=0;t.ledger.spoiled=0;t.ledger.tax=0;t.ledger.ruins=0;
  ensureArchitecture(t,({capital:3,castle:3,port:2,farm:1,forest:1,outpost:0})[t.style]);
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
    if(b.id===0&&!b.auto&&b.pop>0){n.awaiting=true;return;}
    if(b.pop<=0){n.done=true;if(a.wood>=6){a.wood-=6;plot.owner=a.id;log(s,[a.id,b.id],a.name+'이 주민 없는 '+plot.name+'을 목재 6을 들여 정비하고 경작권을 확보했다.','territory',{story:n.story});}return;}
    if(n.goal!=='security'&&reserveDays(a)>30){n.done=true;log(s,[a.id,b.id],a.name+'이 공급 사정이 나아져 경작권 요청을 거뒀다.','diplomacy',{story:n.story});return;}
    // Transfer rights only when the owner has a genuine surplus and receives payment.
    if(reserveDays(b)>46&&a.stone>=12&&relation(s,a.id,b.id).trust>=0){a.stone-=12;b.stone+=12;plot.owner=a.id;n.done=true;log(s,[a.id,b.id],b.name+'이 석재 12를 받고 '+plot.name+' 경작권을 '+a.name+'에 넘겼다. 전쟁 없이 합의했다.','agreement',{story:n.story});return;}
    n.stage='refused';n.deadline=s.day+9;relation(s,a.id,b.id).refusals++;relation(s,a.id,b.id).trust-=8;
    log(s,[a.id,b.id],b.name+'이 경작권 요청을 거절했다. 자기 식량 비축 '+Math.floor(reserveDays(b))+'일분을 지키려 한다.','diplomacy',{story:n.story});return;
  }
  if(n.stage==='refused'){
    const needed=Math.floor(a.pop*.24)*(4.5+(s.regional?Math.hypot(plot.x-a.x,plot.z-a.z)*.09:0))+foodNeed(a)*5;if(s.village&&b.id===0&&a.food<needed*.75){n.done=true;relation(s,a.id,b.id).peaceUntil=s.day+150;log(s,[a.id,b.id],a.name+'이 실제 원정 보급을 마련하지 못해 압박을 중단했다. 한동안 같은 경작지를 다시 요구하지 않는다.','agreement',{story:n.story});return;}
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
  if(a.ally!==null&&a.ally!==undefined){const p=town(s,a.ally);p.deployed=Math.max(0,p.deployed-a.allies);a.allies=0;}target.deployed=Math.max(0,target.deployed-a.defenders);a.defenders=0;a.phase='return';a.progress=0;a.course=Paths.between(s,{x:a.x,z:a.z},Paths.depot(source));a.ended=true;relation(s,source.id,target.id).peaceUntil=s.day+100;
  if(result==='capture'&&plot){plot.owner=source.id;plot.changed=s.day;source.ledger.captures=(source.ledger.captures||0)+1;const loot=Math.min(target.food,a.troops*1.8);target.food-=loot;a.loot=loot;target.condition=Math.max(.15,target.condition-.12);
    log(s,[source.id,target.id],source.name+'이 '+plot.name+'을 장악했다. 경작 능력이 이전되고 '+target.name+'의 식량 생산 기반이 줄었다.','territory',{story:a.story});
  }else if(result==='pact')log(s,[source.id,target.id],'두 마을이 같은 세력의 보호 관계로 연결되어 원정을 중단했다. 생존 병력과 보급은 귀로를 마친 뒤 돌아온다.','agreement',{story:a.story});
  else log(s,[source.id,target.id],source.name+'의 원정이 철수했다. 경작권은 바뀌지 않았고 보급과 인명만 소모되었다.','peace',{story:a.story});
  const episode=s.stories.find(x=>x.id===a.story);if(episode){episode.status='resolved';episode.outcome=result==='capture'?'경작권 이전과 전쟁 피해':result==='pact'?'보호 관계에 따른 원정 중단':'원정 실패와 소모';}
}
function armyStep(s,a,dt){
  const from=town(s,a.from),to=s.plots.find(p=>p.id===a.plot)||town(s,a.to);
  if(a.phase==='march'||a.phase==='return'){
    const returning=a.phase==='return';if(!a.course){a.course=Paths.between(s,{x:a.x,z:a.z},returning?Paths.depot(from):{x:to.x,z:to.z});a.progress=0;}if(!a.course)return;const course=travelCourse(a.course);a.progress+=dt*4/(course.total||1);const p=Paths.position(course,Math.min(1,a.progress)*course.total);a.x=p.x;a.z=p.z;
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
function startExploration(s,id=0,targetId=null){const t=town(s,id);if((t.explored&&targetId===null)||t.expedition)return '이미 접촉했거나 정찰 중입니다';if(t.food<5||t.pop<5)return '정찰대를 보낼 식량 5와 인력이 필요합니다';const neighbor=targetId===null?s.towns.filter(n=>n.id!==id&&n.pop>0).sort((a,b)=>Math.hypot(a.x-t.x,a.z-t.z)-Math.hypot(b.x-t.x,b.z-t.z))[0]:town(s,targetId);if(!neighbor||neighbor.id===id||neighbor.pop<=0||Math.hypot(neighbor.x-t.x,neighbor.z-t.z)>155)return '정찰할 수 있는 가까운 이웃이 아닙니다';const waypoints=Paths.between(s,Paths.depot(t),Paths.depot(neighbor));if(!waypoints)return '이웃까지 통행할 수 있는 고갯길이 없습니다';t.food-=5;t.expedition={infrastructure:Commerce.infrastructure(s,waypoints),waypoints,phase:'scout',target:neighbor.id,x:neighbor.x,z:neighbor.z,until:s.day+Math.max(10,Math.ceil(Paths.length(waypoints)/7))};log(s,[id],'버들나루가 식량 5와 한 작업조를 정찰에 보냈다. 그동안 이 작업조는 생산하지 않는다.','explore');return '';}
function explorationDaily(s){for(const t of s.towns){const ex=t.expedition;if(!ex)continue;if(t.pop<3){t.expedition=null;continue;}if(s.day<ex.until)continue;const target=town(s,ex.target);
  if(ex.phase!=='waiting'&&ex.journey&&ex.journey.distance<Paths.length(ex.journey.points))continue;
  if(ex.phase==='scout'){t.explored=true;t.contact=target.id;ex.phase='waiting';t.workers[5].journey={points:ex.waypoints.slice().reverse(),distance:0};ex.journey=null;log(s,[t.id,target.id],t.name+'의 정찰대가 '+target.name+'을 발견했다. 아직 길과 교역은 연결되지 않았다.','discovery');}
  const cost=ex.infrastructure||{wood:12,stone:3,days:9,bridges:[]};
  if(ex.phase==='waiting'&&t.wood>=cost.wood&&t.stone>=cost.stone){t.wood-=cost.wood;t.stone-=cost.stone;ex.phase='road';ex.journey=null;delete t.workers[5].journey;ex.until=s.day+cost.days;log(s,[t.id,target.id],t.name+'이 목재 '+cost.wood+'·석재 '+cost.stone+'을 들여 '+target.name+'까지 교역로와 다리 '+cost.bridges.length+'개를 만든다.','route');}
  else if(ex.phase==='road'){s.routes.push({id:'outpost-'+t.id+'-'+target.id,a:t.id,b:target.id,open:true,blockedUntil:0,created:s.day,bridges:cost.bridges,tradeTraffic:{trips:0,food:0,wood:0,stone:0},alignment:1,waypoints:ex.waypoints||Paths.between(s,Paths.depot(t),Paths.depot(target))});t.workers[5].journey={points:(ex.waypoints||[Paths.depot(t),Paths.depot(target)]).slice().reverse(),distance:0};t.expedition=null;relation(s,t.id,target.id).trust=20;log(s,[t.id,target.id],t.name+'과 '+target.name+' 사이에 첫 교역로가 열렸다. 이제 물자가 실제로 오갈 수 있다.','route');s.offers.push({from:target.id,to:t.id,deadline:s.day+15,status:'pending'});log(s,[t.id,target.id],target.name+'이 보호와 조공 조건을 제안했다. 마을에서 답변할 수 있다.','offer',{story:s.village?.story});}
}}
function acceptProtection(s,offer){const a=town(s,offer.from),b=town(s,offer.to);if(!a||!b||offer.status!=='pending'||!findPath(s,a.id,b.id))return '유효한 보호 제안이 없습니다';b.liege=a.id;b.faction=a.faction??null;b.taxRate=.12;offer.status='accepted';for(const existing of s.offers)if(existing.from===a.id&&existing.to===b.id&&existing.status==='pending')existing.status='accepted';relation(s,a.id,b.id).trust+=35;log(s,[a.id,b.id],b.name+'이 '+a.name+'의 보호 아래 들어갔다. 수확의 12%를 조공으로 보내는 대신 강한 상대의 보호를 얻었다.','pact');const support=offer.aidQ?Math.max(0,Math.min(offer.aidQ,a.food-foodNeed(a)*24)):a.food>foodNeed(a)*24+12?12:0;if(support>0)newCaravan(s,a,b,'food',support,null,0,{tribute:true,aid:true,story:s.village?.story});return '';}
function migrate(s,t){if(t.pop-t.deployed<7||t.refugeeCooldown>s.day)return;const options=s.towns.filter(b=>b.id!==t.id&&b.immigration&&b.pop>0&&reserveDays(b)>24&&b.pop+2<=capacity(b)&&findPath(s,t.id,b.id)&&!s.armies.some(a=>!a.ended&&(a.to===b.id||a.from===b.id))).sort((a,b)=>reserveDays(b)-reserveDays(a));const dest=options[0];if(!dest)return;const q=2,pack=Math.min(t.food,3);t.pop-=q;t.ledger.left+=q;t.food-=pack;t.refugeeCooldown=s.day+20;s.caravans.push({id:s.nextCaravan++,from:t.id,to:dest.id,kind:'food',q:pack,originalQ:pack,other:null,payment:0,phase:'out',progress:0,...Paths.depot(t),path:findPath(s,t.id,dest.id),roadVersion:1,people:q,story:t.needStory});log(s,[t.id,dest.id],t.name+'의 '+q+'명이 생계 악화로 '+dest.name+'을 향해 떠났다. 도착하기 전에는 어느 마을 인구에도 더하지 않는다.','migration',{story:t.needStory});}
function weatherDaily(s){if(s.forecast&&s.day>=s.forecast.start){s.weather=s.forecast;s.forecast=null;const w=s.weather;w.story=story(s,w.ids,w.name+'과 계곡의 공급',w.ids.map(id=>town(s,id).name).join('·')+'의 수확 계수 '+w.factor,'climate');log(s,w.ids,w.name+'이 시작됐다. 해당 지역의 실제 식량 생산이 '+Math.round(w.factor*100)+'%로 바뀐다.','weather',{story:w.story});}if(s.weather&&s.day>=s.weather.until){log(s,s.weather.ids,s.weather.name+'이 끝났다. 줄어든 재고와 이주·전쟁 피해는 남는다.','weather',{story:s.weather.story});s.weather=null;}
  if(!s.forecast&&!s.weather&&s.day>=s.nextWeather){const r=random(s),candidates=s.towns.filter(t=>t.id!==0&&t.pop>0);if(!candidates.length)return;const origin=candidates[Math.floor(random(s)*candidates.length)],id=origin.id,ids=[id];if(random(s)>.5){const near=candidates.filter(t=>t.id!==id).sort((a,b)=>Math.hypot(a.x-origin.x,a.z-origin.z)-Math.hypot(b.x-origin.x,b.z-origin.z))[0];if(near)ids.push(near.id);}const drought=r<.5;const duration=20+Math.floor(random(s)*16);s.forecast={ids,name:drought?'가뭄':'좋은 비',factor:drought?.48:1.28,start:s.day+6,until:s.day+6+duration};s.nextWeather=s.day+60+Math.floor(random(s)*35);log(s,ids,ids.map(id=>town(s,id).name).join('·')+'에 '+s.forecast.name+' 징후. 6일 뒤 수확 여건이 달라질 전망이다.','forecast');}}
function diplomacyDaily(s){
  if(s.regional)for(const member of s.towns){if(member.liege===null||!member.pop||reserveDays(member)>14||s.caravans.some(c=>c.to===member.id&&c.kind==='food'&&c.phase==='out'))continue;const ruler=town(s,member.liege),q=Math.min(ruler.food-foodNeed(ruler)*28,foodNeed(member)*18);if(q>3&&newCaravan(s,ruler,member,'food',q,null,0,{tribute:true,story:member.needStory}))log(s,[ruler.id,member.id],ruler.name+'이 보호 중인 '+member.name+'에 비축 곡물 '+Math.round(q)+'을 지원 수레로 보냈다. 도착하기 전까지 상대의 재고는 늘지 않는다.','pact',{story:member.needStory});}
  for(const n of s.negotiations)if(!n.done&&s.day>=n.deadline)negotiate(s,n);
  for(const t of s.towns){claimNeed(s,t);if(t.pop<1)continue;
    if(t.id===0&&t.auto&&!s.village?.plan&&!t.explored&&!t.expedition&&reserveDays(t)>16&&s.day-t.founded>12)startExploration(s,t.id);
    if(((t.need==='food'&&reserveDays(t)<22&&!s.caravans.some(c=>c.to===t.id&&c.kind==='food'&&c.phase==='out'))||((t.ledger.importedFood||0)>30&&t.fertility<.8&&foodFactor(s,t)<1&&reserveDays(t)<42))&&t.ambition>=.4&&s.day-t.lastDiplomacy>60&&!t.deployed){
      const plots=s.plots.filter(p=>p.kind==='food'&&p.owner!==t.id&&!sameFaction(s,t,town(s,p.owner))&&town(s,p.owner).liege!==t.id&&findPath(s,t.id,p.owner,true)&&relation(s,t.id,p.owner).peaceUntil<=s.day).sort((a,b)=>Math.hypot(a.x-t.x,a.z-t.z)-Math.hypot(b.x-t.x,b.z-t.z));
      if(plots[0]){propose(s,t,town(s,plots[0].owner),plots[0].id);t.lastDiplomacy=s.day;}
    }
    if((t.starved>=4||t.condition<.5)&&s.day%10===0)migrate(s,t);
  }
  for(const offer of s.offers)if(offer.status==='pending'&&offer.deadline!==null&&s.day>=offer.deadline&&town(s,offer.to).auto){const t=town(s,offer.to);if(t.auto&&reserveDays(t)<18)acceptProtection(s,offer);else{offer.status='declined';log(s,[offer.from,offer.to],t.name+'이 당장은 보호와 조공 제안을 받아들이지 않고 독립을 유지했다.','pact');}}
}
function daily(s){for(const t of s.towns)t.season=season(s);weatherDaily(s);armiesDaily(s);
  for(const t of s.towns){
    if(t.pop<=0){if(t.state!=='abandoned'){t.state='abandoned';log(s,[t.id],t.name+'에 남은 주민이 없다. 빈 정착지가 되었다.','ruin',{story:t.needStory});}t.condition=Math.max(.1,t.condition-.002);if(s.day%30===0){const b=t.buildings.find(b=>!b.ruined);if(b)b.ruined=true;}continue;}
    if(t.liege!==null&&town(s,t.liege).pop<=0){const former=t.liege;t.liege=null;t.faction=null;t.taxRate=0;t.taxAccrued=0;log(s,[t.id,former],t.name+'의 보호자가 사라져 조공 관계가 끝났다. 독립된 생계를 다시 꾸려야 한다.','pact');}
    if(s.regional&&t.liege!==null)t.faction=town(s,t.liege).faction??null;
    Water.daily(s,t,log);Livelihood.daily(s,t);
    const need=foodNeed(t),eaten=Math.min(t.food,need);t.food-=eaten;t.ledger.eaten+=eaten;t.starved=eaten+1e-8<need?t.starved+1:Math.max(0,t.starved-1);t.forest=Math.min(1000,t.forest+1.2);
    const spoil=Math.min(t.food,t.food*.002+Math.max(0,t.food-storage(t))*.15);t.food-=spoil;t.ledger.spoiled+=spoil;
    let supplied=1;for(const key of ['wood','stone']){const want=Math.max(0,maintenance(t,key)-(key==='wood'?(t.water?.last.fuel||0):0)),used=Math.min(t[key],want);t[key]-=used;t.ledger[key==='wood'?'upkeepWood':'upkeepStone']+=used;if(want>0)supplied=Math.min(supplied,used/want);}
    t.condition=Math.max(.1,Math.min(1,t.condition+(supplied>.98?.004:-.004*(1-supplied))));
    if(t.condition<.45&&s.day%30===0){const b=t.buildings.find(b=>b.type!=='hall'&&!b.ruined);if(b){b.ruined=true;t.ledger.ruins++;log(s,[t.id],t.name+'의 '+PLANS[b.type].name+'이 유지 자재 부족으로 폐쇄되었다.','decline',{story:t.needStory});}}
    if(t.starved>8&&s.day%7===0&&t.pop>t.deployed){t.pop--;t.ledger.died++;t.happiness=Math.max(5,t.happiness-7);log(s,[t.id],t.name+' · 식량 부족으로 주민 한 명을 잃었다.','crisis',{story:t.needStory});}
    if(s.day%45===0&&reserveDays(t)>30&&t.condition>.75&&t.pop<capacity(t)&&t.pop>3){t.pop++;t.ledger.born++;log(s,[t.id],t.name+'에 아이가 태어났다.','life');}
    if(t.pop===0&&t.state!=='abandoned'){t.state='abandoned';log(s,[t.id],t.name+'에 남은 주민이 없다. 생산이 멈추고 빈 정착지가 되었다.','ruin',{story:t.needStory});}
    else if(t.pop>0){const previous=t.history.findLast(h=>h.day<=s.day-30);t.state=t.starved>3||t.condition<.6||(previous&&previous.pop>t.pop+1)?'declining':reserveDays(t)>30&&t.condition>.8?'growing':'stable';}
    let housed=Math.max(0,Math.ceil((t.pop-6)/6));for(const b of t.buildings)if(b.type==='home'&&!b.ruined){b.vacant=housed<=0;housed--;}
    architectureDaily(s,t);if(s.day%5===0)decide(s,t);
    t.trend.push({day:s.day,food:t.food});t.trend=t.trend.slice(-15);
    if(t.liege!==null&&s.day%10===0&&t.food>foodNeed(t)*8){const due=Math.min(t.food-foodNeed(t)*8,t.taxAccrued);if(due>0&&newCaravan(s,t,town(s,t.liege),'food',due,null,0,{tribute:true})){t.ledger.tax+=due;t.taxAccrued-=due;log(s,[t.id,t.liege],t.name+'이 보호의 대가로 곡물 '+Math.round(due)+'을 조공 수레에 실었다.','tax');}}
  }
  s.negotiations=s.negotiations.filter(n=>!n.done||n.id>s.nextNegotiation-100);if(s.day%5===0){trade(s);diplomacyDaily(s);}explorationDaily(s);villageDaily(s);if(s.day%10===0)recordSample(s);
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
function villageSnapshot(s){const t=town(s,0);return {waterDays:t.water?Water.status(s,t).days:null,waterProtected:Water.protectedAccess(t),foodSources:t.livelihood?{...t.livelihood.delivered}:null,boats:Livelihood.boats(t),day:s.day,pop:t.pop,food:t.food,wood:t.wood,stone:t.stone,foodDays:reserveDays(t),homes:count(t,'home'),built:t.ledger.built,born:t.ledger.born,died:t.ledger.died,tax:t.ledger.tax,imports:t.ledger.importedFood||0,aid:t.ledger.aidReceived||0,liege:t.liege};}
function enableVillage(s){if(s.village)return s;const t=town(s,0),year=Math.floor(s.day/360),start=year*360+270,end=year*360+360;
  const before=villageSnapshot(s),id=story(s,[0],s.day-s.foundingDay<5?'버들나루의 첫 겨울':'버들나루의 겨울 준비','관찰 시작: '+t.pop+'명 · 식량 '+Math.floor(reserveDays(t))+'일분. 물자를 직접 마련하고 이웃과 조건을 정한다.','village');
  s.village={version:1,first:s.day-s.foundingDay<5,started:s.day,winterStart:start,winterEnd:end,story:id,before,plan:null,actions:[],milestones:Object.fromEntries(Object.entries({farm:count(t,'farm')>0,home:count(t,'home')>0,connection:hasConnection(s,0),settlement:count(t,'home')>=2}).filter(([,ready])=>ready).map(([key])=>[key,s.day])),status:s.day>=start?'winter':'preparing',result:null};
  if(s.day-s.foundingDay<1&&t.policy==='balanced'){t.policy='food';t.reserve=40;decide(s,t);}log(s,[0],'겨울 준비를 관찰하기 시작했다. 주민은 스스로 일하며 교환·보호·자급의 조건은 마을에서 선택할 수 있다.','goal',{story:id});return s;
}
function neighbors(s){const t=town(s,0);return s.towns.filter(n=>n.id!==0&&n.pop>0&&Math.hypot(n.x-t.x,n.z-t.z)<155).sort((a,b)=>Math.hypot(a.x-t.x,a.z-t.z)-Math.hypot(b.x-t.x,b.z-t.z)).slice(0,4);}
function villageQuote(s,id,kind='trade'){
  const t=town(s,0),other=town(s,Number(id));if(!other||other.id===0||other.pop<=0)return null;let path=findPath(s,0,other.id),distance=path?routeDistance(s,0,other.id):Paths.length(Paths.between(s,Paths.depot(t),Paths.depot(other))||[Paths.depot(t),Paths.depot(other)]),available=Math.max(0,other.food-foodNeed(other)*24),q=Math.floor(Math.min(available,foodNeed(t)*(kind==='protect'?30:10))),cost=Math.ceil(q*price(other,'food')/price(other,'wood'));
  const approved=s.village?.plan;if(kind==='trade'&&approved?.kind==='trade'&&approved.partner===other.id&&approved.maxWood){q=Math.min(q,approved.maxGrain||q,Math.floor(approved.maxWood*price(other,'wood')/price(other,'food')));cost=Math.ceil(q*price(other,'food')/price(other,'wood'));}
  let reason='';if(atWar(s,0,other.id))reason='교전 중이라 협상할 수 없습니다';else if(q<6)reason='상대가 내보낼 식량이 부족합니다';else if(kind==='protect'&&t.liege!==null&&t.liege!==other.id)reason='이미 다른 보호자와 계약 중입니다';else if(t.expedition&&t.expedition.target!==other.id)reason='다른 이웃으로 가는 길을 준비 중입니다';
  const proposed=path?null:t.expedition?.target===other.id?t.expedition.infrastructure:Commerce.infrastructure(s,Paths.between(s,Paths.depot(t),Paths.depot(other))||[]);
  return {bridgeCount:proposed?.bridges.length||0,id:other.id,name:other.name,kind,q,cost:kind==='protect'?0:cost,tax:kind==='protect'?.12:0,connected:!!path,eta:Math.ceil(distance/5),preparation:path?0:(t.expedition?Math.max(0,t.expedition.until-s.day)+(t.expedition.phase==='scout'?9:0):Math.max(10,Math.ceil(distance/7))+9),roadWood:path?0:proposed?.wood||12,roadStone:path?0:proposed?.stone||3,scoutFood:path||t.expedition?0:5,can:!reason,reason,canDispatch:!reason&&!!path&&(kind==='protect'||t.wood>=cost)};
}
function incoming(s){return s.caravans.filter(c=>c.to===0&&c.phase==='out'&&c.kind==='food'&&c.q>0).map(c=>{const p=pathPosition(s,c.path||[c.from,c.to],c.progress);return {id:c.id,from:c.from,q:c.q,days:Math.ceil((1-c.progress)*p.total/5),waiting:!!c.wait,aid:!!c.aid};}).sort((a,b)=>a.days-b.days);}
function projectStatus(t){if(!t.project)return {label:count(t,'home')?'다음 생활 기반 준비':'주택을 지을 비축 마련',reason:'',progress:0,missing:{wood:0,stone:0}};const p=t.project,c=projectCost(p),missing={wood:Math.max(0,Math.ceil(c.wood-p.material.wood-p.reserved.wood-t.wood)),stone:Math.max(0,Math.ceil(c.stone-p.material.stone-p.reserved.stone-t.stone))},builder=t.workers.some(w=>w.job==='build'||w.nextJob==='build');return {label:c.name,reason:missing.wood?'목재 '+missing.wood+' 부족':missing.stone?'석재 '+missing.stone+' 부족':!builder?'식량 확보 뒤 공사 재개':p.material.wood<c.wood||p.material.stone<c.stone?'자재 운반 중':'짓는 중',progress:Math.min(1,p.work/c.work),missing};}
function villageStatus(s){const t=town(s,0),d=diagnose(s,t),v=s.village;return {pop:t.pop,foodDays:reserveDays(t),trend:d.trend,homes:count(t,'home'),beds:capacity(t),stage:count(t,'market')&&count(t,'home')>=2?'교역촌':count(t,'home')>=2?'정착촌':count(t,'home')?'첫 주택':'야영지',project:projectStatus(t),incoming:incoming(s),winterDays:Math.max(0,Math.floor(s.day/360)*360+(season(s)===3?360:270)-s.day),winter:season(s)===3,starving:t.starved>0,claim:s.negotiations.find(n=>n.to===0&&!n.done&&n.stage==='request'&&!sameFaction(s,t,town(s,n.from)))||null,offer:s.offers.find(o=>o.to===0&&o.status==='pending')||null};}
function foodOrder(s,kind){enableVillage(s);Water.enable(s);Livelihood.enable(s);const t=town(s,0);if(!['balanced','hunt','fish','farm'].includes(kind))return '알 수 없는 먹거리 방침입니다';if(kind==='fish'&&!t.livelihood.fishing)return '가까운 물가를 찾지 못했습니다';const before=villageSnapshot(s);t.livelihood.policy=kind;t.livelihood.chosen=true;if(kind==='fish'&&!Livelihood.boats(t)&&t.project?.type!=='boat')t.request='boat';if(kind==='farm'&&!count(t,'farm')&&t.project?.type!=='farm')t.request='farm';decide(s,t);s.village.actions.push({kind,before,due:s.day+30,after:null});s.village.actions=s.village.actions.slice(-12);log(s,[0],t.name+' · '+({balanced:'농사·채집·사냥·어로를 상황에 맞게 나눈다.',hunt:'숲의 사냥감을 이용하되 줄어들면 다른 먹거리로 전환한다.',fish:'물가에서 낚시하고 자재를 모아 어로용 배를 준비한다.',farm:'먹거리 작업조를 농사·채집에 집중한다.'})[kind],'decision',{story:s.village?.story});return '';}
function survivalOrder(s,kind){
  enableVillage(s);Water.enable(s);const t=town(s,0);if(t.pop<=0)return '마을에 남은 주민이 없습니다';if(!['water','ration','collect','food','shelter'].includes(kind))return '알 수 없는 방침입니다';
  const before=villageSnapshot(s);
  if(kind==='water'){t.water.policy='secure';if(!Water.protectedAccess(t)&&t.project?.type!=='well'){t.request='well';const p=t.project;if(p&&!p.upgrade&&p.work===0&&Object.values(p.material).every(q=>q===0)&&Object.values(p.reserved).every(q=>q===0)){t.project=null;}}}
  if(kind==='ration')t.water.policy='ration';if(kind==='collect')t.water.policy='collect';
  if(kind==='food')return winterChoice(s,'self',null);if(kind==='shelter'){t.request='home';t.policy='growth';}
  decide(s,t);s.village.actions.push({kind,before,due:s.day+30,after:null});s.village.actions=s.village.actions.slice(-12);log(s,[0],t.name+' · '+({water:'마실 물부터 안정시키기로 했다. 주민들이 자재를 모아 취수·저장을 정비한다.',ration:'물을 아껴 마시기로 했다. 식수 소비 35% 감소, 일손 효율 12% 감소.',collect:'식수를 평소처럼 마시며 정상 소비로 돌아간다.',shelter:'집 지을 나무를 모아 잠자리 마련을 우선한다.'})[kind],'decision',{story:s.village?.story});return '';
}
function villageObjective(s){
  const t=town(s,0),v=s.village,base={foodDays:Math.floor(reserveDays(t)),beds:capacity(t),pop:t.pop,homes:count(t,'home'),connected:hasConnection(s,0)};
  if(t.pop<=0)return {...base,id:'ruined',title:'마을이 비었습니다',action:'무슨 일이 있었는지 보기',reason:'연대기에서 주민들이 떠난 이유를 확인해요.'};
  const water=Water.status(s,t);if(water&&(water.days<2||water.shortage>.1||water.supply<water.demand))return {...base,id:'water',title:'지금 할 일 · 마실 물부터 안정시키기',action:water.protected?'내가 할 일 · 식수 공급 확인·절수하기':water.queued?'취수·저장 정비 진행 보기':'내가 할 일 · 취수·저장 정비 방침 정하기',reason:water.shortage?'마실 물이 부족해 다른 일도 느려지고 있어요. 절수하거나 급수 기반을 살펴보세요.':water.protected?'식수 비축이 줄었어요. 강물의 운반량과 소비를 살펴보고 절수로 시간을 벌 수 있어요.':'지금은 주변 강물을 길어 와 끓여 마셔요. 취수·저장을 정비하면 주변 강물의 운반과 저장이 편해져요.'};
  if(!v?.result&&!t.livelihood?.chosen)return {...base,id:'winter',title:'지금 목표 · 물가에서 먹고살기',action:v?.plan?'내가 정한 방침과 결과 보기':'내가 할 일 · 먹거리 마련 방식 정하기',reason:'주민들은 집을 짓고 일해요. 우리는 자급·교역·보호 중 어떻게 먹고살지 정해요.'};
  if(base.foodDays<14)return {...base,id:'food',title:'지금 목표 · 먹거리 안정시키기',action:'식량 확보 방침 다시 정하기',reason:'먹을 것이 넉넉하지 않아요. 자급을 유지할지 이웃의 곡물을 구할지 결정해요.'};
  if(base.beds<t.pop)return {...base,id:'housing',title:'정착 목표 · 모두의 잠자리 마련',action:'나무를 집에 쓸지 교환할지 정하기',reason:'교환에 쓰는 나무와 집을 짓는 나무가 겹쳐요. 무엇을 우선할지 정해요.'};
  if(!base.connected)return {...base,id:'contact',title:'다음 목표 · 이웃으로 가는 첫길',action:'교역할지 보호받을지 정하기',reason:'우리만의 초가집을 세웠어요. 이제 길을 열어 누구와 관계를 맺을지 정할 수 있어요.'};
  if(base.homes<2)return {...base,id:'settlement',title:'다음 목표 · 작은 정착촌으로 성장',action:'먹거리·주거·교역 우선순위 정하기',reason:'잠자리와 비축을 늘릴 수 있도록 마을의 우선순위를 정해요. 건물 위치는 주민들이 정해요.'};
  return {...base,id:'politics',title:'우리 마을의 입지를 정할 때',action:'독립·교역·보호 방침 살펴보기',reason:'주변 세력의 필요와 요구를 보고 어느 관계를 유지할지 결정해요.'};
}
function winterChoice(s,kind,id,approvedWood=null){enableVillage(s);const t=town(s,0),v=s.village;if(!['trade','protect','self'].includes(kind))return '선택할 수 없는 방침입니다';if(!t.pop)return '주민이 없는 마을입니다';let quote=null;
  if(kind!=='self'){quote=villageQuote(s,id,kind);if(!quote?.can)return quote?.reason||'가까운 이웃을 선택하세요';if(kind==='trade'&&approvedWood!==null&&(!Number.isFinite(approvedWood)||approvedWood<quote.cost))return '교환 조건이 바뀌었습니다. 현재 목재 비용을 다시 확인하세요';if(!quote.connected&&!t.expedition&&t.food<5)return '정찰 식량 5가 필요합니다';}
  const before=villageSnapshot(s);if(quote&&!quote.connected&&!t.expedition){const error=startExploration(s,0,Number(id));if(error)return error;}
  if(kind!=='protect')for(const offer of s.offers)if(offer.to===0&&offer.status==='pending')offer.status='declined';
  t.policy=kind==='trade'?'trade':'food';t.reserve=40;t.tradeOpen=kind!=='self';t.auto=false;
  v.plan={kind,partner:quote?.id??null,started:s.day,status:kind==='self'?'active':quote.connected?'negotiating':'connecting',maxWood:kind==='trade'?(approvedWood??quote?.cost??0):0,maxGrain:quote?.q||0,lastShipment:-1000};v.actions.push({kind,partner:quote?.id??null,before,due:s.day+30,after:null});v.actions=v.actions.slice(-12);decide(s,t);
  log(s,quote?[0,quote.id]:[0],kind==='self'?'버들나루가 외부 물물교환을 멈추고 식량과 주거를 먼저 마련한다. 기존 보호 계약의 조공은 유지된다.':kind==='trade'?'버들나루가 '+quote.name+'과 곡물 교환을 준비한다. 도착한 물자만 창고에 들어오며 목재를 쓰면 공사가 늦어진다.':'버들나루가 '+quote.name+'에 보호와 식량 지원을 요청하기로 했다. 수확의 12% 조공 조건이며 지원 재고는 계약 때 다시 확인한다.','decision',{story:v.story});return '';
}
function dispatchExchange(s,id){const t=town(s,0),q=villageQuote(s,id,'trade');if(!q?.canDispatch)return q?.reason||(!q?.connected?'먼저 이웃과 길을 연결해야 합니다':'교환할 목재가 부족합니다');const seller=town(s,q.id);if(!newCaravan(s,seller,t,'food',q.q,'wood',q.cost,{story:s.village?.story,contract:true}))return '재고 또는 통행 사정이 달라졌습니다';log(s,[0,seller.id],'버들나루가 목재 '+q.cost+'를 맡기고 '+seller.name+'의 곡물 '+q.q+'을 받기로 했다. 예상 운송 '+q.eta+'일, 도착 전에는 비축이 늘지 않는다.','trade',{story:s.village?.story,stage:'dispatch'});return '';}
function requestProtection(s,id){const q=villageQuote(s,id,'protect');if(!q?.can||!q.connected)return q?.reason||'먼저 길을 연결해야 합니다';const offer={from:q.id,to:0,status:'pending',deadline:null,aidQ:q.q,requested:true};s.offers.push(offer);return acceptProtection(s,offer);}
function answerClaim(s,id,answer){const n=s.negotiations.find(n=>n.id===Number(id)&&n.to===0&&!n.done),t=town(s,0);if(!n||n.stage!=='request')return '답변할 경작권 요구가 없습니다';const a=town(s,n.from),plot=s.plots.find(p=>p.id===n.plot);if(!plot||plot.owner!==0)return '경작지 소유가 달라졌습니다';if(answer==='cede'){if(a.stone<12)return '상대가 보상할 석재 12를 갖고 있지 않습니다';a.stone-=12;t.stone+=12;plot.owner=a.id;n.done=true;log(s,[0,a.id],'버들나루가 석재 12를 받고 '+plot.name+' 경작권을 양도했다. 식량 생산 기반이 줄어든다.','territory',{story:n.story});}else if(answer==='reject'){n.stage='refused';n.deadline=s.day+9;n.awaiting=false;const rel=relation(s,a.id,0);rel.refusals++;rel.trust-=8;log(s,[0,a.id],'버들나루가 직접 경작권 요구를 거절했다. 상대가 다음 압박을 판단한다.','diplomacy',{story:n.story});}else return '답변을 선택하세요';return '';}
function villageDaily(s){if(!s.village)return;const v=s.village,t=town(s,0);if(!t.pop){v.status='ruined';return;}
  const p=v.plan;if(p&&p.kind!=='self'){
    const linked=!!findPath(s,0,p.partner);p.status=linked?'negotiating':t.expedition?'connecting':hasConnection(s,0)?'blocked':'connecting';
    if(linked&&p.kind==='trade'){const pending=s.caravans.some(c=>c.to===0&&c.kind==='food'&&c.phase==='out'&&!c.people);if(pending)p.status='shipping';else if(reserveDays(t)<40&&s.day-p.lastShipment>=20){const error=dispatchExchange(s,p.partner);if(!error){p.lastShipment=s.day;p.status='shipping';}else p.status=villageQuote(s,p.partner)?.q>=6?'waiting_wood':'waiting_supply';}else p.status='active';}
    if(linked&&p.kind==='protect'){if(t.liege===p.partner)p.status='active';else{const error=requestProtection(s,p.partner);p.status=error?'waiting_supply':'active';}}
  }
  for(const action of v.actions)if(!action.after&&s.day>=action.due){action.after=villageSnapshot(s);log(s,[0],'마을의 결정 뒤 30일을 관찰했다. 식량 '+Math.floor(action.before.foodDays)+'→'+Math.floor(action.after.foodDays)+'일분, 주민 '+action.before.pop+'→'+action.after.pop+'명. 같은 기간의 다른 사건도 포함한다.','comparison',{story:v.story});}
  const milestones={water:count(t,'well')>0,boat:count(t,'boat')>0,farm:count(t,'farm')>0,home:count(t,'home')>0,connection:hasConnection(s,0),settlement:count(t,'home')>=2};for(const [key,ready]of Object.entries(milestones))if(ready&&!v.milestones[key]){v.milestones[key]=s.day;log(s,[0],({water:'취수·저장 정비가 끝났다. 강물 운반과 저장이 편해졌다. 마시기 전에는 계속 끓여야 한다.',boat:'첫 어로용 배가 완성됐다. 주민들이 물 위로 나가 고기를 잡을 수 있다.',farm:'첫 농장의 수확이 시작됐다.',home:'첫 주택이 완성되어 잠자리가 늘었다.',connection:'이웃으로 이어지는 길이 열렸다.',settlement:'주택 두 채를 갖추며 야영지가 정착촌으로 자라고 있다.'})[key],'milestone',{story:v.story});}
  if(s.day>=v.winterEnd&&!v.result){v.status='spring';v.result={before:v.before,after:villageSnapshot(s)};log(s,[0],'겨울을 지나 봄을 맞았다. 주민 '+v.before.pop+'→'+t.pop+'명, 주택 '+v.before.homes+'→'+count(t,'home')+'채, 사망 '+(t.ledger.died-v.before.died)+'명.','season_result',{story:v.story});const ep=s.stories.find(x=>x.id===v.story);if(ep){ep.status='resolved';ep.outcome='겨울 뒤의 마을 · 주민 '+t.pop+'명 · 주택 '+count(t,'home')+'채';}}else if(s.day>=v.winterStart&&!v.result)v.status='winter';
}

function world(seed=7341){const s=fresh(seed,true);s.hydrologyVersion=2;enableVillage(s);Water.enable(s);Livelihood.enable(s);return s;}

function fresh(seed=7341,regional=false,frontier=regional){
  const s={version:2,seed,rng:seed,time:0,day:0,started:false,foundingDay:0,nextCaravan:1,nextEvent:1,nextStory:1,nextArmy:1,nextNegotiation:1,caravans:[],events:[],stories:[],armies:[],negotiations:[],offers:[],relations:{},weather:null,forecast:null,nextWeather:20,wars:0,routes:[{a:1,b:2},{a:2,b:4},{a:4,b:3},{a:3,b:5},{a:5,b:1}].map((r,i)=>({...r,id:'r'+i,open:true,blockedUntil:0,created:0})),plots:[{id:'south-grain',name:'남쪽 곡창',kind:'food',owner:4,x:-29,z:34,capacity:24},{id:'river-fields',name:'강변 경작지',kind:'food',owner:1,x:2,z:-12,capacity:18},{id:'harbor-fields',name:'항구 배후 농지',kind:'food',owner:2,x:43,z:26,capacity:16}],towns:[makeTown(1,'오크헤이븐',-12,-37,66,'capital'),makeTown(2,'해오름 항구',58,12,54,'port'),makeTown(3,'돌마루 성채',-58,-8,48,'castle'),makeTown(4,'황금들녘',-18,53,36,'farm'),makeTown(5,'녹음숲',-66,49,30,'forest')]};
  for(const t of s.towns){initialize(t);decide(s,t);}if(regional)regionalize(s);Paths.enable(s);for(let i=0;i<901;i++)step(s,.2);
  const child=makeTown(0,'버들나루',frontier?-293:12,frontier?-25:17,12,'outpost');initialize(child);child.buildings=[{type:'hall',x:0,z:0,day:s.day}];child.food=22;child.wood=18;child.stone=6;child.coins=0;child.parent=null;child.auto=!frontier;child.founded=s.day;child.forest=300;child.explored=false;child.reserve=24;child.ledger.arrived=12;
  if(frontier)s.campaign='continent';
  s.towns.unshift(child);enableArchitecture(s);s.plots.push({id:'outpost-clearing',name:'버들나루 개간지',kind:'food',owner:0,x:child.x+4,z:child.z+5,capacity:10});s.started=true;s.foundingDay=s.day;s.initialPopulation=regional?1182:246;recordSample(s);log(s,[0],frontier?'낯선 정착민 열두 사람이 대륙 서쪽 변두리 해안에 공동 초가집을 세웠다. 식량 약 9일분, 기존 공동체와 교역로는 아직 없다.':'낯선 정착민 열두 사람이 계곡 외곽에 버들나루를 세웠다. 식량 약 9일분, 외부 교역로와 보호자는 없다.','founding');decide(s,child);return s;
}

function policy(s,key,value){const t=s.towns[0];if(key==='policy'&&!['balanced','food','growth','trade'].includes(value))return '알 수 없는 방침입니다';if(key==='reserve'&&![14,24,40].includes(Number(value)))return '선택할 수 없는 비축 목표입니다';if(!['policy','reserve','tradeOpen','immigration','auto'].includes(key))return '알 수 없는 설정입니다';t[key]=key==='reserve'?Number(value):value;decide(s,t);log(s,[0],t.name+' · '+({policy:'마을 우선순위',reserve:'식량 비축 목표',tradeOpen:'교역 방침',immigration:'정착민 수용',auto:'외교 자동 판단'})[key]+'를 바꿨다.','policy');return '';}
function request(s,type){if(!PLANS[type])return '알 수 없는 건물입니다';const t=s.towns[0];if(type==='boat'&&!t.livelihood?.fishing)return '가까운 물가가 있어야 어로용 배를 준비할 수 있습니다';if((t.architecture?.level??0)<(PLANS[type].minTech||0))return TECH[PLANS[type].minTech].name+'을 먼저 익혀야 합니다';t.request=type;decide(s,t);log(s,[0],t.name+' · 다음 건설을 '+PLANS[type].name+'으로 정했다.','policy');return '';}
function validate(s){return !!s&&s.version===2&&Number.isFinite(s.time)&&Number.isInteger(s.day)&&s.towns?.length>=6&&s.towns.length<=32&&s.towns[0]?.id===0&&Array.isArray(s.caravans)&&Array.isArray(s.events)&&Array.isArray(s.routes)&&Array.isArray(s.stories)&&Array.isArray(s.armies)&&s.towns.every(t=>['food','wood','stone','pop'].every(k=>Number.isFinite(t[k])&&t[k]>=0)&&Array.isArray(t.workers)&&t.workers.length===6&&Array.isArray(t.buildings)&&(!t.architecture||(Number.isInteger(t.architecture.level)&&t.architecture.level>=0&&t.architecture.level<TECH.length&&Number.isFinite(t.architecture.experience)&&t.architecture.experience>=0))&&(!t.water||(Number.isFinite(t.water.stock)&&t.water.stock>=0&&t.water.ledger&&Number.isFinite(t.water.ledger.cleaned)))&&t.buildings.every(b=>b.tier===undefined||(Number.isInteger(b.tier)&&b.tier>=0&&b.tier<TECH.length)));}
function stocks(s,key){if(key==='water')return s.towns.reduce((n,t)=>n+(t.water?.stock||0),0);return s.towns.reduce((n,t)=>n+t[key],0)+s.towns.reduce((n,t)=>n+t.workers.reduce((q,w)=>q+(w.cargo?.kind===key?w.cargo.q:0),0)+(t.project?(t.project.material[key]||0):0),0)+s.caravans.reduce((q,c)=>q+(c.kind===key?c.q:0)+(c.other===key?c.payment:0),0)+(key==='food'?s.armies.reduce((n,a)=>n+a.supplies+a.loot,0):0);}
const api={tradeInfrastructure:Commerce.infrastructure,transportNames:Commerce.names,enableLivelihood:Livelihood.enable,livelihoodStatus:Livelihood.status,foodOrder,enableWater:Water.enable,waterStatus:Water.status,survivalOrder,enableRoads,villageObjective,TECH,ensureArchitecture,enableArchitecture,architectureStatus,buildingInfo,enableVillage,villageSnapshot,villageStatus,villageQuote,neighbors,winterChoice,dispatchExchange,requestProtection,answerClaim,incoming,world,regionalize,factionOf,sameFaction,factionSummary,bounds,KEY,WATERSHED_KEY,LEGACY_KEY,PLANS,JOBS,fresh,step,policy,request,validate,count,capacity,reserveDays,workSite,stocks,newCaravan,caravanStep,findPath,foodFactor,maintenance,foodNeed,storage,diagnose,propose,negotiate,prepareWar,startExploration,acceptProtection,story,log,projectCost,population,recordSample};
if(typeof module!=='undefined')module.exports=api;else root.Valley=api;
})(typeof window==='undefined'?globalThis:window);
