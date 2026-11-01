import * as THREE from 'three';
export function createWaterLayer(scene,state,elevation,object,inspect){
  const records=[],pickables=[],bucketGeo=new THREE.CylinderGeometry(.3,.23,.5,7),bucketMat=new THREE.MeshStandardMaterial({color:'#9b8051'});
  for(const t of state.towns){
    if(t.water?.source.kind!=='river')continue;
    const group=new THREE.Group(),source=t.water.source;group.position.set(source.x,elevation(source.x,source.z)+.05,source.z);group.matrixAutoUpdate=false;group.updateMatrix();
    const bucket=new THREE.Mesh(bucketGeo,bucketMat);bucket.position.set(-1,.25,0);bucket.userData.waterTown=t.id;group.add(bucket);pickables.push(bucket);scene.add(group);records.push({t,group});
  }
  const label=document.createElement('button');label.className='water-source-label';label.onclick=()=>inspect(0);document.getElementById('townLabels').append(label);
  function render(size,project){for(const r of records)r.group.visible=size<=300&&r.t.pop>0;const t=state.towns[0],w=window.Valley.waterStatus(state,t);label.hidden=!w||size>140||t.pop<=0;if(!label.hidden){const text='💧 '+w.source.name+' · 물긷는 곳';if(label.textContent!==text)label.textContent=text;project(label,w.source.x,2,w.source.z);}}
  function pick(raycaster){const hit=raycaster.intersectObjects(pickables,false).find(h=>records.some(r=>r.t.id===h.object.userData.waterTown&&r.group.visible));return hit?.object.userData.waterTown??null;}
  return {update:()=>false,render,pick};
}
