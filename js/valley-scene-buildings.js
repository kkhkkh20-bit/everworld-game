import * as THREE from 'three';
import {buildingAppearance} from './valley-building-models.js?v=3';

export function createBuildingLayer(scene,object,elevation,factionColor){
  const towns=new Map(),batches=[],metrics={townBuilds:0};
  function buildTown(t){
    const placements=new Map(),meshes=[];
    function queue(name,span,x,z,rotation,tint,ruin,ref){const key=name+':'+span;if(!placements.has(key))placements.set(key,{name,span,items:[]});placements.get(key).items.push({x,z,rotation,tint,ruin,ref});}
    t.buildings.forEach((b,i)=>{
      const ref={townId:t.id,buildingId:b.id},span=b.type==='hall'?(b.tier>=2?7.6:4.3):b.type==='farm'?5.1:b.type==='mill'?6.5:4.6;
      queue(buildingAppearance(t,b),span,t.x+b.x,t.z+b.z,b.type==='boat'&&t.livelihood?.fishing?Math.atan2(t.livelihood.fishing.water.x-t.livelihood.fishing.bank.x,t.livelihood.fishing.water.z-t.livelihood.fishing.bank.z):(i%4)*Math.PI/2,b.ruined||!t.pop?'#8d9188':b.vacant?'#b0b0a1':'#ffffff',b.ruined||!t.pop,ref);
      if(t.id===0&&t.pop>0)queue('ownPlot',5.7,t.x+b.x,t.z+b.z,0,'#ffffff',false,ref);
      if(t.pop>0&&!b.ruined)queue(t.id===0?'ownBanner':'townBanner',1.25,t.x+b.x+2.4,t.z+b.z+2.6,0,t.id===0?'#e6bd55':factionColor(t),false,ref);
    });
    for(const {name,span,items}of placements.values()){
      const template=object(name,span);template.updateMatrixWorld(true);
      template.traverse(mesh=>{if(!mesh.isMesh)return;const inst=new THREE.InstancedMesh(mesh.geometry,mesh.material,items.length),m=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),scale=new THREE.Vector3();inst.userData.buildings=items.map(p=>p.ref);
        items.forEach((p,i)=>{v.set(p.x,elevation(p.x,p.z)+.08,p.z);q.setFromAxisAngle(new THREE.Vector3(0,1,0),p.rotation);scale.set(1,p.ruin?.48:1,1);m.compose(v,q,scale);m.multiply(mesh.matrixWorld);inst.setMatrixAt(i,m);inst.setColorAt(i,new THREE.Color(p.tint));});
        inst.castShadow=true;inst.receiveShadow=true;inst.matrixAutoUpdate=false;inst.computeBoundingSphere();scene.add(inst);meshes.push(inst);
      });
    }
    metrics.townBuilds++;return meshes;
  }
  function update(state){let changed=false;
    for(const t of state.towns){const signature=JSON.stringify([t.x,t.z,t.pop>0,t.faction,t.liege,t.buildings.map(b=>[b.id,b.type,b.x,b.z,b.ruined,b.vacant,b.tier])]);if(towns.get(t.id)?.signature===signature)continue;for(const mesh of towns.get(t.id)?.meshes||[]){scene.remove(mesh);mesh.dispose();}towns.set(t.id,{signature,meshes:buildTown(t)});changed=true;}
    if(changed){batches.length=0;for(const record of towns.values())batches.push(...record.meshes);}return changed;
  }
  return {batches,update,stats:()=>({...metrics,batches:batches.length})};
}
