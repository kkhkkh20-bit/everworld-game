/* Shared terrain geometry for simulation and rendering. No economy or RNG mutations. */
(function(root){
'use strict';
if(root.ValleyGeometry){if(typeof module!=='undefined')module.exports=root.ValleyGeometry;return;}
// A single continent, derived from saved settlement positions without changing them.
function createContinent(state,riverDistance){
  if(!state.regional)return null;
  const B=state.bounds,cx=(B.minX+B.maxX)/2,cz=(B.minZ+B.maxZ)/2,rx=(B.maxX-B.minX)*.455,rz=(B.maxZ-B.minZ)*.435;
  const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
  const towns=state.towns.map(t=>({x:t.x,z:t.z,r:t.id===0?23:41}));
  const fields=state.plots.map(p=>({x:p.x,z:p.z,r:10}));
  function coastDistance(x,z){
    const nx=(x-cx)/rx,nz=(z-cz)/rz,angle=Math.atan2(nz,nx),radius=1+.055*Math.sin(angle*5+.5)+.035*Math.cos(angle*9-1);
    let d=(radius-Math.pow(Math.abs(nx)**3.5+Math.abs(nz)**3.5,1/3.5))*Math.min(rx,rz);
    for(const p of towns)if(Math.abs(x-p.x)<p.r+8&&Math.abs(z-p.z)<p.r+8)d=Math.max(d,p.r-Math.hypot(x-p.x,z-p.z));
    for(const p of fields)if(Math.abs(x-p.x)<18&&Math.abs(z-p.z)<18)d=Math.max(d,p.r-Math.hypot(x-p.x,z-p.z));
    return d;
  }
  function mountain(x,z){
    const north=Math.exp(-Math.pow((z-(-125+x*.32+12*Math.sin(x*.018)))/25,2))*smooth((x+235)/40)*smooth((140-x)/40);
    const east=Math.exp(-Math.pow((x-(105+z*.2))/23,2))*smooth((z+235)/35)*smooth((40-z)/40);
    const south=Math.exp(-Math.pow((z-(174+12*Math.sin(x*.035)))/19,2))*smooth((x+125)/35)*smooth((110-x)/35);
    return Math.max(north,east,south);
  }
  const dryness=(x,z)=>Math.max(0,1-((x-166)/116)**2-((z-43)/106)**2);
  function biome(x,z){const coast=coastDistance(x,z);if(coast<0)return 'ocean';if(coast<7)return 'beach';if(mountain(x,z)>.42)return 'mountain';if(dryness(x,z)>.12&&riverDistance(x,z)>7)return 'desert';if((z>70&&x<80&&x>-215)||Math.sin(x*.012+z*.006)>.76)return 'grassland';return 'forest';}
  function forestDensity(x,z){const b=biome(x,z);return b==='forest'?.92:b==='grassland'?.22:b==='mountain'?.035:0;}
  function height(x,z){
    const coast=coastDistance(x,z);if(coast<0)return Math.max(-14,coast*.18);
    let y=.25+(Math.sin(x*.046)*Math.cos(z*.053)+Math.sin((x+z)*.025))*.35;
    const m=mountain(x,z);y+=m*m*(43+9*Math.sin(x*.17)*Math.cos(z*.14));
    if(dryness(x,z)>.12&&m<.4)y+=dryness(x,z)*(3.5+Math.sin(x*.09+z*.06)*2.8);
    let flat=1;for(const p of towns)flat=Math.min(flat,smooth((Math.hypot(x-p.x,z-p.z)-23)/17));
    for(const p of fields)flat=Math.min(flat,smooth((Math.hypot(x-p.x,z-p.z)-6)/8));
    y*=flat;return y*smooth(coast/7);
  }
  function color(x,z){const b=biome(x,z),y=height(x,z);return b==='ocean'?'#39849a':b==='beach'?'#caba8a':b==='desert'?'#c9a966':b==='mountain'?(y>35?'#d9ded8':y>12?'#84908c':'#748572'):b==='grassland'?'#84955d':'#294832';}
  const regions=[{name:'서녘 개척 해안',x:-290,z:14},{name:'서리등 산맥',x:-83,z:-162},{name:'호박빛 사막',x:167,z:42},{name:'남쪽 초원',x:-90,z:115},{name:'청송 대삼림',x:205,z:-73}];
  return {coastDistance,biome,mountain,dryness,forestDensity,height,color,regions};
}

function createGeometry(state) {
  const bounds=state.bounds||{minX:-115,maxX:115,minZ:-98,maxZ:98};
  const hash=(x,z,salt=0)=>{const n=Math.sin(x*127.1+z*311.7+salt*74.7+(state.seed||1)*.00013)*43758.5453;return n-Math.floor(n);};
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  const clearings=state.towns.map(t=>({x:t.x,z:t.z,r:t.id===0?10:18,anchorX:t.x,anchorZ:t.z}));
  const plotFootprints=state.plots.map(p=>{const near=[...state.towns].sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];return {x:p.x,z:p.z,r:5.5,anchorX:near.x,anchorZ:near.z};});
  // Reserve normal automatic building plots so rivers stay fixed as villages grow.
  const obstacles=[...state.towns.map(t=>({x:t.x,z:t.z,r:t.id===0?23:26,anchorX:t.x,anchorZ:t.z})),...plotFootprints];
  const footprints=[...state.towns.filter(t=>t.water).map(t=>({x:t.water.source.x,z:t.water.source.z,r:3})),...clearings,...plotFootprints,...state.towns.flatMap(t=>[{x:t.x+14,z:t.z-8,r:3.5},{x:t.x+11,z:t.z+12,r:3.5},...t.buildings.map(b=>({x:t.x+b.x,z:t.z+b.z,r:b.type==='hall'?6:4.5}))])];
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
  function protectedGround(x,z,canopy=0){return footprints.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+canopy);}
  return {bounds,channels,main,sample,island,riverDistance,waterDistance,height,hash,forestDensity,protectedGround,distanceToRoad};
}

const api={createGeometry,createContinent};root.ValleyGeometry=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
