/* Pure path arithmetic. Compiled lengths stay outside serialized game state. */
(function(root){
'use strict';
if(root.ValleyPolyline){if(typeof module!=='undefined')module.exports=root.ValleyPolyline;return;}
const distance=(a,b)=>Math.hypot(b.x-a.x,b.z-a.z);
function compile(points){
  const lengths=new Float64Array(Math.max(0,points.length-1));let total=0;
  for(let i=1;i<points.length;i++){lengths[i-1]=distance(points[i-1],points[i]);total+=lengths[i-1];}
  return {points,lengths,total};
}
function length(points){let total=0;for(let i=1;i<points.length;i++)total+=distance(points[i-1],points[i]);return total;}
function position(course,d){
  const {points,lengths}=course;let left=Math.max(0,d);
  // Keep the original subtraction order, including floating point rounding.
  for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=lengths[i-1];if(left<=n||i===points.length-1){const u=n?Math.min(1,left/n):0;return {x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u,index:i-1};}left-=n;}
  return {...points[0],index:0};
}
function at(points,d){return position(compile(points),d);}
function samples(points,step=1){const c=compile(points),out=[];for(let d=0;d<c.total;d+=step)out.push({...position(c,d),distance:d});out.push({...points.at(-1),distance:c.total});return out;}
function pointDistance(x,z,points){let result=Infinity;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,u=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));result=Math.min(result,Math.hypot(x-a.x-dx*u,z-a.z-dz*u));}return result;}
const api={distance,compile,length,position,at,samples,pointDistance};root.ValleyPolyline=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
