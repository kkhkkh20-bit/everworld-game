/* Physical food gathering, hunting, shore fishing and boat fishing. */
(function(root){
'use strict';
const Geometry=typeof module!=='undefined'?require('./valley-world-geometry.js'):root.ValleyGeometry;
const names={grain:'곡물',wild:'열매',meat:'고기',fish:'생선'};
const boats=t=>t.buildings.filter(b=>b.type==='boat'&&!b.ruined).length+(t.livelihood?.existingBoats||0);
function enable(s){if(s.livelihoodSystem&&s.towns.every(t=>t.livelihood))return s;s.livelihoodSystem||={version:1,started:s.day};const g=Geometry.createGeometry(s);
 for(const t of s.towns){if(t.livelihood)continue;let fishing=null,hunt=null;
  for(let i=0;i<32;i++){const dx=Math.cos(i*Math.PI/16),dz=Math.sin(i*Math.PI/16);let high=0;
   for(let d=8;d<=76;d+=4){const x=t.x+dx*d,z=t.z+dz*d;high=Math.max(high,g.height(x,z));if(!hunt&&d>=18&&d<=32&&g.waterDistance(x,z)>4&&(!g.island||g.island.forestDensity(x,z)>.3))hunt={x,z};if(g.waterDistance(x,z)<-1){const landing={x:t.x+dx*Math.max(0,d-8),z:t.z+dz*Math.max(0,d-8)};if(high<6&&g.waterDistance(landing.x,landing.z)>=.2&&(!fishing||d<fishing.distance)){let lo=Math.max(0,d-8),hi=d;for(let n=0;n<12;n++){const mid=(lo+hi)/2;if(g.waterDistance(t.x+dx*mid,t.z+dz*mid)>.35)lo=mid;else hi=mid;}const bank={x:t.x+dx*lo,z:t.z+dz*lo};fishing={landing,bank,water:{x,z},distance:d,sea:!!g.island&&g.island.coastDistance(x,z)<0};}break;}}
  }
  t.livelihood={version:1,policy:'balanced',hunt:hunt||{x:t.x+18,z:t.z-10},fishing,game:hunt?72:24,gameCapacity:hunt?72:24,fish:96,fishCapacity:96,existingBoats:t.id!==0&&t.style==='port'&&fishing?1:0,delivered:{grain:0,wild:0,meat:0,fish:0},caught:{meat:0,fish:0},lastDelivery:null};
 }
 return s;
}
function method(t,w){const l=t.livelihood;if(!l)return null;let m=l.policy;
 if(m==='balanced'&&(t.style==='farm'||t.fertility>=1.2))m='farm';
 if(m==='balanced'){const farms=t.buildings.some(b=>b.type==='farm'&&!b.ruined);m=farms?(w.id===2&&l.game>36?'hunt':w.id===3&&l.fishing&&l.fishing.distance<36?'fish':'farm'):(w.id%3===1&&l.game>8?'hunt':w.id%3===2&&l.fishing&&l.fishing.distance<36?'fish':'farm');}
 if(m==='hunt'&&l.game<1)m='farm';if(m==='fish'&&(!l.fishing||l.fish<8))m='farm';return m;
}
function worker(s,t,w,dt,ctx){
 const l=t.livelihood;if(!l)return false;
 if(w.cargo){if(w.foodTask?.phase==='return-boat'){w.phase='배를 저어 물가로 돌아오는 중';if(ctx.move(w,l.fishing.bank,dt)){w.transport=null;w.foodTask=null;}return true;}return false;}
 if(w.job!=='food'){w.foodTask=null;w.transport=null;return false;}
 if(!w.foodTask)w.foodTask={method:method(t,w),phase:'out',boat:false};const task=w.foodTask;
 let site,source;
 if(task.method==='hunt'){site=l.hunt;source='meat';}
 else if(task.method==='fish'){
  const f=l.fishing;if(!f){w.foodTask=null;return false;}source='fish';
  if(!task.boat&&task.phase==='out'&&boats(t)>t.workers.filter(other=>other!==w&&other.transport==='boat').length){if(!ctx.move(w,f.bank,dt)){w.phase='물고기를 잡으러 물가로 이동';return true;}task.boat=true;w.transport='boat';}
  site=task.boat?f.water:f.bank;
 }else{const siteBase=ctx.workSite(t,'food');site={x:siteBase.x+(w.id%2)*1.2,z:siteBase.z};source=ctx.count(t,'farm')?'grain':'wild';}
 if(!ctx.move(w,site,dt)){w.phase=task.method==='hunt'?'사냥감을 찾아 숲으로 이동':task.method==='fish'?task.boat?'배를 저어 어장으로 이동':'낚시하러 물가로 이동':source==='grain'?'밭으로 이동':'열매를 찾으러 이동';return true;}
 task.phase='work';w.phase=task.method==='hunt'?'숲에서 사냥 중':task.method==='fish'?task.boat?'배에서 물고기 잡는 중':'물가에서 낚시 중':source==='grain'?'밭에서 수확 중':'숲 가장자리에서 열매 채집 중';w.work+=dt;if(w.work<1.4)return true;
 let q;
 if(source==='meat'){q=Math.min(l.game,ctx.crew*6*(t.season===3?.85:1));l.game-=q;l.caught.meat+=q;}
 else if(source==='fish'){q=Math.min(l.fish,ctx.crew*(task.boat?8:5)*(t.season===3?.75:1));l.fish-=q;l.caught.fish+=q;}
 else q=ctx.crew*(source==='grain'?3.8:2.8)*ctx.foodFactor(s,t)*(1+ctx.count(t,'farm')*.08+ctx.count(t,'mill')*.15);
 w.work=0;if(q<=.001){if(task.boat){w.cargo={kind:'food',q:0,source};task.phase='return-boat';}else{w.foodTask=null;w.transport=null;if(w.nextJob){w.job=w.nextJob;w.nextJob=null;}}w.phase=source==='meat'?'사냥감 회복을 기다리며 다른 먹거리 찾기':'어장 회복을 기다리며 다른 먹거리 찾기';return true;}
 t.output.food+=q;t.taxAccrued+=q*t.taxRate;w.cargo={kind:'food',q,source};if(task.boat)task.phase='return-boat';else w.foodTask=null;return true;
}
function deposit(s,t,c,log){if(!t.livelihood||c.kind!=='food'||!c.source||c.q<=0)return;const first=t.livelihood.delivered[c.source]===0;t.livelihood.delivered[c.source]+=c.q;if(first&&t.id===0&&log)log(s,[0],t.name+'에 첫 '+names[c.source]+' '+Math.floor(c.q)+'이 도착했다. 주민들이 직접 가져온 먹거리만 비축에 들어갔다.','milestone',{story:s.village?.story});t.livelihood.lastDelivery={day:s.day,source:c.source,q:c.q};}
function daily(s,t){const l=t.livelihood;if(!l||t.pop<=0)return;l.game=Math.min(l.gameCapacity,l.game+Math.max(0,t.forest/1000)*.42*(t.season===3?.55:1));l.fish=Math.min(l.fishCapacity,l.fish+(s.weather?.factor<1?.65:1.1)*(t.season===3?.7:1));}
function status(t){if(!t.livelihood)return null;return {...t.livelihood,boats:boats(t),huntingLevel:t.livelihood.game>36?'넉넉':t.livelihood.game>12?'보통':'적음',fishingLevel:t.livelihood.fish>48?'넉넉':t.livelihood.fish>12?'보통':'적음'};}
const api={enable,worker,deposit,daily,status,boats,names};root.ValleyLivelihood=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
