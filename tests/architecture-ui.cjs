const assert=require('node:assert/strict'),{chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const artifacts=process.env.EVERWORLD_ARCHITECTURE_ARTIFACTS||path.join(os.tmpdir(),'everworld-architecture-audit');fs.mkdirSync(artifacts,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});try{
  for(const width of [1440,390]){
    const page=await browser.newPage({viewport:{width,height:width===390?844:1000},hasTouch:width===390}),errors=[],failed=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failed.push(r.url()));
    await page.goto('http://127.0.0.1:8020/frontier.html?seed=7341');await page.waitForFunction(()=>window.__VALLEY__,null,{timeout:60000});await page.locator('#loading').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>__VALLEY__.view().assetModels),18);assert.ok(await page.evaluate(()=>__VALLEY__.view().buildingStyles>=8));
    if(!await page.evaluate(()=>__VALLEY__.paused()))await page.locator('#pause').click();
    await page.locator('#villageView').click();await page.waitForFunction(()=>!__VALLEY__.view().moving);
    const point=await page.evaluate(()=>{const t=__VALLEY__.state().towns[0],b=t.buildings[0];return __VALLEY__.project(t.x+b.x,t.z+b.z,1);}),before=await page.evaluate(()=>JSON.stringify(__VALLEY__.state()));
    if(width===390)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
    assert.equal(await page.locator('#panelTitle').textContent(),'마을 중심');assert.match(await page.locator('.building-owner').innerText(),/우리 건물/);assert.match(await page.locator('.material-badge').innerText(),/개척기/);
    await page.locator('.building-technology summary').click();assert.equal(await page.locator('.technology-ladder>span').count(),4);assert.equal(await page.evaluate(()=>JSON.stringify(__VALLEY__.state())),before,'clicking and reading technology does not change economy or RNG');
    await page.screenshot({path:path.join(artifacts,`architecture-own-${width}.png`)});await page.locator('#closePanel').click();await page.waitForTimeout(200);
    const drawCount=await page.evaluate(()=>__VALLEY__.view().renders);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>__VALLEY__.view().renders),drawCount,'paused settled map stops drawing');
    const x=width*.22,y=400;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+60,y+40,{steps:10});await page.mouse.up();assert.equal(await page.locator('#inspector').isVisible(),false,'dragging must not select a building');
    await page.evaluate(()=>__VALLEY__.select(1));await page.locator('[data-focus="1"]').click();await page.waitForFunction(()=>!__VALLEY__.view().moving);
    const stone=await page.evaluate(()=>{const t=__VALLEY__.state().towns.find(t=>t.id===1),b=t.buildings.find(b=>b.type==='home');return {point:__VALLEY__.project(t.x+b.x,t.z+b.z,1.7),id:b.id};});
    if(width===390)await page.touchscreen.tap(stone.point.x,stone.point.y);else await page.mouse.click(stone.point.x,stone.point.y);
    assert.match(await page.locator('.building-owner').innerText(),/다른 마을의 건물/);assert.match(await page.locator('.material-badge').innerText(),/도시 건축/);
    await page.screenshot({path:path.join(artifacts,`architecture-city-${width}.png`)});
    await page.locator('#closePanel').click();await page.evaluate(()=>__VALLEY__.openPanel('village'));await page.locator('[data-winter="self"]').click();if(!await page.evaluate(()=>__VALLEY__.paused()))await page.locator('#pause').click();
    await page.evaluate(()=>__VALLEY__.advance(180));await page.locator('#villageView').click();await page.waitForFunction(()=>!__VALLEY__.view().moving);
    await page.evaluate(()=>{const t=__VALLEY__.state().towns[0],b=t.buildings.find(b=>b.type==='farm');__VALLEY__.inspectBuilding(t.id,b.id);});
    assert.ok(await page.locator('[data-crew]').count()>0);await page.locator('[data-crew]').first().click();assert.match(await page.locator('#panelContent').innerText(),/공동 작업조/);await page.locator('[data-building-back]').click();assert.equal(await page.locator('#panelTitle').textContent(),'공동 농장');
    await page.locator('[data-building-town]').click();await page.locator('.building-technology summary').click();await page.locator('[data-building-id]').filter({hasText:'주택'}).first().click();assert.equal(await page.locator('#panelTitle').textContent(),'주택');await page.screenshot({path:path.join(artifacts,`architecture-thatch-${width}.png`)});
    const saved=await page.evaluate(()=>{__VALLEY__.save();const t=__VALLEY__.state().towns[0];return {level:t.architecture.level,ids:t.buildings.map(b=>b.id)};});assert.ok(saved.level>=1);
    await page.reload();await page.waitForFunction(()=>window.__VALLEY__,null,{timeout:60000});assert.deepEqual(await page.evaluate(()=>({level:__VALLEY__.state().towns[0].architecture.level,ids:__VALLEY__.state().towns[0].buildings.map(b=>b.id)})),saved);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);console.log('PASS',width,'real building click/tap, ownership, four technology stages, no drag selection, true work crews, initial straw home, save and idle rendering');await page.close();
  }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
