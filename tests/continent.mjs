import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createLandscape} from '../js/valley-landscape.mjs';
const E=createRequire(import.meta.url)('../js/valley-engine.js');
for(const seed of [7341,42]){
  const s=E.world(seed),own=s.towns[0],before=JSON.stringify(s),g=createLandscape(s),B=E.bounds(s);
  assert.equal(s.campaign,'continent');assert.equal(own.auto,false,'the player keeps foreign-policy authority until delegating it');assert.ok(own.x<B.minX+60);assert.equal(own.architecture.level,0);assert.ok(!s.routes.some(r=>r.a===0||r.b===0));
  assert.ok(Math.min(...s.towns.slice(1).map(t=>Math.hypot(t.x-own.x,t.z-own.z)))>70,'the camp is outside the existing village cluster');
  assert.ok(g.island.coastDistance(own.x,own.z)>5&&g.island.coastDistance(own.x,own.z)<45,'the new camp is on the edge of the continent');
  for(let x=B.minX;x<=B.maxX;x+=5)for(const z of [B.minZ,B.maxZ])assert.ok(g.island.coastDistance(x,z)<0);
  for(let z=B.minZ;z<=B.maxZ;z+=5)for(const x of [B.minX,B.maxX])assert.ok(g.island.coastDistance(x,z)<0,'the ocean surrounds all four edges');
  const cells=new Set(),biomes={};let peak=0;
  for(let ix=0,x=B.minX;x<B.maxX;x+=6,ix++)for(let iz=0,z=B.minZ;z<B.maxZ;z+=6,iz++){
    const b=g.island.biome(x,z);biomes[b]=(biomes[b]||0)+1;peak=Math.max(peak,g.height(x,z));if(g.island.coastDistance(x,z)>0)cells.add(ix+','+iz);
  }
  for(const b of ['ocean','beach','desert','mountain','forest','grassland'])assert.ok(biomes[b]>30,`${b} needs a visible region`);assert.ok(peak>35);
  let components=0;while(cells.size){components++;const first=cells.values().next().value,queue=[first];cells.delete(first);for(let i=0;i<queue.length;i++){const[x,z]=queue[i].split(',').map(Number);for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const key=(x+dx)+','+(z+dz);if(cells.delete(key))queue.push(key);}}}
  assert.equal(components,1,'settlements and roads belong to one continent');
  for(const p of g.trees.flat())assert.notEqual(g.island.biome(p.x,p.z),'desert','the desert must not be covered by pine forest');
  assert.match(E.villageObjective(s).action,/먹거리/);assert.equal(JSON.stringify(s),before,'geography and objective reading preserve resources, RNG and history');
  const closed=JSON.parse(before);for(const r of closed.routes)r.open=false;for(const t of closed.towns)t.faction=null;const closedMap=createLandscape(closed);for(let x=B.minX;x<B.maxX;x+=24)for(let z=B.minZ;z<B.maxZ;z+=24)assert.equal(closedMap.island.coastDistance(x,z),g.island.coastDistance(x,z),'political ownership and closed roads do not move the coast');
  console.log('PASS continent',seed,biomes,'trees',g.trees.flat().length,'peak',peak.toFixed(1));
}
const legacy=E.fresh(7,true,false),old=JSON.stringify(legacy);assert.equal(legacy.towns[0].x,12);createLandscape(legacy);assert.equal(JSON.stringify(legacy),old);assert.notEqual(E.KEY,E.LEGACY_KEY,'new expedition and old village use separate save slots');
const trade=E.world(42),teacher=trade.towns.find(t=>t.id===1),learner=trade.towns.find(t=>t.id===4);learner.architecture.level=1;learner.architecture.experience=0;learner.architecture.contacts={};teacher.food=200;learner.wood=100;trade.caravans=[];
assert.ok(E.newCaravan(trade,teacher,learner,'food',12,'wood',8));const cart=trade.caravans[0];assert.equal(learner.architecture.experience,0);
while(cart.phase==='out')E.caravanStep(trade,cart,.1);assert.equal(learner.architecture.experience,0,'knowledge requires a completed round trip');
for(let i=0;i<4000&&!cart.done;i++)E.caravanStep(trade,cart,.1);assert.ok(cart.done);assert.equal(learner.architecture.experience,6);assert.equal(trade.towns[0].architecture.experience,0,'the unconnected camp learns nothing from other communities for free');
console.log('PASS separate legacy save layout, concrete first objective, and building knowledge through actual community trade');
