import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createLandscape} from '../js/valley-landscape.mjs';
const E=createRequire(import.meta.url)('../js/valley-engine.js');
for(const seed of [7341,42]){
 const s=E.world(seed),before=JSON.stringify(s),g=createLandscape(s);
 assert.equal(JSON.stringify(s),before,'landscape creation must not mutate simulation or RNG');
 assert.deepEqual(g.channels,createLandscape(s).channels,'shorelines must be reproducible for the same snapshot');
 assert.equal(g.channels.length,5);const averageWidth=g.main.samples.reduce((n,p)=>n+2*p.half,0)/g.main.samples.length;assert.ok(averageWidth>22,'main channel must be visibly wider than the old 7.6-unit ribbon');
 const trees=g.trees.flat();assert.ok(trees.length>3500&&trees.length<16000,'forest regions stay dense while ocean, desert and mountains remain distinct');
 for(const p of trees){assert.ok(g.waterDistance(p.x,p.z)>=3.3,'trees stay out of the shore');assert.equal(g.protectedGround(p.x,p.z,1.5),false,'clear settlements and field footprints');}
 for(const t of s.towns)for(const b of t.buildings){const radius=b.type==='hall'?3.5:2.4;for(const [dx,dz]of [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]])assert.ok(g.waterDistance(t.x+b.x+dx,t.z+b.z+dz)>0,`${t.name} ${b.type} stays above water`);}
 for(const p of s.plots)for(const [dx,dz]of [[0,0],[2.6,0],[-2.6,0],[0,2.6],[0,-2.6]])assert.ok(g.waterDistance(p.x+dx,p.z+dz)>0,'existing fields must not be flooded by decorative water');
 let crossings=0;
 for(const r of s.routes){const a=s.towns.find(t=>t.id===r.a),b=s.towns.find(t=>t.id===r.b),spans=g.crossings(a,b);crossings+=spans.length;const n=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)*2);for(let i=0;i<=n;i++){const k=i/n,x=a.x+(b.x-a.x)*k,z=a.z+(b.z-a.z)*k;if(g.waterDistance(x,z)<0)assert.ok(spans.some(p=>Math.abs((x-p.x)*Math.sin(p.angle)+(z-p.z)*Math.cos(p.angle))<=p.length/2),'every wet road section needs a bank-to-bank bridge');}}
 assert.ok(crossings>10,'tributaries need crossings as well as the main river');
 for(let i=0;i<4500;i++)E.step(s,.2);const aged=createLandscape(s);for(const t of s.towns)for(const b of t.buildings)assert.ok(aged.waterDistance(t.x+b.x,t.z+b.z)>0,'mature saved settlements remain on dry land');
 console.log(`PASS landscape seed ${seed}: ${trees.length} trees, ${averageWidth.toFixed(1)}-unit mean river width, 5 channels, ${crossings} crossings, dry buildings/fields, pure observation, mature save`);
}
