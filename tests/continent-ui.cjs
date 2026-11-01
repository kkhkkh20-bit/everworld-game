const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{chromium}=require('playwright'),E=require('../js/valley-engine');
const artifacts=process.env.EVERWORLD_CONTINENT_ARTIFACTS||path.join(os.tmpdir(),'everworld-continent-audit');fs.mkdirSync(artifacts,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});try{
 for(const width of [1440,390]){
  const p=await browser.newPage({viewport:{width,height:width===390?844:1000},hasTouch:width===390}),errors=[],failed=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>failed.push(r.url()));
  const legacy=E.fresh(42,true,false);legacy.towns[0].food=123.4;legacy.towns[0].wood=77;legacy.towns[0].architecture.level=2;legacy.towns[0].buildings[0].tier=2;const raw=JSON.stringify(legacy);
  await p.addInitScript(({raw,key})=>{if(!localStorage.getItem(key))localStorage.setItem(key,raw);},{raw,key:E.LEGACY_KEY});
  await p.goto('http://127.0.0.1:8020/frontier.html');await p.waitForFunction(()=>window.__VALLEY__,null,{timeout:90000});await p.locator('#loading').waitFor({state:'hidden'});if(!await p.evaluate(()=>__VALLEY__.paused()))await p.locator('#pause').click();await p.waitForFunction(()=>!__VALLEY__.view().moving);
  assert.equal(await p.evaluate(()=>__VALLEY__.saveKey),E.KEY);assert.equal(await p.evaluate(()=>__VALLEY__.state().towns[0].x),-293);assert.equal(await p.evaluate(()=>__VALLEY__.state().towns[0].architecture.level),0);
  assert.equal(await p.evaluate(key=>localStorage.getItem(key),E.LEGACY_KEY),raw,'opening the new continent preserves the older village save');
  assert.match(await p.locator('#villageBeacon').innerText(),/내가 할 일/);await p.screenshot({path:path.join(artifacts,`continent-start-${width}.png`)});
  await p.locator('#villageBeacon').click();assert.match(await p.locator('.political-brief').innerText(),/대표/);assert.equal(await p.locator('[data-winter]').count(),3);
  const self=await p.locator('[data-survival="water"]').boundingBox(),panel=await p.locator('#panelContent').boundingBox();assert.ok(self.y+self.height<=panel.y+panel.height,'the immediate spring decision is visible before detailed statistics');
  await p.screenshot({path:path.join(artifacts,`continent-decisions-${width}.png`)});await p.locator('#closePanel').click();await p.locator('#worldView').click();await p.waitForFunction(()=>!__VALLEY__.view().moving);assert.equal(await p.evaluate(()=>__VALLEY__.view().continent),true);await p.screenshot({path:path.join(artifacts,`continent-world-${width}.png`)});
  await p.locator('[data-panel="factions"]').click();await p.screenshot({path:path.join(artifacts,`continent-atlas-${width}.png`)});await p.locator('#closePanel').click();await p.locator('#villageBeacon').click();
  await p.locator('#foodDirections > summary').click();await p.locator('[data-winter="trade"]').click();assert.equal(await p.evaluate(()=>__VALLEY__.state().village.plan.kind),'trade');assert.ok(await p.evaluate(()=>__VALLEY__.state().towns[0].expedition));if(!await p.evaluate(()=>__VALLEY__.paused()))await p.locator('#pause').click();await p.evaluate(()=>__VALLEY__.advance(31));await p.locator('#villageBeacon').click();assert.equal(await p.locator('.village-comparison').count(),1);assert.match(await p.locator('.village-comparison').innerText(),/30일/);
  await p.evaluate(()=>__VALLEY__.save());assert.equal(await p.evaluate(key=>localStorage.getItem(key),E.LEGACY_KEY),raw);
  await p.goto('http://127.0.0.1:8020/frontier.html?campaign=legacy');await p.waitForFunction(()=>window.__VALLEY__,null,{timeout:90000});await p.evaluate(()=>{if(!__VALLEY__.paused())document.getElementById('pause').click();});
  assert.equal(await p.evaluate(()=>__VALLEY__.saveKey),E.LEGACY_KEY);assert.equal(await p.evaluate(()=>__VALLEY__.state().towns[0].x),12);assert.equal(await p.evaluate(()=>__VALLEY__.state().towns[0].architecture.level),2);assert.ok(await p.evaluate(()=>localStorage.getItem(Valley.KEY)));
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);console.log('PASS',width,'primitive coastal start, explicit political objective, visible choices, progress/result, full continent/atlas and independent old/new saves');await p.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
