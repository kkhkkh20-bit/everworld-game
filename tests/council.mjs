import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {councilState,councilPanel,chooseCouncil} from '../js/valley-council.mjs';
const require=createRequire(import.meta.url),E=require('../js/valley-engine.js');
const fresh=()=>{const s=E.world(7341);E.enableVillage(s);E.enableWater(s);E.enableLivelihood(s);E.enableFrontier(s);return s;};
const run=(s,days)=>{for(let i=0;i<days*10;i++)E.step(s,.1);};
const outcomes=[];
for(const kind of ['self','trade','protect']){
 const s=fresh(),before=JSON.stringify(s),x=councilState(s,E);councilPanel(s,E);
 assert.equal(JSON.stringify(s),before,'opening council must not alter stocks, RNG or history');
 const q=kind==='self'?null:x[kind];assert.ok(!q||q.can);
 assert.equal(chooseCouncil(s,E,kind,q?.id??null,q?.cost??null),'');
 const a=s.village.actions.at(-1);assert.ok(a.council);assert.equal(a.after,null);
 assert.equal(s.towns[0].food,x.now.food-(q&&!q.connected?5:0),'only real expedition costs are charged; no instant grant');
 const replay=JSON.parse(JSON.stringify(s));run(s,30);run(replay,30);assert.deepEqual(s,replay,'mid-decision saves must replay');
 assert.ok(s.village.actions.at(-1).after,'actual day 30 records an outcome');
 assert.equal(s.village.plan.kind,kind);assert.equal(E.validate(s),true);
 outcomes.push([s.towns[0].food,s.towns[0].wood,s.towns[0].liege,s.towns[0].tradeOpen]);
 const settled=JSON.stringify(s);councilPanel(s,E);assert.equal(JSON.stringify(s),settled);
}
assert.equal(new Set(outcomes.map(x=>JSON.stringify(x))).size,3,'choices must lead to distinct actual worlds');
const s=fresh(),before=JSON.stringify(s);assert.ok(chooseCouncil(s,E,'trade',999,0));assert.equal(JSON.stringify(s),before,'invalid partners must not create a decision');
const q=councilState(s,E).trade;assert.ok(chooseCouncil(s,E,'trade',q.id,-1));assert.equal(JSON.stringify(s),before,'stale or insufficient budget must not commit');
console.log('PASS council: pure inspection, three distinct real economic paths, validated costs, no free rewards, day-30 reports and deterministic saved replay');
