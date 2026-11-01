/* Natural freshwater access. The coast is never a drinking-water source. */
(function(root){
'use strict';
const G=typeof module!=='undefined'?require('./valley-world-geometry.js'):root.ValleyGeometry;
const P=typeof module!=='undefined'?require('./valley-paths.js'):root.ValleyPaths;
const names={main:'큰강','western-creek':'서녘 개울'};
function landPath(points,g){
  for(const p of P.samples(points,2))if(g.waterDistance(p.x,p.z)<.1||g.height(p.x,p.z)>12)return false;
  return true;
}
function source(state,t,g=G.createGeometry(state)){
  const candidates=[];
  for(const channel of g.channels)for(let i=0;i<channel.samples.length;i+=3){
    const p=channel.samples[i];if(g.island&&g.island.coastDistance(p.x,p.z)<6)continue;
    for(const side of [-1,1]){
      const bank={x:p.x+p.nx*(p.half+4.2)*side,z:p.z+p.nz*(p.half+4.2)*side};
      if(g.waterDistance(bank.x,bank.z)<.3||g.height(bank.x,bank.z)>6)continue;
      candidates.push({bank,water:{x:p.x,z:p.z},channel:channel.id,half:p.half,d:Math.hypot(bank.x-t.x,bank.z-t.z)});
    }
  }
  const score=c=>c.d+Math.max(0,t.pop*.23-Math.max(5,c.half*3.5))*12;
  candidates.sort((a,b)=>score(a)-score(b));
  for(const c of candidates.slice(0,24)){
    const origin=P.depot(t),direct=[origin,c.bank];let path=direct;
    if(!landPath(direct,g)){path=P.between(state,origin,c.bank);if(!path||!landPath(path,g))continue;}
    return {version:2,kind:'river',name:names[c.channel]||'지류',channel:c.channel,x:c.bank.x,z:c.bank.z,water:c.water,path,distance:P.length(path),yield:Math.max(5,c.half*3.5),small:c.half<4};
  }
  return {version:2,kind:'none',name:'접근할 담수 없음',x:t.x,z:t.z,path:[],distance:Infinity,yield:0};
}
function enable(state){
  if(state.towns.every(t=>t.water?.source?.version===2))return state;
  const g=G.createGeometry(state);
  for(const t of state.towns)if(t.water&&t.water.source?.version!==2){t.water.source=source(state,t,g);t.water.version=2;}
  return state;
}
const api={source,enable};root.ValleyHydrology=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
