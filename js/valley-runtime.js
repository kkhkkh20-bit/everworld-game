// Browser scheduling only. The engine remains synchronous and DOM independent.
export function createFrameLoop({step,isPaused,getSpeed,isHidden,update,draw,save,mobile,requestFrame=requestAnimationFrame,now=()=>performance.now()}){
  let last=0,accumulator=0,renderTime=0,saveTime=0,lastDraw=0,running=false;
  const metrics={steps:0,simulationMs:0,presentationMs:0,drawMs:0,saveMs:0};
  function measured(key,fn){const start=now();try{return fn();}finally{metrics[key]+=now()-start;}}
  function tick(t){
    if(!running)return;if(!last)last=t;const dt=Math.min(.15,(t-last)/1000);last=t;
    if(!isHidden()){
      let progressed=false;
      if(!isPaused()){
        accumulator+=dt*getSpeed()/2.5;
        measured('simulationMs',()=>{while(accumulator>=.1){step(.1);accumulator-=.1;metrics.steps++;progressed=true;}});
        renderTime+=dt;saveTime+=dt;
        if(renderTime>.4){measured('presentationMs',update);renderTime=0;}
        if(saveTime>4){measured('saveMs',save);saveTime=0;}
      }
      if(t-lastDraw>(mobile()?33:22)){measured('drawMs',()=>draw(progressed));lastDraw=t;}else if(progressed)draw(true,true);
    }
    requestFrame(tick);
  }
  return {start(){if(!running){running=true;requestFrame(tick);}},stop(){running=false;},reset(){last=0;accumulator=0;},stats:()=>({...metrics})};
}
