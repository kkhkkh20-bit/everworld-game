const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});try{
 fs.mkdirSync('/tmp/everworld-council',{recursive:true});
 for(const width of [1440,390]){
  const p=await browser.newPage({viewport:{width,height:width===390?844:1000}}),errors=[],failed=[];p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>failed.push(r.url()));
  await p.goto('http://127.0.0.1:8020/frontier.html?campaign=survival');await p.waitForFunction(()=>window.__VALLEY__,null,{timeout:90000});await p.locator('#loading').waitFor({state:'hidden'});
  if(!await p.evaluate(()=>__VALLEY__.paused()))await p.locator('#pause').click();
  await p.locator('#villageBeacon').click();assert.equal(await p.locator('#panelTitle').innerText(),'당신의 결정');assert.equal(await p.locator('[data-council]').count(),3);
  const before=await p.evaluate(()=>JSON.stringify(__VALLEY__.state()));await p.evaluate(()=>__VALLEY__.openPanel('council'));assert.equal(await p.evaluate(()=>JSON.stringify(__VALLEY__.state())),before);
  await p.screenshot({path:`/tmp/everworld-council/choices-${width}.png`});
  await p.locator('[data-council="trade"]').click();await p.locator('.council-report').waitFor();assert.match(await p.locator('.council-report').innerText(),/나무를 내주고/);
  // Pause normal time, then exercise the actual responsive fast-forward control.
  if(!await p.evaluate(()=>__VALLEY__.paused()))await p.locator('#pause').click();
  const day=await p.evaluate(()=>__VALLEY__.state().day);await p.locator('[data-council-watch]').click();
  await p.waitForFunction(()=>!__VALLEY__.skipping(),null,{timeout:90000});assert.ok(await p.evaluate(d=>__VALLEY__.state().day>d,day));assert.ok(await p.evaluate(()=>__VALLEY__.paused()));
  assert.equal(await p.locator('#panelTitle').innerText(),'당신의 결정');await p.locator('.council-report').waitFor();
  await p.evaluate(()=>__VALLEY__.advance(30));assert.match(await p.locator('.council-report').innerText(),/30일 결산/);
  await p.screenshot({path:`/tmp/everworld-council/result-${width}.png`});
  const result=await p.evaluate(()=>JSON.stringify(__VALLEY__.state().village.actions.find(a=>a.council).after));await p.evaluate(()=>__VALLEY__.save());
  await p.reload();await p.waitForFunction(()=>window.__VALLEY__,null,{timeout:90000});assert.equal(await p.evaluate(()=>JSON.stringify(__VALLEY__.state().village.actions.find(a=>a.council).after)),result);
  await p.locator('#loading').waitFor({state:'hidden'});await p.locator('.bottom-hud [data-panel="council"]').click();assert.match(await p.locator('.council-report').innerText(),/30일 결산/);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const overflow=await p.locator('.council-choice').evaluateAll(nodes=>nodes.some(n=>n.scrollWidth>n.clientWidth));assert.equal(overflow,false);
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);console.log('PASS council UI',width,'three choices, pure inspection, physical execution, bounded watch, paused return, 30-day report, saved reload, no overflow/errors');await p.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
