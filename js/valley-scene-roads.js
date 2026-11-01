import * as THREE from 'three';
import {mergeGeometries} from '../assets/vendor/three/addons/utils/BufferGeometryUtils.js';
import {spatialGeometry} from './valley-scene-geometry.js?v=1';

export function createRoadLayer(scene,landscape,object,Paths){
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}),bridges=new THREE.Group(),spans=[];
  scene.add(bridges);
  const cache=new Map(),meshes=new Map(),metrics={builds:0,merges:0,chunkBuilds:0,bridgeBuilds:0};let activeKey='',bridgeKey='';
  function ribbon(line,width,tier=1){
    const path=Paths.samples(line,1),bands=[-1.35,-1,-.54,-.29,.29,.54,1,1.35],positions=[],colors=[],indices=[],ground=new THREE.Color(),dirt=new THREE.Color();
    for(let i=0;i<path.length;i++){
      const p=path[i],a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)],d=Math.hypot(b.x-a.x,b.z-a.z)||1,nx=-(b.z-a.z)/d,nz=(b.x-a.x)/d,shade=.94+landscape.hash(Math.floor(p.x*1.2),Math.floor(p.z*1.2),23)*.12;
      for(let k=0;k<bands.length;k++){
        const x=p.x+nx*bands[k]*width,z=p.z+nz*bands[k]*width,edge=k===0||k===bands.length-1;
        const c=edge?ground.set(landscape.island?landscape.island.color(x,z):'#536c3b'):dirt.set(tier>=2?(k===2||k===5?'#898678':tier===3?'#b8b29e':'#a29d88'):(k===2||k===5?'#80664a':'#92744f')).multiplyScalar(shade);
        positions.push(x,landscape.height(x,z)+.07,z);colors.push(c.r,c.g,c.b);
      }
      if(!i||landscape.waterDistance((path[i-1].x+p.x)/2,(path[i-1].z+p.z)/2)<.8)continue;
      for(let k=0;k<bands.length-1;k++){const a=(i-1)*bands.length+k,b=i*bands.length+k;indices.push(a,a+1,b,a+1,b+1,b);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();metrics.builds++;return g;
  }
  function entry(key,signature,line,width,tier=1){
    let item=cache.get(key);
    if(!item||item.signature!==signature||item.width!==width){
      for(const part of item?.parts||[])part.dispose();
      const source=ribbon(line,width,tier),parts=spatialGeometry([source]);source.dispose();
      item={signature,width,parts,serial:metrics.builds};cache.set(key,item);
    }
    return item;
  }
  function mergeChangedChunks(active){
    const buckets=new Map();
    for(const [key]of active){const item=cache.get(key);for(const part of item.parts){const key=part.userData.chunkKey;if(!buckets.has(key))buckets.set(key,{parts:[],ids:[]});const bucket=buckets.get(key);bucket.parts.push(part);bucket.ids.push(item.serial);}}
    for(const [key,bucket]of buckets){
      const signature=bucket.ids.join(':');if(meshes.get(key)?.signature===signature)continue;
      const old=meshes.get(key)?.mesh;if(old){scene.remove(old);old.geometry.dispose();}
      const mesh=new THREE.Mesh(mergeGeometries(bucket.parts,false),material);mesh.receiveShadow=true;mesh.matrixAutoUpdate=false;mesh.geometry.computeBoundingSphere();scene.add(mesh);meshes.set(key,{mesh,signature});metrics.chunkBuilds++;
    }
    for(const [key,{mesh}]of meshes)if(!buckets.has(key)){scene.remove(mesh);mesh.geometry.dispose();meshes.delete(key);}
    metrics.merges++;
  }
  function update(state){
    const active=[],routes=[];let changed=false;
    for(const r of state.routes){if(!r.open)continue;const line=Paths.routePoints(state,r.a,r.b);if(!line)continue;const key='route:'+(r.id??r.a+':'+r.b),signature=line;const item=entry(key,signature,line,window.ValleyCommerce.tiers[window.ValleyCommerce.stage(r)].width,window.ValleyCommerce.stage(r));active.push([key,item.serial]);routes.push({r,line,item});}
    for(const t of state.towns)for(const b of t.buildings){if(b.type==='well'&&t.water?.source.path?.length>1)continue;const key='entry:'+t.id+':'+b.id,line=b.type==='well'&&t.water?.source.path?.length>1?t.water.source.path:[Paths.depot(t),{x:t.x+b.x,z:t.z+4.4},{x:t.x+b.x,z:t.z+b.z+3.4}],signature=JSON.stringify(line);const item=entry(key,signature,line,.36);active.push([key,item.serial]);}
    for(const t of state.towns){const line=t.water?.source.path;if(line?.length>1){const key='water:'+t.id,item=entry(key,JSON.stringify(line),line,.18);active.push([key,item.serial]);}}
    const key=JSON.stringify(active);
    if(key!==activeKey){activeKey=key;mergeChangedChunks(active);changed=true;}
    const nextBridgeKey=JSON.stringify(routes.map(({r,item})=>[r.id,item.serial]));
    if(nextBridgeKey!==bridgeKey){bridgeKey=nextBridgeKey;bridges.clear();spans.length=0;for(const {line,r}of routes)for(const span of Paths.bridgeSpans(line,landscape)){if(r.level===0&&span.length<=10)continue;const bridge=object('bridge_A',8);bridge.children[0].position.y=0;bridge.scale.set(.65,1,span.length/8);bridge.position.set(span.x,span.baseY,span.z);bridge.rotation.y=span.angle;bridge.rotateX(-Math.atan2(span.rise,span.length));bridge.updateMatrix();bridge.matrixAutoUpdate=false;bridges.add(bridge);spans.push(span);metrics.bridgeBuilds++;}changed=true;}
    const retained=new Set(active.map(([key])=>key));for(const [key,item]of cache)if(!retained.has(key)){for(const part of item.parts)part.dispose();cache.delete(key);}
    return changed;
  }
  return {material,spans,update,stats:()=>({...metrics,meshes:meshes.size})};
}
