import assert from 'node:assert/strict';
import {createFrameLoop} from '../js/valley-runtime.js';
let next,paused=true,hidden=false,speed=3,steps=0,updates=0,saves=0,draws=0,time=0;
const loop=createFrameLoop({step:dt=>{assert.equal(dt,.1);steps++;},isPaused:()=>paused,getSpeed:()=>speed,isHidden:()=>hidden,update:()=>updates++,draw:()=>draws++,save:()=>saves++,mobile:()=>true,requestFrame:fn=>next=fn,now:()=>time});
function tick(t){time=t;next(t);}
loop.start();for(let t=10;t<=1000;t+=10)tick(t);assert.equal(steps,0,'paused time never advances the engine');assert.equal(updates,0);assert.equal(saves,0);
paused=false;for(let t=1010;t<=6010;t+=10)tick(t);assert.ok(steps>=59&&steps<=60,'3x keeps the same six game days per five wall seconds');assert.ok(updates>=11&&saves===1);const before=steps;hidden=true;for(let t=6020;t<10000;t+=10)tick(t);assert.equal(steps,before,'background tabs do not simulate');hidden=false;loop.reset();tick(30000);assert.equal(steps,before,'returning from a hidden tab does not catch up the hidden interval');
speed=8;for(let t=30010;t<=31000;t+=10)tick(t);assert.ok(steps-before>=31&&steps-before<=32);paused=true;const frozen=steps;tick(100000);assert.equal(steps,frozen);assert.equal(loop.stats().steps,steps);assert.ok(draws>0);loop.stop();tick(100010);assert.equal(steps,frozen);
console.log('PASS runtime: original speed/fixed step, pause, bounded catch-up, hidden tabs, presentation/save intervals and separate diagnostics');
