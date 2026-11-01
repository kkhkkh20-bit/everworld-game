/* The same supply, construction and trade rules run for every settlement. */
(function (root) {
'use strict';
const KEY = 'everworld_valley_v1';
const PLANS = {
  home: { name: '주택', wood: 16, stone: 5, work: 6 },
  farm: { name: '공동 농장', wood: 12, stone: 2, work: 5 },
  workshop: { name: '목공 작업장', wood: 26, stone: 10, work: 8 },
  market: { name: '교역 시장', wood: 24, stone: 8, work: 7 },
  mill: { name: '풍차', wood: 32, stone: 16, work: 10 }
};
const JOBS = { food: '식량 생산', wood: '벌목', stone: '채석', build: '운반·건설' };
function random(s) { s.rng = (Math.imul(s.rng,1664525)+1013904223)>>>0; return s.rng/4294967296; }
function count(t, type) { return t.buildings.filter(b=>b.type===type).length; }
function capacity(t) { return 6 + count(t,'home')*6; }
function reserveDays(t) { return t.pop ? t.food/(t.pop*.12) : 0; }
function log(s, ids, text, type='life') {
  s.events.unshift({day:Math.floor(s.time),ids,text,type}); s.events.length=Math.min(s.events.length,160);
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
  const days=reserveDays(t);
  // Maintaining food reserves takes precedence even under a growth policy.
  const foodWorkers=(days<t.reserve||t.policy==='food')?3:(t.policy==='trade'&&days>45?1:2);
  const jobs=Array(foodWorkers).fill('food');
  if(t.project){jobs.push('build');if(t.policy==='growth'&&foodWorkers<3)jobs.push('build');}
  while(jobs.length<6)jobs.push(jobs.filter(j=>j==='wood').length<2?'wood':'stone');
  if(t.project&&t.stone<2&&t.project.material.stone<PLANS[t.project.type].stone)jobs[5]='stone';
  t.workers.forEach((w,i)=>{const job=jobs[i];if(w.job!==job&&!w.cargo){w.job=job;w.work=0;w.task=null;}});
  if(!t.project){
    let next=t.request;
    if(!next){
      if(count(t,'farm')<2&&days<45)next='farm';
      else if(t.pop>=capacity(t)*.77)next='home';
      else if(!count(t,'workshop'))next='workshop';
      else if(!count(t,'mill'))next='mill';
      else if(!count(t,'market'))next='market';
      else if(s.time%40<6&&count(t,'home')<14)next='home';
    }
    if(next&&t.wood>=PLANS[next].wood*.4&&t.stone>=PLANS[next].stone*.3){plan(s,t,next);t.request=null;}
  }
}
function worker(s,t,w,dt) {
  if(t.pop<=0){w.phase='정착지 비어 있음';return;}
  const crew=t.pop<=18?Math.min(1,t.pop/6):Math.max(1,t.pop*.52/6);
  const depot={x:t.x+(w.id%2)*.6,z:t.z+4.4};
  if(w.cargo){
    const c=w.cargo,p=c.site&&t.project?{x:t.x+t.project.x,z:t.z+t.project.z+3.4}:depot;
    w.phase=c.site?'공사장에 '+(c.kind==='wood'?'목재':'석재')+' 운반':'창고로 '+({food:'곡물',wood:'목재',stone:'석재'}[c.kind])+' 운반';
    if(move(w,p,dt)){
      if(c.site&&t.project&&t.project.type===c.site){t.project.material[c.kind]+=c.q;t.project.reserved[c.kind]-=c.q;}
      else {t[c.kind]+=c.q;if(!c.site){t.ledger[c.kind]+=c.q;w.delivered+=c.q;}}
      w.cargo=null;w.work=0;
    }return;
  }
  if(w.job==='build'){
    const p=t.project;if(!p){w.phase='다음 공사 대기';return;}
    const spec=PLANS[p.type],needed=['wood','stone'].find(k=>p.material[k]+p.reserved[k]<spec[k]-.001);
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
      t.buildings.push({type:p.type,x:p.x,z:p.z,day:Math.floor(s.time)});t.ledger.built++;
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
    let q=crew*(w.job==='food'?(count(t,'farm')?5:2.5):2.5)*(w.job==='food'?1+count(t,'farm')*.15+count(t,'mill')*.18:1+count(t,'workshop')*.15);
    q*=w.job==='food'?({castle:.38,port:.48,farm:1.25,forest:.7}[t.style]||1):w.job==='stone'&&t.style==='castle'?1.4:w.job==='wood'&&t.style==='forest'?1.4:1;
    if(w.job==='wood'){q=Math.min(q,t.forest);t.forest-=q;}
    w.cargo={kind:w.job,q};w.work=0;
  }
}
function newCaravan(s,a,b,kind,q,other,payment){
  if(a[kind]<q||b[other]<payment)return false;
  a[kind]-=q;b[other]-=payment;
  s.caravans.push({id:s.nextCaravan++,from:a.id,to:b.id,kind,q,other,payment,phase:'out',progress:0,x:a.x,z:a.z});return true;
}
function trade(s){
  for(const a of s.towns.filter(t=>t.tradeOpen&&count(t,'market'))){
    if(s.caravans.some(c=>c.from===a.id)||reserveDays(a)<a.reserve+12)continue;
    const b=s.towns.filter(t=>t.id!==a.id&&t.tradeOpen&&t.pop>0&&reserveDays(t)<45&&t.wood>=8&&!s.caravans.some(c=>c.to===t.id)).sort((a,b)=>reserveDays(a)-reserveDays(b))[0];
    if(b&&a.food>25)newCaravan(s,a,b,'food',20,'wood',8);
  }
}
function caravanStep(s,c,dt){
  const a=s.towns.find(t=>t.id===c.from),b=s.towns.find(t=>t.id===c.to);
  const from=c.phase==='out'?a:b,to=c.phase==='out'?b:a;
  const hub=s.towns.find(t=>t.id===1),route=(from.id!==1&&to.id!==1)?[from,hub,to]:[from,to];
  const lengths=route.slice(1).map((p,i)=>Math.hypot(p.x-route[i].x,p.z-route[i].z)),distance=lengths.reduce((a,b)=>a+b,0);c.progress+=dt*5/distance;
  let travelled=Math.min(1,c.progress)*distance,segment=0;while(segment<lengths.length-1&&travelled>lengths[segment]){travelled-=lengths[segment];segment++;}const k=Math.min(1,travelled/lengths[segment]);c.x=route[segment].x+(route[segment+1].x-route[segment].x)*k;c.z=route[segment].z+(route[segment+1].z-route[segment].z)*k;
  if(c.progress>=1){
    if(c.phase==='out'){b[c.kind]+=c.q;c.q=0;c.phase='return';c.progress=0;}
    else {a[c.other]+=c.payment;c.payment=0;c.done=true;a.ledger.trades++;b.ledger.trades++;log(s,[a.id,b.id],a.name+' ↔ '+b.name+' · 곡물 20과 목재 8의 교역이 도착했다.','trade');}
  }
}
function daily(s){
  for(const t of s.towns){
    const need=t.pop*.12,eaten=Math.min(t.food,need);t.food-=eaten;t.ledger.eaten+=eaten;
    t.starved=eaten<need?t.starved+1:0;t.forest=Math.min(1000,t.forest+2);
    if(t.starved>10&&s.day%10===0&&t.pop>0){t.pop--;t.ledger.died++;t.happiness=Math.max(10,t.happiness-5);log(s,[t.id],t.name+' · 오랜 식량 부족으로 주민 한 명을 잃었다.','crisis');}
    if(s.day%30===0&&reserveDays(t)>22&&t.pop<capacity(t)&&t.pop>1){t.pop++;t.ledger.born++;log(s,[t.id],t.name+'에 아이가 태어났다.','life');}
    if(s.day%5===0)decide(s,t);
  }
  if(s.day%8===0)trade(s);
  if(s.started&&s.day%20===0){
    const child=s.towns[0],parent=s.towns.find(t=>t.id===child.parent);
    if(child.immigration&&parent&&parent.pop>30&&capacity(child)>=child.pop+2&&reserveDays(child)>20){
      parent.pop-=2;parent.ledger.left+=2;child.pop+=2;child.ledger.arrived+=2;
      log(s,[child.id,parent.id],parent.name+'의 두 사람이 '+child.name+'에 정착했다. 집과 비축이 마련되어 이주했다.','migration');
    }
  }
}
function step(s,dt){
  if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.25);s.time+=dt;
  for(const t of s.towns)for(const w of t.workers)worker(s,t,w,dt);
  for(const c of s.caravans)caravanStep(s,c,dt);s.caravans=s.caravans.filter(c=>!c.done);
  const day=Math.floor(s.time);if(day>s.day){s.day=day;daily(s);}
}
function fresh(seed=7341){
  const s={version:1,seed,rng:seed,time:0,day:0,started:false,foundingDay:0,nextCaravan:1,caravans:[],events:[],towns:[
    makeTown(1,'오크헤이븐',-12,-37,66,'capital'),makeTown(2,'해오름 항구',58,12,54,'port'),
    makeTown(3,'돌마루 성채',-58,-8,48,'castle'),makeTown(4,'황금들녘',-18,53,36,'farm'),makeTown(5,'녹음숲',-66,49,30,'forest')
  ]};
  for(const t of s.towns)decide(s,t);
  for(let i=0;i<901;i++)step(s,.2); // These towns actually build and work before our charter.
  const parent=s.towns[0],child=makeTown(0,'버들나루',12,17,12,'outpost');
  child.buildings=child.buildings.filter(b=>b.type==='hall'||b.type==='home');child.food=30;child.wood=24;child.stone=10;child.coins=0;child.parent=parent.id;child.founded=s.day;
  child.ledger.arrived=12;child.policy='balanced';child.reserve=24;child.forest=480;
  parent.pop-=12;parent.ledger.left+=12;parent.food-=30;parent.wood-=24;parent.stone-=10;
  s.towns.unshift(child);s.started=true;s.foundingDay=s.day;
  log(s,[0,parent.id],parent.name+'에서 주민 12명, 곡물 30·목재 24·석재 10을 나눠 버들나루를 세웠다.','founding');
  decide(s,child);return s;
}
function policy(s,key,value){const t=s.towns[0];if(key==='policy'&&!['balanced','food','growth','trade'].includes(value))return '알 수 없는 방침입니다';if(key==='reserve'&&![14,24,40].includes(Number(value)))return '선택할 수 없는 비축 목표입니다';if(!['policy','reserve','tradeOpen','immigration'].includes(key))return '알 수 없는 설정입니다';t[key]=key==='reserve'?Number(value):value;decide(s,t);log(s,[0],t.name+' · '+({policy:'마을 우선순위',reserve:'식량 비축 목표',tradeOpen:'교역 방침',immigration:'정착민 수용'})[key]+'를 바꿨다.','policy');return '';}
function request(s,type){if(!PLANS[type])return '알 수 없는 건물입니다';const t=s.towns[0];t.request=type;decide(s,t);log(s,[0],t.name+' · 다음 건설을 '+PLANS[type].name+'으로 정했다.','policy');return '';}
function validate(s){return !!s&&s.version===1&&Number.isFinite(s.time)&&Number.isInteger(s.day)&&s.towns?.length===6&&s.towns[0]?.id===0&&Array.isArray(s.caravans)&&Array.isArray(s.events)&&s.towns.every(t=>['food','wood','stone','pop'].every(k=>Number.isFinite(t[k])&&t[k]>=0)&&Array.isArray(t.workers)&&t.workers.length===6&&Array.isArray(t.buildings));}
function stocks(s,key){return s.towns.reduce((n,t)=>n+t[key],0)+s.towns.reduce((n,t)=>n+t.workers.reduce((q,w)=>q+(w.cargo?.kind===key?w.cargo.q:0),0)+(t.project?(t.project.material[key]||0):0),0)+s.caravans.reduce((q,c)=>q+(c.kind===key?c.q:0)+(c.other===key?c.payment:0),0);}
const api={KEY,PLANS,JOBS,fresh,step,policy,request,validate,count,capacity,reserveDays,workSite,stocks,newCaravan};
if(typeof module!=='undefined')module.exports=api;else root.Valley=api;
})(typeof window==='undefined'?globalThis:window);
