const assert=require('node:assert/strict'),E=require('../js/valley-engine');
const run=(s,days)=>{for(let i=0;i<days*10;i++)E.step(s,.1);};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const s=E.world(7341),own=s.towns[0],capital=s.towns.find(t=>t.style==='capital');
assert.equal(own.architecture.level,0);assert.equal(own.buildings[0].tier,0);assert.equal(capital.architecture.level,3);
const gate=JSON.stringify(s);assert.match(E.request(s,'workshop'),/목조 건축/);assert.match(E.request(s,'mill'),/석조 건축/);assert.equal(JSON.stringify(s),gate,'locked construction spends nothing and changes no priorities');
assert.equal(new Set(s.towns.flatMap(t=>t.buildings.map(b=>b.id))).size,s.towns.reduce((n,t)=>n+t.buildings.length,0));
const snapshot=JSON.stringify(s);E.architectureStatus(own);for(const t of s.towns)for(const b of t.buildings)E.buildingInfo(s,t.id,b.id);assert.equal(JSON.stringify(s),snapshot,'inspection is pure');
const old=JSON.parse(snapshot);for(const t of old.towns){delete t.architecture;delete t.nextBuildingId;for(const b of t.buildings){delete b.id;delete b.tier;}}
assert.ok(E.validate(old));const inventory=old.towns.map(t=>[t.food,t.wood,t.stone,t.pop,t.buildings.map(b=>[b.type,b.day,b.x,b.z])]);const rng=old.rng,time=old.time;
E.enableArchitecture(old);assert.deepEqual(old.towns.map(t=>[t.food,t.wood,t.stone,t.pop,t.buildings.map(b=>[b.type,b.day,b.x,b.z])]),inventory);assert.equal(old.rng,rng);assert.equal(old.time,time);assert.ok(old.towns.every(t=>t.architecture.learned===null));const migrated=JSON.stringify(old);E.enableArchitecture(old);assert.equal(JSON.stringify(old),migrated,'save migration is idempotent');
const corrupt=JSON.parse(snapshot);corrupt.towns[0].architecture.level=9;assert.equal(E.validate(corrupt),false);
const deferred=E.world(42);deferred.towns[0].request='mill';deferred.towns[0].project=null;E.policy(deferred,'policy','food');assert.equal(deferred.towns[0].project.type,'farm');assert.equal(deferred.towns[0].request,'mill','old locked priority is deferred while survival building proceeds');
const natural=E.world(7341);E.winterChoice(natural,'self');run(natural,180);assert.ok(natural.towns[0].architecture.level>=1);assert.ok(natural.towns[0].architecture.learned>natural.foundingDay);assert.equal(natural.towns[0].buildings[0].tier,0,'learning does not instantly rebuild existing architecture');
// A fully supplied fixture tests a real material-carrying renovation, not a UI repaint.
const renovation=E.world(42),t=renovation.towns[0];E.winterChoice(renovation,'self');t.project=null;t.architecture.level=1;t.architecture.experience=0;t.food=5000;t.wood=500;t.stone=500;
for(const type of ['home','home','farm','market','workshop','well'])t.buildings.push({type,tier:1,x:5+t.buildings.length*4,z:-4,day:renovation.day});
E.enableArchitecture(renovation);E.policy(renovation,'policy','balanced');assert.equal(t.project.upgrade,t.buildings[0].id);const id=t.project.upgrade,cost=E.projectCost(t.project),count=t.buildings.length;
const total=(k)=>t[k]+t.workers.reduce((n,w)=>n+(w.cargo?.kind===k?w.cargo.q:0),0)+(t.project?.material[k]||0);
const before={wood:total('wood'),stone:total('stone'),woodOutput:t.output.wood,stoneOutput:t.output.stone,fuel:t.water.ledger.fuel,woodUpkeep:t.ledger.upkeepWood,stoneUpkeep:t.ledger.upkeepStone};
for(let i=0;i<600&&t.buildings[0].tier===0;i++)E.step(renovation,.1);
assert.equal(t.buildings[0].tier,1);assert.equal(t.buildings[0].id,id);assert.equal(t.buildings.length,count,'renovation retains building identity and housing count');
close(total('wood'),before.wood+t.output.wood-before.woodOutput-(t.ledger.upkeepWood-before.woodUpkeep)-(t.water.ledger.fuel-before.fuel)-cost.wood);
close(total('stone'),before.stone+t.output.stone-before.stoneOutput-(t.ledger.upkeepStone-before.stoneUpkeep)-cost.stone);
const roundTrip=JSON.parse(JSON.stringify(renovation));run(renovation,10);run(roundTrip,10);assert.deepEqual(roundTrip,renovation,'technology and renovations replay after save');
const house=t.buildings.find(b=>b.type==='home'),info=E.buildingInfo(renovation,t.id,house.id);assert.equal(info.occupants,6);house.ruined=true;assert.equal(E.buildingInfo(renovation,t.id,house.id).occupants,0);
console.log('PASS architecture: distinct starting technology, stable building IDs, pure inspection, old-save migration, earned learning, material-paid renovation, occupants and deterministic replay');
