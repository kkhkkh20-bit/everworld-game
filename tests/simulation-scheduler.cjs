const fs=require('fs'),http=require('http'),assert=require('assert/strict'),{chromium}=require('playwright');
(async()=>{
 const html=fs.readFileSync(__dirname+'/../index.html','utf8').replace('initMapSurface();if(!load())generate(',`const effects={saves:0,draws:0};const originalSave=save,originalDraw=drawWorld;save=function(){effects.saves++;return originalSave()};drawWorld=function(){effects.draws++;return originalDraw()};window.__SCHEDULE__={effects,advanceSimulationDay,scheduleAutosave,cancelAutosave,save,skipDays,setSpeed,get task(){return skipTask},stop(){clearInterval(timer);paused=true},get pending(){return !!pendingAutosave}};initMapSurface();if(!load())generate(`);
 const server=http.createServer((q,r)=>r.end(html)).listen(8199),browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
 const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:8199');await p.evaluate(()=>{__SCHEDULE__.stop();__EVERWORLD__.reset(1840)});
 await p.clock.install();
 // Playwright virtual timers do not drive the browser idle queue.
 await p.evaluate(()=>{window.requestIdleCallback=cb=>setTimeout(cb,0);window.cancelIdleCallback=clearTimeout;__SCHEDULE__.save()});
 const direct=await p.evaluate(()=>{const t=__SCHEDULE__;t.cancelAutosave();t.effects.saves=t.effects.draws=0;for(let i=0;i<14;i++)t.advanceSimulationDay();return {...t.effects,pending:t.pending,day:__EVERWORLD__.world().day}});
 assert.deepEqual(direct,{saves:0,draws:0,pending:true,day:15},'Simulation task must not paint or serialize');
 await p.clock.runFor(6100);assert.equal(await p.evaluate(()=>__SCHEDULE__.effects.saves),1,'Weekly requests must coalesce');
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('everworld_v28_human_needs')).day),15);
 await p.evaluate(()=>{__SCHEDULE__.scheduleAutosave();__EVERWORLD__.reset(7);__SCHEDULE__.save();__SCHEDULE__.effects.saves=0});await p.clock.runFor(6100);
 assert.equal(await p.evaluate(()=>__SCHEDULE__.effects.saves),0,'Reset/manual save must invalidate queued save');
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('everworld_v28_human_needs')).seed),7);
 await p.evaluate(()=>{__SCHEDULE__.setSpeed(24)});await p.clock.runFor(350);await p.evaluate(()=>__EVERWORLD__.pause());const day=await p.evaluate(()=>__EVERWORLD__.world().day);await p.clock.runFor(500);assert.equal(await p.evaluate(()=>__EVERWORLD__.world().day),day,'Pause must stop clock backlog');
 await p.evaluate(()=>{__SCHEDULE__.stop();window.skipFinished=false;__SCHEDULE__.skipDays(365).then(()=>window.skipFinished=true)});await p.clock.runFor(1);await p.evaluate(()=>{if(__SCHEDULE__.task)__SCHEDULE__.task.cancelled=true});await p.clock.runFor(30);
 assert.equal(await p.evaluate(()=>window.skipFinished),true);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('everworld_v28_human_needs')).day),await p.evaluate(()=>__EVERWORLD__.world().day),'Cancel must save a complete day');
 assert.deepEqual(errors,[]);console.log('PASS independent effects, coalesced saves, reset invalidation, pause, cancelled skip persistence');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
