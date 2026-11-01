import * as THREE from 'three';

// Distant trees keep the asset's bounds, palette, tint and placement.
// Close views use the original model; the overview uses a ten-triangle crown.
function overviewCrown(source){
  source.computeBoundingBox();const box=source.boundingBox,size=box.getSize(new THREE.Vector3()),p=source.attributes.position,uv=source.attributes.uv;
  let top=0;for(let i=1;i<p.count;i++)if(p.getY(i)>p.getY(top))top=i;
  const geometry=new THREE.ConeGeometry(Math.max(size.x,size.z)/2,size.y*.9,5);
  geometry.translate((box.min.x+box.max.x)/2,box.min.y+size.y*.55,(box.min.z+box.max.z)/2);
  if(uv){const attr=geometry.attributes.uv;for(let i=0;i<attr.count;i++)attr.setXY(i,uv.getX(top),uv.getY(top));}
  return geometry;
}
export function createForestLayer(scene,landscape,object){
  const records=[],lods=[];let overview=false,roadSignature='';
  function add(name,placements,clearable=false){
    const normalized=object(name,2.5);normalized.updateMatrixWorld(true);const chunks=new Map();
    for(const p of placements){const key=clearable?Math.floor(p.x/32)+':'+Math.floor(p.z/32):placements.length>2000?Math.floor(p.x/64)+':'+Math.floor(p.z/64):'all';if(!chunks.has(key))chunks.set(key,[]);chunks.get(key).push(p);}
    normalized.traverse(mesh=>{if(!mesh.isMesh)return;const far=clearable?overviewCrown(mesh.geometry):null,farMaterial=clearable?mesh.material.clone():null;if(farMaterial)farMaterial.flatShading=true;
      for(const items of chunks.values()){
        const inst=new THREE.InstancedMesh(mesh.geometry,mesh.material,items.length),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),scale=new THREE.Vector3();
        items.forEach((p,i)=>{v.set(p.x,landscape.height(p.x,p.z),p.z);q.setFromAxisAngle(new THREE.Vector3(0,1,0),p.angle);scale.setScalar(p.scale);matrix.compose(v,q,scale);matrix.multiply(mesh.matrixWorld);inst.setMatrixAt(i,matrix);if(p.tint)inst.setColorAt(i,new THREE.Color(p.tint).multiplyScalar(.94+landscape.hash(p.x,p.z,11)*.14));});
        inst.castShadow=true;inst.receiveShadow=true;inst.matrixAutoUpdate=false;inst.computeBoundingSphere();scene.add(inst);
        if(clearable){records.push({inst,items});lods.push({inst,full:mesh.geometry,material:mesh.material,far,farMaterial});}
      }
    });
  }
  function clearRoads(state){const key=JSON.stringify(state.routes.map(r=>[r.id,r.open]));if(key===roadSignature)return;roadSignature=key;const opened=state.routes.filter(r=>r.open).map(r=>({a:state.towns.find(t=>t.id===r.a),b:state.towns.find(t=>t.id===r.b)})),zero=new THREE.Matrix4().makeScale(0,0,0);
    for(const {inst,items}of records){let changed=false;items.forEach((p,i)=>{if(!p.cleared&&opened.some(r=>landscape.distanceToRoad(p.x,p.z,r.a,r.b)<3.6)){p.cleared=true;inst.setMatrixAt(i,zero);changed=true;}});if(changed)inst.instanceMatrix.needsUpdate=true;}
  }
  function setOverview(value){if(value===overview)return false;overview=value;for(const {inst,full,material,far,farMaterial}of lods){inst.geometry=value?far:full;inst.material=value?farMaterial:material;}return true;}
  return {add,clearRoads,setOverview};
}
