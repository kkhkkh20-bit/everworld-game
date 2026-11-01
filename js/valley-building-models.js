import * as THREE from 'three';
import { mergeGeometries } from '../assets/vendor/three/addons/utils/BufferGeometryUtils.js';

// Original low-poly architecture. Each template is merged into one colored mesh.
function builder() {
  const parts=[];
  function part(geometry,color,x=0,y=0,z=0,rotation=0){
    const g=geometry.index?geometry.toNonIndexed():geometry;
    if(g!==geometry)geometry.dispose();
    g.rotateY(rotation);g.translate(x,y,z);
    const c=new THREE.Color(color),colors=new Float32Array(g.attributes.position.count*3);
    for(let i=0;i<colors.length;i+=3){colors[i]=c.r;colors[i+1]=c.g;colors[i+2]=c.b;}
    g.setAttribute('color',new THREE.BufferAttribute(colors,3));parts.push(g);
  }
  const box=(w,h,d,color,x=0,y=h/2,z=0)=>part(new THREE.BoxGeometry(w,h,d),color,x,y,z);
  function roof(w,d,h,color,y){
    const a=[-w/2,0,-d/2],b=[w/2,0,-d/2],c=[0,h,-d/2],e=[-w/2,0,d/2],f=[w/2,0,d/2],g=[0,h,d/2];
    const vertices=[a,c,b,e,f,g,a,e,g,a,g,c,b,c,g,b,g,f,a,b,f,a,f,e].flat();
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(vertices.length/3*2),2));geometry.computeVertexNormals();part(geometry,color,0,y,0);
  }
  function finish(){const group=new THREE.Group(),g=mergeGeometries(parts,false);for(const p of parts)p.dispose();const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}));mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return group;}
  return {part,box,roof,finish};
}

export function installBuildingModels(models){
  for(const [name,level]of [['thatchHouse',0],['timberHouse',1],['stoneHouse',2],['stoneManor',3]]){
    const b=builder(),height=level===3?3.8:2.05,w=level===3?3.5:3,d=level===3?3.2:2.8;
    b.box(w+.35,.22,d+.35,'#8b8875');
    b.box(w,height,d,level===0?'#b89a64':level===1?'#866140':'#d7d3bc',0,height/2+.22);
    if(level===1){for(let y=.5;y<height;y+=.3)b.box(w+.04,.07,d+.04,'#725033',0,y,0);}
    if(level>=2){for(let y=.6;y<height;y+=.45){b.box(w+.025,.035,d+.025,'#b3ae98',0,y,0);}b.box(w+.2,.16,d+.2,'#b8b8a6',0,height+.2);}
    b.roof(w+.65,d+.65,level===0?1.35:1.1,level===0?'#d2b365':level===1?'#775342':level===2?'#ad6149':'#496d83',height+.25);
    if(level===0){for(const x of [-1.15,1.15])b.box(.13,2.5,.13,'#705133',x,1.25,1.47);for(let z=-1.5;z<1.6;z+=.45)b.box(.12,.08,.12,'#c6a252',0,height+1.6,z);}
    b.box(.7,1.35,.08,'#4c382a',0,.9,d/2+.025);b.box(.09,1.45,.12,'#84684b',-.4,.9,d/2+.04);b.box(.09,1.45,.12,'#84684b',.4,.9,d/2+.04);
    for(const x of [-1,1]){b.box(.48,.62,.1,level>=2?'#57757b':'#352e26',x,1.45,d/2+.07);b.box(.6,.08,.16,'#a1906d',x,1.08,d/2+.08);if(level===3)b.box(.48,.62,.1,'#59787b',x,2.9,d/2+.07);}
    if(level>=2)b.box(.45,1.3,.5,'#aaa795',-.8,height+.8,-.6);
    if(level===3){b.box(w+.2,.18,d+.2,'#b4ac92',0,2.25);b.box(1.4,.23,.65,'#b5ad91',0,.35,d/2+.3);b.box(1,.18,.45,'#c7c0a8',0,.15,d/2+.65);}
    models[name]=b.finish();
  }
  const workshop=builder();workshop.box(2.7,1.8,2.2,'#8a6544');workshop.roof(3.3,3,1.1,'#856044',1.85);workshop.box(1.8,.5,.65,'#aa8051',0,.35,1.65);workshop.box(.7,.4,.5,'#707c7d',.3,.8,1.65);models.woodWorkshop=workshop.finish();
  const mill=builder();mill.box(1.7,3.8,1.7,'#947349');mill.roof(2.2,2.2,.8,'#77513b',3.8);mill.box(.18,4.6,.15,'#c6ad75',0,3.1,1);mill.box(4.6,.18,.15,'#c6ad75',0,3.1,1.04);models.woodMill=mill.finish();
  for(const own of [false,true]){const flag=builder();flag.box(.09,2.8,.09,'#716345');flag.box(1,.67,.08,'#ffffff',.48,2.2,0);if(own){flag.part(new THREE.OctahedronGeometry(.18),'#ffffff',0,2.92);flag.box(.7,.2,.08,'#ffffff',.32,1.63,0);}models[own?'ownBanner':'townBanner']=flag.finish();}
  const plot=builder();for(const x of [-2.3,2.3])for(const z of [-2.3,2.3]){plot.box(.9,.06,.1,'#eed28d',x-Math.sign(x)*.4,.04,z);plot.box(.1,.06,.9,'#eed28d',x,.04,z-Math.sign(z)*.4);}models.ownPlot=plot.finish();
}

export function buildingAppearance(t,b){
  const tier=b.tier??0;
  if(b.type==='farm')return 'grain';
  if(b.type==='home')return ['thatchHouse','timberHouse','stoneHouse','stoneManor'][tier];
  if(b.type==='hall')return tier===0?'thatchHouse':tier===1?'timberHouse':tier===2?'stoneHouse':t.style==='castle'?'castle':'townhall';
  if(b.type==='workshop')return tier<2?'woodWorkshop':'lumbermill';
  if(b.type==='mill')return tier<2?'woodMill':'windmill';
  return 'market';
}
