const assert=require('node:assert/strict'),E=require('../js/valley-engine'),P=require('../js/valley-paths'),G=require('../js/valley-world-geometry');
const s=E.world(7341),before=JSON.stringify(s),g=G.createGeometry(s);P.prepare(s);assert.equal(JSON.stringify(s),before,'reading a road never changes stock, RNG or history');
let avoided=0,bridges=0;
for(const r of s.routes){
 const line=P.routePoints(s,r.a,r.b);assert.ok(line?.length>2,'every existing road has a terrain alignment');assert.ok(Math.abs(P.length(line)-r.length)<1e-6);
 const spans=P.bridgeSpans(line,g);bridges+=spans.length;let maximum=0,straight=0;
 for(const p of P.samples(line,.5)){
  assert.ok(g.island.coastDistance(p.x,p.z)>1,'roads do not cross the sea');maximum=Math.max(maximum,g.height(p.x,p.z));
  if(g.waterDistance(p.x,p.z)<.8)assert.ok(spans.some(b=>Math.abs((p.x-b.x)*Math.sin(b.angle)+(p.z-b.z)*Math.cos(b.angle))<=b.length/2+.01&&Math.abs((p.x-b.x)*Math.cos(b.angle)-(p.z-b.z)*Math.sin(b.angle))<2.2),'river movement stays on its bridge');
  if(p.distance>.5&&!spans.some(b=>p.distance>=b.start-1&&p.distance<=b.end+1)){const prev=P.at(line,p.distance-.5);assert.ok(Math.abs(g.height(p.x,p.z)-g.height(prev.x,prev.z))/.5<.8,`road ${r.id} avoids abrupt land slopes`);}
 }
 for(const p of P.samples([line[0],line.at(-1)],1))straight=Math.max(straight,g.height(p.x,p.z));if(straight>15){assert.ok(maximum<straight*.55,'mountain roads use lower passes instead of cutting ridges');avoided++;}
}
assert.ok(avoided>=3&&bridges>10);
const changed=JSON.parse(before);changed.routes.push({a:0,b:9,id:'unbuilt-test',open:false,created:changed.day});for(const t of changed.towns)t.buildings.push({type:'home',x:18,z:13});const stable=G.createGeometry(changed);assert.deepEqual(stable.channels,g.channels,'new roads and building growth do not move river banks');for(let x=-330;x<320;x+=20)for(let z=-260;z<270;z+=20){assert.equal(stable.height(x,z),g.height(x,z),'roads do not flatten mountains');assert.equal(stable.island.coastDistance(x,z),g.island.coastDistance(x,z),'roads do not create land');}
// Direction/cache order is observational: it cannot choose a different future trail.
const a={x:117.3,z:-52.7},b={x:61.2,z:-91.8};assert.deepEqual(P.between(s,a,b),P.between(s,b,a).reverse());
const read=JSON.parse(before),plain=JSON.parse(before);for(const r of read.routes.slice().reverse())P.routePoints(read,r.b,r.a);G.createGeometry(read);for(let i=0;i<300;i++){E.step(read,.2);E.step(plain,.2);}assert.deepEqual(read,plain);
const trade=E.world(42);trade.caravans=[];const from=trade.towns.find(t=>t.id===1),to=trade.towns.find(t=>t.id===2);from.food=300;to.wood=100;assert.ok(E.newCaravan(trade,from,to,'food',12,'wood',8));const cart=trade.caravans[0],inventory=['food','wood','stone'].map(k=>E.stocks(trade,k));
for(let i=0;i<5000&&!cart.done;i++){const prev={x:cart.x,z:cart.z};E.caravanStep(trade,cart,.05);assert.ok(Math.hypot(cart.x-prev.x,cart.z-prev.z)<=.251,'carts have no corner or arrival teleports');const course=P.course(trade,cart.path);assert.ok(P.pointDistance(cart.x,cart.z,course.points)<.001,'cart and dirt road use the same curve');}
assert.ok(cart.done);for(const[k,i]of ['food','wood','stone'].map((k,i)=>[k,i]))assert.ok(Math.abs(E.stocks(trade,k)-inventory[i])<1e-7,'all goods, including port tolls, remain accounted');
// Upgrade a real old in-flight position, preserving cargo and position.
assert.ok(E.newCaravan(trade,from,to,'food',7,'wood',4));const old=trade.caravans.at(-1);delete old.roadVersion;old.progress=.4;old.x=from.x+(to.x-from.x)*.4;old.z=from.z+(to.z-from.z)*.4;const position={x:old.x,z:old.z},stock=E.stocks(trade,'food');for(const r of trade.routes){delete r.waypoints;delete r.alignment;delete r.length;}E.enableRoads(trade);assert.deepEqual({x:old.x,z:old.z},position);assert.equal(E.stocks(trade,'food'),stock);const upgraded=JSON.stringify(trade);E.enableRoads(trade);assert.equal(JSON.stringify(trade),upgraded,'save migration is idempotent');E.caravanStep(trade,old,.05);assert.ok(Math.hypot(old.x-position.x,old.z-position.z)<.251);assert.ok(E.validate(trade));
// A real pre-update highroad position lies on a ridge the old renderer flattened.
const ridge=E.world(7341),r=ridge.routes.find(r=>r.id==='region-1-0');ridge.caravans=[{id:999,from:r.a,to:r.b,path:[r.a,r.b],phase:'out',progress:.4,x:-183.95004490024257,z:-165.3650314301698,kind:'food',q:9,other:null,payment:0,people:0}];
const stalled=ridge.caravans[0],origin={x:stalled.x,z:stalled.z},cargo=E.stocks(ridge,'food');assert.equal(P.between(ridge,origin,P.depot(ridge.towns.find(t=>t.id===r.b))),null,'fixture starts on an old flattened ridge');
E.enableRoads(ridge);assert.deepEqual({x:stalled.x,z:stalled.z},origin);assert.ok(E.validate(JSON.parse(JSON.stringify(ridge))),'ridge rejoin path remains serializable');assert.ok(P.course(ridge,stalled.path),'old ridge traffic must have an exit route');assert.equal(E.stocks(ridge,'food'),cargo);delete stalled.path[0].rejoin;E.enableRoads(ridge);assert.ok(P.course(ridge,stalled.path),'a save briefly upgraded by the first road release also recovers');
for(let i=0;i<5000&&!stalled.done;i++){const previous={x:stalled.x,z:stalled.z};E.caravanStep(ridge,stalled,.1);assert.ok(Math.hypot(stalled.x-previous.x,stalled.z-previous.z)<=.501);}assert.ok(stalled.done,'old ridge cargo reaches its original receiver');assert.ok(Math.abs(E.stocks(ridge,'food')-cargo)<1e-7);
console.log(`PASS terrain roads: ${s.routes.length} saved alignments, ${avoided} ridge detours, ${bridges} aligned bridges, stable terrain, pure observation, real cart movement/ETA, cargo conservation and non-teleporting save upgrade`);
