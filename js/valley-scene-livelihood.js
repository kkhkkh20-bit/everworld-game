import * as THREE from 'three';
export function createLivelihoodLayer(scene,state,elevation,object){
 const records=[];
 for(const t of state.towns){if(!t.livelihood)continue;const l=t.livelihood,group=new THREE.Group(),deer=[];for(let i=0;i<3;i++){const model=object('woodlandDeer',1.7);const x=l.hunt.x+(i-1)*2.1,z=l.hunt.z+(i%2)*1.6;model.position.set(x,elevation(x,z),z);model.rotation.y=i*1.8;model.traverse(m=>{if(m.isMesh)m.castShadow=false;});group.add(model);deer.push(model);}scene.add(group);records.push({t,group,deer,boats:[]});}
 function update(){let changed=false;for(const r of records){const count=window.Valley.livelihoodStatus(r.t).boats;while(r.boats.length<count){const model=object(r.t.architecture.level>=2?'fishingSkiff':'logRaft',2.3);model.traverse(m=>{if(m.isMesh)m.castShadow=false;});r.group.add(model);r.boats.push(model);changed=true;}}return changed;}
 function render(size){for(const r of records){r.group.visible=size<=300&&r.t.pop>0;if(!r.group.visible)continue;const l=r.t.livelihood;r.deer.forEach((model,i)=>model.visible=l.game>i*24);const crews=r.t.workers.filter(w=>w.transport==='boat');r.boats.forEach((model,i)=>{model.visible=i<Math.max(window.Valley.livelihoodStatus(r.t).boats,crews.length);const w=crews[i],p=w||l.fishing?.bank;if(!p)return;model.position.set(p.x,.18,p.z);if(w?.foodTask){const target=w.foodTask.phase==='return-boat'?l.fishing.bank:l.fishing.water;model.rotation.y=Math.atan2(target.x-w.x,target.z-w.z);}else if(l.fishing)model.rotation.y=Math.atan2(l.fishing.water.x-p.x,l.fishing.water.z-p.z);});}}
 return {update,render};
}
