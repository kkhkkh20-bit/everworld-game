import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(
  'window.__EVERWORLD__={',
  'window.__REGION_AUDIT__={ensure:ensureWorld,trade:tradeVillages,campaign:launchCampaign,resolve:advanceCampaign,faction:factionOf,military:militaryState,colony:foundWorldColony};window.__EVERWORLD__={'
);
const noop=()=>{};
const context2d=new Proxy({measureText:value=>({width:String(value).length*7})},{get:(target,key)=>target[key]||noop});
class Element {
  constructor(){this.children=[];this.dataset={};this.style={setProperty:noop};this.classList={add:noop,remove:noop,toggle:noop};this.textContent='';this.scrollTop=0;}
  getContext(){return context2d;}
  getBoundingClientRect(){return {width:900,height:570,left:0,top:0};}
  append(...items){this.children.push(...items);}
  appendChild(item){this.children.push(item);return item;}
  replaceChildren(...items){this.children=items;}
  querySelectorAll(){return [];}
  setAttribute(){}
  addEventListener(){}
  focus(){}
}
const elements=new Map(),storage=new Map();
const document={
  getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},
  createElement:()=>new Element(),createTextNode:value=>({textContent:value}),
  querySelectorAll:()=>[],querySelector:()=>null,addEventListener:noop
};
const window={innerHeight:844,innerWidth:1440,devicePixelRatio:1,addEventListener:noop};
vm.runInNewContext(source,{document,window,localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},requestAnimationFrame:noop,setInterval:()=>1,clearInterval:noop,setTimeout:noop,clearTimeout:noop,performance:{now:()=>0},console},{filename:'index.html',timeout:30000});
const game=window.__EVERWORLD__,region=window.__REGION_AUDIT__;
assert.ok(game?.step,'Current simulation API must initialize');

function inventory(){
  const w=game.world();
  assert.ok(Number.isFinite(w.food)&&w.food>=0,'Invalid communal food');
  assert.ok(Math.abs(w.food-Object.values(w.products).reduce((a,b)=>a+b,0))<.01,'Food ledger mismatch');
  assert.ok([w.wood,w.stone,w.tools].every(n=>Number.isFinite(n)&&n>=0),'Invalid building supplies');
  assert.ok(w.people.filter(n=>n.alive).every(n=>Number.isFinite(n.health)&&n.health>0&&Number.isFinite(n.age)),'Invalid living resident');
  for(const v of w.region.villages)assert.ok([v.pop,v.food,v.wood,v.stone,v.soldiers].every(n=>Number.isFinite(n)&&n>=0),'Invalid neighboring settlement');
  for(const owner of Object.values(w.region.owners))assert.ok(owner===0||w.region.villages.some(v=>v.id===owner),'Unknown land owner');
}
const seeds=[1,7,25,51,125,1442,1893,4762,8321,9999];
for(const seed of seeds){
  game.reset(seed);game.pause();game.step(180);inventory();
  assert.equal(game.world().day,181);assert.ok(game.world().region.villages.length>=4);
}
game.reset(1840);game.pause();const first=JSON.stringify(game.step(365));
game.reset(1840);game.pause();assert.equal(JSON.stringify(game.step(365)),first,'Identical seeds must replay identically');

game.reset(1840);game.pause();game.step(365*10);inventory();
assert.ok(game.world().stage>=1,'Productive settlement must unlock trade');
assert.ok(game.world().development.level>=3,'Town development must be reachable');
assert.ok(game.world().buildings.schools>=1&&game.world().education.sessions>0,'Schools must pass knowledge to children');
assert.ok(game.world().region.villages.some(v=>v.pop>v.id*3+19),'Neighbors must grow on the shared calendar');

game.reset(1840);game.pause();
let w=game.world(),r=region.ensure();r.relations['0:1']=30;
const totals=()=>['food','wood','stone'].map(key=>w[key]+r.villages.reduce((sum,v)=>sum+v[key],0));
const before=totals();assert.equal(region.trade(0,1,true),true);totals().forEach((value,i)=>assert.ok(Math.abs(value-before[i])<.001,'Barter must conserve inventory'));
inventory();r.embargo.push(1);delete r.lastTrade['0:1'];assert.equal(region.trade(0,1),false,'Embargo must block barter');

const parent=r.villages[0];parent.pop=70;parent.food=8000;parent.wood=200;parent.stone=100;parent.lastColony=-9999;
const population=w.people.filter(n=>n.alive).length+r.villages.reduce((sum,v)=>sum+v.pop,0);
assert.equal(region.colony(parent),true);
assert.equal(w.people.filter(n=>n.alive).length+r.villages.reduce((sum,v)=>sum+v.pop,0),population,'Colonists must leave the parent settlement');

game.reset(1840);game.pause();w=game.world();r=region.ensure();
const rival=r.villages[0];rival.soldiers=2;rival.tech=0;rival.fort=0;region.military(1).wall=0;region.military(1).hp=0;
r.owners['45,30']=0;r.owners['44,30']=1;
const populationBefore=w.people.filter(n=>n.alive).length+rival.pop;
assert.equal(region.campaign(0,1,true),'');const campaign=r.campaigns[0];w.day=campaign.arrives;region.resolve(campaign);
assert.equal(campaign.phase,'assault');assert.equal(r.battleCount,0);w.day=campaign.arrives;region.resolve(campaign);
assert.equal(r.battleCount,1);assert.ok(w.people.filter(n=>n.alive).length+rival.pop<populationBefore,'Combat must have actual casualties');
assert.equal(region.faction(r.owners['44,30']),region.faction(0),'Victory must transfer contested land or conquer its settlement');
assert.equal(campaign.phase,'return');w.day=campaign.arrives;region.resolve(campaign);
assert.ok(w.people.filter(n=>n.alive).every(n=>!n.campaignId),'Returned soldiers must resume civilian life');
inventory();

w.people.forEach(n=>n.alive=false);w.abandoned=true;const day=w.day;game.step(7);
assert.equal(w.day,day+7,'Other civilizations must continue after the home settlement falls');
assert.ok(r.villages.some(v=>v.pop>0));
console.log('PASS: 10 seeded worlds, deterministic replay, development, education, shared world, conserved trade, colonization, combat and territorial consequences.');
