// A single continent, derived from saved settlement positions without changing them.
export function createContinent(state,riverDistance){
  if(!state.regional)return null;
  const B=state.bounds,cx=(B.minX+B.maxX)/2,cz=(B.minZ+B.maxZ)/2,rx=(B.maxX-B.minX)*.455,rz=(B.maxZ-B.minZ)*.435;
  const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
  const towns=state.towns.map(t=>({x:t.x,z:t.z,r:t.id===0?23:41}));
  const fields=state.plots.map(p=>({x:p.x,z:p.z,r:10}));
  const routes=state.routes.map(r=>({a:state.towns.find(t=>t.id===r.a),b:state.towns.find(t=>t.id===r.b)}));
  function segment(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,u=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a.x-dx*u,z-a.z-dz*u);}
  function coastDistance(x,z){
    const nx=(x-cx)/rx,nz=(z-cz)/rz,angle=Math.atan2(nz,nx),radius=1+.055*Math.sin(angle*5+.5)+.035*Math.cos(angle*9-1);
    let d=(radius-Math.pow(Math.abs(nx)**3.5+Math.abs(nz)**3.5,1/3.5))*Math.min(rx,rz);
    for(const p of towns)if(Math.abs(x-p.x)<p.r+8&&Math.abs(z-p.z)<p.r+8)d=Math.max(d,p.r-Math.hypot(x-p.x,z-p.z));
    for(const p of fields)if(Math.abs(x-p.x)<18&&Math.abs(z-p.z)<18)d=Math.max(d,p.r-Math.hypot(x-p.x,z-p.z));
    // Existing roads remain on the same landmass, including older saved worlds.
    if(d<12)for(const {a,b}of routes){if(x<Math.min(a.x,b.x)-12||x>Math.max(a.x,b.x)+12||z<Math.min(a.z,b.z)-12||z>Math.max(a.z,b.z)+12)continue;d=Math.max(d,10-segment(x,z,a,b));}
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
    if(m>.1)for(const {a,b}of routes)flat=Math.min(flat,smooth((segment(x,z,a,b)-1.8)/8));
    y*=flat;return y*smooth(coast/7);
  }
  function color(x,z){const b=biome(x,z),y=height(x,z);return b==='ocean'?'#39849a':b==='beach'?'#caba8a':b==='desert'?'#c9a966':b==='mountain'?(y>35?'#d9ded8':y>12?'#84908c':'#748572'):b==='grassland'?'#84955d':'#294832';}
  const regions=[{name:'서녘 개척 해안',x:-290,z:14},{name:'서리등 산맥',x:-83,z:-162},{name:'호박빛 사막',x:167,z:42},{name:'남쪽 초원',x:-90,z:115},{name:'청송 대삼림',x:205,z:-73}];
  return {coastDistance,biome,mountain,dryness,forestDensity,height,color,regions};
}
