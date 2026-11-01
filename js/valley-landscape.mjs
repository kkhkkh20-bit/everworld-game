import './valley-world-geometry.js?v=1';
import './valley-paths.js?v=2';
export function createLandscape(state){
  const geometry=globalThis.ValleyGeometry.createGeometry(state);
  const Paths=globalThis.ValleyPaths,{all}=Paths.prepare(state);
  const routeLine=(a,b)=>{const r=state.routes.find(r=>r.a===a.id&&r.b===b.id||r.a===b.id&&r.b===a.id);return r&&(r.waypoints||all.get(r.id??`${r.a}:${r.b}`));};
  const distanceToRoad=(x,z,a,b)=>{const line=routeLine(a,b);return line?Paths.pointDistance(x,z,line):geometry.distanceToRoad(x,z,a,b);};
  const crossings=(a,b)=>{const line=routeLine(a,b);return line?Paths.bridgeSpans(line,geometry):[];};
  const {bounds,hash,forestDensity,waterDistance,protectedGround}=geometry;
  const routes=state.routes.filter(r=>r.open).map(r=>({a:state.towns.find(t=>t.id===r.a),b:state.towns.find(t=>t.id===r.b)}));
  const trees=[[],[]],spacing=3.65;
  for(let ix=0,x=bounds.minX+3;x<bounds.maxX-3;x+=spacing,ix++)for(let iz=0,z=bounds.minZ+3;z<bounds.maxZ-3;z+=spacing,iz++){
    const tx=x+(hash(ix,iz,1)-.5)*spacing*.85,tz=z+(hash(ix,iz,2)-.5)*spacing*.85;
    if(hash(ix,iz,3)>forestDensity(tx,tz)||waterDistance(tx,tz)<3.3||protectedGround(tx,tz,1.5)||routes.some(r=>distanceToRoad(tx,tz,r.a,r.b)<3.6))continue;
    const type=hash(ix,iz,4)<.36?1:0;trees[type].push({x:tx,z:tz,angle:hash(ix,iz,5)*Math.PI*2,scale:1.6+hash(ix,iz,6)*.9,tint:type?'#b6c594':'#91b5a0'});
  }
  return {...geometry,trees,distanceToRoad,crossings};
}
