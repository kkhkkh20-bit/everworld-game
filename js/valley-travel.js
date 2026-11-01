/* Compiled travel geometry is transient; saves contain only real paths and cargo. */
(function(root){
'use strict';
function createTravelCache(Paths){
  const states=new WeakMap(),objects=new WeakMap(),lines=new WeakMap();
  function course(state,path){
    if(path.some(p=>typeof p==='object')){let c=objects.get(path);if(!c){c=Paths.course(state,path);if(c)objects.set(path,c);}return c;}
    let cache=states.get(state);
    if(!cache||cache.routes!==state.routes||cache.count!==state.routes.length){cache={routes:state.routes,count:state.routes.length,paths:new Map()};states.set(state,cache);}
    const key=path.join(':'),old=cache.paths.get(key);
    if(old&&old.refs.every(({route,points,a,b})=>route.waypoints===points&&route.a===a&&route.b===b&&state.routes.includes(route)))return old.course;
    const c=Paths.course(state,path);if(!c)return null;
    const refs=path.slice(1).map((b,i)=>{const a=path[i],route=state.routes.find(r=>r.a===a&&r.b===b||r.a===b&&r.b===a);return {route,points:route.waypoints,a:route.a,b:route.b};});
    cache.paths.set(key,{course:c,refs});return c;
  }
  function line(points){let c=lines.get(points);if(!c){c=Paths.compile(points);lines.set(points,c);}return c;}
  return {course,line};
}
const api={createTravelCache};root.ValleyTravel=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
