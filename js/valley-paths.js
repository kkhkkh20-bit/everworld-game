/* Deterministic land routing, shared by the renderer and simulation. */
(function(root){
'use strict';
if(root.ValleyPaths){if(typeof module!=='undefined')module.exports=root.ValleyPaths;return;}
const Geometry=typeof module!=='undefined'?require('./valley-world-geometry.js'):root.ValleyGeometry;
const caches=new Map(),CELL=4;
const distance=(a,b)=>Math.hypot(b.x-a.x,b.z-a.z);
function length(points){let n=0;for(let i=1;i<points.length;i++)n+=distance(points[i-1],points[i]);return n;}
function at(points,d){let left=Math.max(0,d);for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=distance(a,b);if(left<=n||i===points.length-1){const u=n?Math.min(1,left/n):0;return {x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u,index:i-1};}left-=n;}return {...points[0],index:0};}
function samples(points,step=1){const total=length(points),out=[];for(let d=0;d<total;d+=step)out.push({...at(points,d),distance:d});out.push({...points.at(-1),distance:total});return out;}
function pointDistance(x,z,points){let result=Infinity;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,u=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));result=Math.min(result,Math.hypot(x-a.x-dx*u,z-a.z-dz*u));}return result;}
function bridgeSpans(points,g){const all=samples(points,1),spans=[];let start=null;
  for(let i=0;i<all.length;i++){const p=all[i],wet=g.waterDistance(p.x,p.z)<.8;if(wet&&start===null)start=Math.max(0,i-2);if(start!==null&&(!wet||i===all.length-1)){const end=Math.min(all.length-1,i+1),a=all[start],b=all[end],len=distance(a,b);if(len>2)spans.push({x:(a.x+b.x)/2,z:(a.z+b.z)/2,length:len,angle:Math.atan2(b.x-a.x,b.z-a.z),a:{x:a.x,z:a.z},b:{x:b.x,z:b.z},start:a.distance,end:b.distance,baseY:(Math.max(0,g.height(a.x,a.z))+Math.max(0,g.height(b.x,b.z)))/2+.04,rise:Math.max(0,g.height(b.x,b.z))-Math.max(0,g.height(a.x,a.z))});start=null;}}
  return spans;
}
class Heap{constructor(){this.data=[];this.serial=0;}push(index,score){const a=this.data,n={index,score,serial:this.serial++};a.push(n);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].score<n.score||a[p].score===n.score&&a[p].serial<n.serial)break;a[i]=a[p];i=p;}a[i]=n;}pop(){const a=this.data,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&(a[c+1].score<a[c].score||a[c+1].score===a[c].score&&a[c+1].serial<a[c].serial))c++;if(last.score<a[c].score||last.score===a[c].score&&last.serial<a[c].serial)break;a[i]=a[c];i=c;}a[i]=last;}return first?.index;}}
function navigation(state){
  const key=JSON.stringify([state.regional,state.bounds,state.towns.map(t=>[t.id,t.x,t.z,t.style]),state.plots.map(p=>[p.x,p.z])]);
  if(caches.has(key))return caches.get(key);
  const g=Geometry.createGeometry(state),B=g.bounds,W=Math.ceil((B.maxX-B.minX)/CELL)+1,H=Math.ceil((B.maxZ-B.minZ)/CELL)+1,N=W*H;
  const elevations=new Float32Array(N),water=new Uint8Array(N),land=new Uint8Array(N),routeCache=new Map();
  const pos=i=>({x:B.minX+(i%W)*CELL,z:B.minZ+Math.floor(i/W)*CELL});
  for(let i=0;i<N;i++){const p=pos(i),coast=g.island?g.island.coastDistance(p.x,p.z):100;land[i]=coast>2.5?1:0;water[i]=g.riverDistance(p.x,p.z)<.7?1:0;elevations[i]=water[i]?.65:g.height(p.x,p.z);}
  const node=p=>Math.max(0,Math.min(H-1,Math.round((p.z-B.minZ)/CELL)))*W+Math.max(0,Math.min(W-1,Math.round((p.x-B.minX)/CELL)));
  const edgeGrades=new Float32Array(N*8).fill(-1);
  const dirs=[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[-1,-1],[1,-1]];
  function search(a,b,grade,waterPrice,departureRange=0){
    const start=node(a),end=node(b),cost=new Float64Array(N).fill(Infinity),parents=new Int32Array(N).fill(-1),closed=new Uint8Array(N),heap=new Heap();cost[start]=0;heap.push(start,distance(a,b));
    while(heap.data.length){const i=heap.pop();if(closed[i])continue;if(i===end){const ids=[];for(let j=i;j!==-1;j=parents[j])ids.push(j);ids.reverse();return [a,...ids.slice(1,-1).map(pos),b];}closed[i]=1;const x=i%W,z=Math.floor(i/W),p=pos(i);
      for(let dir=0;dir<dirs.length;dir++){const[dx,dz]=dirs[dir],xx=x+dx,zz=z+dz;if(xx<0||xx>=W||zz<0||zz>=H)continue;const j=zz*W+xx;if(!land[j]||closed[j]||dx&&dz&&(!land[z*W+xx]||!land[zz*W+x]))continue;const d=CELL*Math.hypot(dx,dz);let slope=edgeGrades[i*8+dir];if(slope<0){slope=Math.abs(elevations[j]-elevations[i])/d;let prev=p;for(let k=1;k<=4;k++){const q={x:p.x+dx*CELL*k/4,z:p.z+dz*CELL*k/4};if(g.riverDistance(prev.x,prev.z)>.8&&g.riverDistance(q.x,q.z)>.8)slope=Math.max(slope,Math.abs(g.height(q.x,q.z)-g.height(prev.x,prev.z))/(d/4));prev=q;}edgeGrades[i*8+dir]=slope;}
        if(!water[i]&&!water[j]&&slope>grade&&(!departureRange||distance(p,a)>departureRange))continue;if(water[i]!==water[j]&&Math.max(elevations[i],elevations[j])>3.5)continue;
        const wet=water[i]||water[j],h=Math.max(elevations[j],0),turn=parents[i]<0?0:((i-parents[i])===(j-i)?0:.12),variation=1+.025*Math.sin(xx*.37+zz*.23);
        const step=d*(wet?waterPrice:1+slope*slope*45+h*.035+turn)*variation,next=cost[i]+step;
        if(next>=cost[j])continue;cost[j]=next;parents[j]=i;heap.push(j,next+distance(pos(j),b)*.7);
      }
    }return null;
  }
  function valid(points,grade=.75){const all=samples(points,1);for(let i=1;i<all.length;i++){const a=all[i-1],b=all[i];if(g.island&&g.island.coastDistance(b.x,b.z)<1.2)return false;if(g.riverDistance(a.x,a.z)>.8&&g.riverDistance(b.x,b.z)>.8&&Math.abs(g.height(a.x,a.z)-g.height(b.x,b.z))/Math.max(.01,distance(a,b))>grade)return false;}return true;}
  function finish(raw){
    const bridges=bridgeSpans(raw,g),dense=samples(raw,1.5),straight=[];let index=0;
    for(const p of dense){while(index<bridges.length&&p.distance>bridges[index].end){straight.push(bridges[index].b);index++;}const span=bridges[index];if(span&&p.distance>=span.start&&p.distance<=span.end){if(!straight.length||distance(straight.at(-1),span.a)>.01)straight.push(span.a);continue;}straight.push({x:p.x,z:p.z});}
    while(index<bridges.length)straight.push(bridges[index++].b);
    const clean=straight.filter((p,i)=>!i||distance(straight[i-1],p)>.01),reduced=[clean[0]];
    for(let i=1;i<clean.length-1;i++){const a=reduced.at(-1),b=clean[i],c=clean[i+1],cross=(b.x-a.x)*(c.z-b.z)-(b.z-a.z)*(c.x-b.x);if(Math.abs(cross)>.025||distance(a,b)>10)reduced.push(b);}reduced.push(clean.at(-1));
    const rounded=[reduced[0]];for(let i=1;i<reduced.length-1;i++){const a=reduced[i-1],b=reduced[i],c=reduced[i+1];if(g.waterDistance(b.x,b.z)<3){rounded.push(b);continue;}rounded.push({x:b.x+(a.x-b.x)*.18,z:b.z+(a.z-b.z)*.18},{x:b.x+(c.x-b.x)*.18,z:b.z+(c.z-b.z)*.18});}rounded.push(reduced.at(-1));
    return valid(rounded)?rounded:valid(reduced)?reduced:raw;
  }
  function plan(from,to){
    // Canonical direction keeps inspection/cache order from changing future movement.
    const reverse=from.x>to.x||from.x===to.x&&from.z>to.z,a=reverse?to:from,b=reverse?from:to,key=[a.x,a.z,b.x,b.z].join(':');
    let points=routeCache.get(key);
    if(!points){let raw=search(a,b,.38,9)||search(a,b,.6,15);if(!raw)return null;points=finish(raw);if(bridgeSpans(points,g).some(b=>b.length>55)){raw=search(a,b,.6,35);if(raw)points=finish(raw);}routeCache.set(key,points);}
    return (reverse?points.slice().reverse():points).map(p=>({...p}));
  }
  // Saved carts can start on a ridge formerly flattened by a straight road.
  // Permit their departure only; newly built roads retain the normal slope limit.
  function rejoin(a,b){const raw=search(a,b,.6,15,36)||search(a,b,.6,15,64);return raw?finish(raw).map(p=>({x:p.x,z:p.z})):null;}
  const result={g,plan,rejoin};caches.set(key,result);if(caches.size>4)caches.delete(caches.keys().next().value);return result;
}
const depot=t=>({x:t.x,z:t.z+4.4});
function prepare(state){const nav=navigation(state),all=new Map();for(const r of state.routes){const a=state.towns.find(t=>t.id===r.a),b=state.towns.find(t=>t.id===r.b);if(!a||!b)continue;const points=r.alignment===1&&r.waypoints?.length>1?r.waypoints:nav.plan(depot(a),depot(b));if(points){all.set(r.id??`${r.a}:${r.b}`,points);}}return {nav,all};}
function enable(state){const {all}=prepare(state);for(const r of state.routes){const points=all.get(r.id??`${r.a}:${r.b}`);if(points){if(r.alignment!==1||!r.waypoints?.length){r.waypoints=points;r.alignment=1;}r.length=length(points);}}return state;}
function between(state,a,b){return navigation(state).plan(a,b);}
function rejoin(state,a,b){return navigation(state).rejoin(a,b);}
function routePoints(state,a,b){const r=state.routes.find(r=>r.a===a&&r.b===b||r.a===b&&r.b===a);if(!r)return null;const points=r.waypoints||prepare(state).all.get(r.id??`${r.a}:${r.b}`);return points?(r.a===a?points:points.slice().reverse()):null;}
function course(state,path){const points=[],ends=[];let total=0;for(let i=1;i<path.length;i++){const a=typeof path[i-1]==='object'?path[i-1]:depot(state.towns.find(t=>t.id===path[i-1])),b=typeof path[i]==='object'?path[i]:depot(state.towns.find(t=>t.id===path[i]));const leg=typeof path[i-1]==='number'&&typeof path[i]==='number'?routePoints(state,path[i-1],path[i]):a.rejoin||between(state,a,b);if(!leg)return null;total+=length(leg);ends.push(total);points.push(...leg.slice(i===1?0:1));}return {points,ends,total};}
const api={enable,prepare,between,rejoin,routePoints,course,depot,length,at,samples,pointDistance,bridgeSpans};root.ValleyPaths=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
