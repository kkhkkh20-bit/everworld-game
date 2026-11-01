import { createContinent } from './valley-geography.mjs?v=1';
// Decorative geography only: no simulation RNG, stock, population or route mutations.
export function createLandscape(state) {
  const bounds=state.bounds||{minX:-115,maxX:115,minZ:-98,maxZ:98};
  const hash=(x,z,salt=0)=>{const n=Math.sin(x*127.1+z*311.7+salt*74.7+(state.seed||1)*.00013)*43758.5453;return n-Math.floor(n);};
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  const routes=state.routes.filter(r=>r.open).map(r=>({a:state.towns.find(t=>t.id===r.a),b:state.towns.find(t=>t.id===r.b)}));
  const clearings=state.towns.map(t=>({x:t.x,z:t.z,r:t.id===0?10:18,anchorX:t.x,anchorZ:t.z}));
  const obstacles=[...clearings,...state.plots.map(p=>{const near=[...state.towns].sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];return {x:p.x,z:p.z,r:5.5,anchorX:near.x,anchorZ:near.z};}),...state.towns.flatMap(t=>[{x:t.x+14,z:t.z-8,r:3.5,anchorX:t.x,anchorZ:t.z},{x:t.x+11,z:t.z+12,r:3.5,anchorX:t.x,anchorZ:t.z},...t.buildings.map(b=>({x:t.x+b.x,z:t.z+b.z,r:b.type==='hall'?6:4.5,anchorX:t.x,anchorZ:t.z}))])];
  function constrained(axis,at,center,half,raw){
    for(const candidate of [half,half*.85,half*.65,half*.45,half*.3,1.5]){let low=-Infinity,high=Infinity;
      for(const o of obstacles){const along=axis==='z'?o.z:o.x,perp=axis==='z'?o.x:o.z,d=Math.abs(along-at),radius=o.r+candidate+2;if(d>=radius)continue;const clearance=Math.sqrt(radius*radius-d*d),anchorAlong=axis==='z'?o.anchorZ:o.anchorX,anchorPerp=axis==='z'?o.anchorX:o.anchorZ;if(anchorPerp<raw(anchorAlong))low=Math.max(low,perp+clearance);else high=Math.min(high,perp-clearance);}
      if(low<=high)return {center:Math.max(low,Math.min(high,center)),half:candidate};
    }
    return {center,half:1.5};
  }
  function channel(id,axis,min,max,raw,halfAt){const samples=[],step=1.5;
    for(let at=min;at<max+.001;at+=step){const {center,half}=constrained(axis,at,raw(at),halfAt(at),raw);samples.push({x:axis==='z'?center:at,z:axis==='z'?at:center,half});}
    if(samples.at(-1)[axis]<max-.01){const {center,half}=constrained(axis,max,raw(max),halfAt(max),raw);samples.push({x:axis==='z'?center:max,z:axis==='z'?max:center,half});}
    // Smooth the corridor without consuming the world's random sequence.
    for(let pass=0;pass<2;pass++){const previous=samples.map(p=>({...p}));for(let i=1;i<samples.length-1;i++){const key=axis==='z'?'x':'z';samples[i][key]=(previous[i-1][key]+previous[i][key]*2+previous[i+1][key])/4;samples[i].half=Math.min(previous[i].half,(previous[i-1].half+previous[i].half*2+previous[i+1].half)/4);}}
    for(const p of samples){const at=p[axis],key=axis==='z'?'x':'z',safe=constrained(axis,at,p[key],p.half,raw);p[key]=safe.center;p.half=safe.half;}
    for(let i=0;i<samples.length;i++){const a=samples[Math.max(0,i-1)],b=samples[Math.min(samples.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1;samples[i].nx=dz/len;samples[i].nz=-dx/len;}
    const maxHalf=Math.max(...samples.map(p=>p.half)),box={minX:Math.min(...samples.map(p=>p.x))-maxHalf,maxX:Math.max(...samples.map(p=>p.x))+maxHalf,minZ:Math.min(...samples.map(p=>p.z))-maxHalf,maxZ:Math.max(...samples.map(p=>p.z))+maxHalf};return {id,axis,min,max,step,samples,maxHalf,box};
  }
  function sample(c,at){const index=Math.max(0,Math.min(c.samples.length-2,Math.floor((at-c.min)/c.step))),a=c.samples[index],b=c.samples[index+1],t=Math.max(0,Math.min(1,(at-a[c.axis])/(b[c.axis]-a[c.axis]||1)));return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,half:a.half+(b.half-a.half)*t,nx:a.nx+(b.nx-a.nx)*t,nz:a.nz+(b.nz-a.nz)*t};}
  const main=channel('main','z',bounds.minZ,bounds.maxZ,z=>34+Math.sin(z*.018)*10+Math.sin(z*.044)*3,z=>13.5+Math.sin(z*.021)*2.2);
  const channels=[main];
  function spline(points,x){let i=0;while(i<points.length-2&&x>points[i+1][0])i++;const a=points[i],b=points[i+1],p=points[Math.max(0,i-1)],q=points[Math.min(points.length-1,i+2)],h=b[0]-a[0],u=Math.max(0,Math.min(1,(x-a[0])/h)),u2=u*u,u3=u2*u,m0=(b[1]-p[1])/(b[0]-p[0]),m1=(q[1]-a[1])/(q[0]-a[0]);return (2*u3-3*u2+1)*a[1]+(u3-2*u2+u)*h*m0+(-2*u3+3*u2)*b[1]+(u3-u2)*h*m1;}
  if(state.regional)for(const port of state.towns.filter(t=>t.style==='port'&&Math.abs(t.x-34)>100)){
    const left=port.x<34,joinZ=port.z+(port.z<0?62:-57),join=sample(main,joinZ),sourceX=left?bounds.minX+3:bounds.maxX-3,dir=left?1:-1;
    const points=[[sourceX,port.z-16],[port.x-dir*44,port.z+26],[port.x,port.z+19],[port.x+dir*55,port.z+(port.z<0?40:-16)],[join.x,joinZ]].sort((a,b)=>a[0]-b[0]);
    channels.push(channel('tributary-'+port.id,'x',points[0][0],points.at(-1)[0],x=>spline(points,x),x=>3.6+Math.sin(x*.035+port.id)*.7));
  }
  function riverDistance(x,z){let distance=Infinity;
    for(const c of channels){if(x<c.box.minX||x>c.box.maxX||z<c.box.minZ||z>c.box.maxZ)continue;const at=c.axis==='z'?z:x;if(at<c.min||at>c.max)continue;const center=Math.floor((at-c.min)/c.step),range=Math.ceil(c.maxHalf/c.step)+2;
      for(let i=Math.max(0,center-range);i<Math.min(c.samples.length-1,center+range+1);i++){const a=c.samples[i],b=c.samples[i+1],dx=b.x-a.x,dz=b.z-a.z,u=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1))),half=a.half+(b.half-a.half)*u;distance=Math.min(distance,Math.hypot(x-a.x-dx*u,z-a.z-dz*u)-half);}
    }return distance;
  }
  const island=createContinent(state,riverDistance);
  function waterDistance(x,z){return Math.min(riverDistance(x,z),island?island.coastDistance(x,z):Infinity);}
  function height(x,z){if(island){const water=riverDistance(x,z);if(water<0&&island.coastDistance(x,z)>0)return -.8-Math.min(1,-water*.07);const y=island.height(x,z);return water<4&&water>=0?y*smooth(water/4):y;}let y=(Math.sin(x*.046)*Math.cos(z*.053)+Math.sin((x+z)*.025))*.55;for(const t of clearings){const d=Math.hypot(x-t.x,z-t.z);if(d<20)y*=smooth((d-13)/7);}const water=waterDistance(x,z);if(water<0)return -.8-Math.min(1,-water*.07);if(water<4)y=-.06+(y+.06)*smooth(water/4);return y;}
  function distanceToRoad(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,k=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a.x-dx*k,z-a.z-dz*k);}
  function forestDensity(x,z){if(island)return island.forestDensity(x,z);return Math.max(.6,Math.min(.99,.83+Math.sin(x*.019+Math.sin(z*.014)*2)*.1+Math.cos(z*.026-x*.009)*.08));}
  function protectedGround(x,z,canopy=0){return obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+canopy);}
  const trees=[[],[]],spacing=3.65;
  for(let ix=0,x=bounds.minX+3;x<bounds.maxX-3;x+=spacing,ix++)for(let iz=0,z=bounds.minZ+3;z<bounds.maxZ-3;z+=spacing,iz++){
    const tx=x+(hash(ix,iz,1)-.5)*spacing*.85,tz=z+(hash(ix,iz,2)-.5)*spacing*.85;
    if(hash(ix,iz,3)>forestDensity(tx,tz)||waterDistance(tx,tz)<3.3||protectedGround(tx,tz,1.5)||routes.some(r=>distanceToRoad(tx,tz,r.a,r.b)<3.6))continue;
    const type=hash(ix,iz,4)<.36?1:0;trees[type].push({x:tx,z:tz,angle:hash(ix,iz,5)*Math.PI*2,scale:1.6+hash(ix,iz,6)*.9,tint:type?'#b6c594':'#91b5a0'});
  }
  function crossings(a,b){const length=Math.hypot(b.x-a.x,b.z-a.z),n=Math.max(2,Math.ceil(length)),result=[];let start=null;
    for(let i=0;i<=n;i++){const k=i/n,x=a.x+(b.x-a.x)*k,z=a.z+(b.z-a.z)*k,wet=waterDistance(x,z)<.8;
      if(wet&&start===null)start=Math.max(0,(i-1)/n);if(start!==null&&(!wet||i===n)){const end=Math.min(1,(i+1)/n),middle=(start+end)/2;result.push({x:a.x+(b.x-a.x)*middle,z:a.z+(b.z-a.z)*middle,length:(end-start)*length+3,angle:Math.atan2(b.x-a.x,b.z-a.z)});start=null;}}
    return result;
  }
  return {bounds,channels,main,sample,island,riverDistance,waterDistance,height,hash,forestDensity,protectedGround,trees,crossings,distanceToRoad};
}
