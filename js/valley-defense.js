/* Garrison members remain part of the town population. Training and equipment are paid. */
(function(root){
'use strict';
function target(t){const m=t.military;if(!m)return 0;return m.policy==='survival'?0:Math.max(m.policy==='watch'?2:3,Math.floor(t.pop*(m.policy==='watch'?.1:.2)));}
function enable(s,newWorld=false){
 if(s.defenseSystem)return s;s.defenseSystem={version:1,started:s.day};
 for(const t of s.towns){
  const region=Math.floor(Math.max(0,t.id-1)/5),bias={capital:65,port:35,castle:30,farm:0,forest:10,outpost:0}[t.style]||0;
  t.civilization={started:s.day,initialYears:t.id===0?0:newWorld?Math.round((115+region*35+bias+(s.seed+t.id*7)%23)/5)*5:null,origin:newWorld?'세계의 초기 설정':'기존 저장 · 이전 연혁 미상'};
  t.military={policy:t.id===0?'survival':t.style==='castle'||t.style==='capital'?'guard':'watch',trained:Math.min(t.pop,t.deployed||0),kits:Math.min(t.pop,t.deployed||0),experience:0,nextTraining:s.day+12,ledger:{trainingFood:0,equipmentWood:0,equipmentStone:0,upkeepFood:0,upkeepWood:0,upkeepStone:0,recruited:0,demobilized:0,lost:0}};
  if(newWorld&&t.id!==0){const m=t.military,n=Math.max(0,Math.min(target(t)-m.trained,t.pop-m.trained,Math.floor(t.wood),Math.floor(t.stone*2),Math.floor(Math.max(0,t.food-t.pop*2)/2)));t.food-=n*2;t.wood-=n;t.stone-=n*.5;m.trained+=n;m.kits+=n;m.ledger.trainingFood=n*2;m.ledger.equipmentWood=n;m.ledger.equipmentStone=n*.5;m.experience=.2+(t.architecture?.level||0)*.12;}
 }
 return s;
}
function ready(t){return Math.max(0,(t.military?.trained||0)-(t.deployed||0));}
function labor(t){return ready(t)*.35;}
function power(t){if(!t)return 1;return t.military?(.85+(t.architecture?.level||0)*.12+Math.min(.25,t.military.experience*.2)):1;}
function casualty(t,q){if(!t.military)return;const m=t.military,lost=Math.min(m.trained,q);m.trained-=lost;m.kits=Math.max(m.trained,m.kits-lost);m.ledger.lost+=lost;}
function daily(s,t,log){
 const m=t.military;if(!m)return;m.trained=Math.max(0,Math.min(m.trained,Math.max(t.deployed||0,t.pop-(t.transporting||0))));const g=ready(t),need={food:g*.04,wood:g*.006,stone:g*.003};let supplied=true;
 for(const key of ['food','wood','stone']){const q=Math.min(t[key],need[key]);t[key]-=q;m.ledger['upkeep'+key[0].toUpperCase()+key.slice(1)]+=q;if(q+.000001<need[key])supplied=false;}
 m.shortageDays=supplied?0:(m.shortageDays||0)+1;if(m.shortageDays>=12&&m.trained>(t.deployed||0)){m.trained--;m.kits=Math.max(m.trained,m.kits-1);m.ledger.demobilized++;m.experience=Math.max(0,m.experience-.05);m.shortageDays=0;}
 if(supplied&&g)m.experience=Math.min(1,m.experience+.001);
 const desired=Math.min(Math.max(0,t.pop-(t.deployed||0)),target(t));
 if(s.day>=m.nextTraining){m.nextTraining=s.day+12;
  if(m.trained>desired&&m.trained>(t.deployed||0)){m.trained--;m.ledger.demobilized++;}
  else if(m.trained<desired&&t.pop>5&&t.food>=t.pop*.2*24+2){const kit=m.kits>m.trained;if(!kit&&(t.wood<1||t.stone<.5))return;t.food-=2;m.ledger.trainingFood+=2;if(!kit){t.wood--;t.stone-=.5;m.kits++;m.ledger.equipmentWood++;m.ledger.equipmentStone+=.5;}m.trained++;m.ledger.recruited++;if(t.id===0)log(s,[0],t.name+'이 주민 한 명을 훈련했다. 식량 2'+(kit?'와 보관 장비':'·목재 1·돌 0.5')+'을 사용했고 생산 일손과 유지비를 함께 부담한다.','defense',{story:s.village?.story});}
 }
}
function status(s,t){if(!t.military)return null;const m=t.military;return {...m,ready:ready(t),target:target(t),labor: labor(t),foodPerDay:ready(t)*.04,years:t.civilization?.initialYears==null?null:t.civilization.initialYears+(s.day-t.civilization.started)/360,power:power(t)};}
const api={enable,daily,ready,labor,power,casualty,status,target};root.ValleyDefense=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
