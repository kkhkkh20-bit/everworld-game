import * as THREE from 'three';

// Every figure shares these GPU geometries, including carts created later.
export function createActorModels(wheelMaterial){
  const shirts=['#c49a69','#647d8d','#8e9a66'].map(color=>new THREE.MeshStandardMaterial({color})),skin=new THREE.MeshStandardMaterial({color:'#deba8e'}),wood=new THREE.MeshStandardMaterial({color:'#a47c50'});
  const head=new THREE.SphereGeometry(.2,6,5),body=new THREE.CylinderGeometry(.17,.24,.6,6),pack=new THREE.BoxGeometry(.44,.34,.36),cart=new THREE.BoxGeometry(1.1,.55,1.4),wheel=new THREE.CylinderGeometry(.3,.3,.13,8),pole=new THREE.CylinderGeometry(.05,.05,2.3,5),flag=new THREE.PlaneGeometry(1,.65);
  const red=new THREE.MeshStandardMaterial({color:'#ad5f54',side:THREE.DoubleSide}),blue=new THREE.MeshStandardMaterial({color:'#71879c',side:THREE.DoubleSide});
  function figure(i,caravan=false){
    const group=new THREE.Group(),torso=new THREE.Mesh(body,shirts[i%3]),face=new THREE.Mesh(head,skin),bundle=new THREE.Mesh(pack,wood);torso.position.y=.43;face.position.y=.94;bundle.position.set(0,.52,.3);group.add(torso,face,bundle);group.userData.pack=bundle;group.userData.body=torso;
    if(caravan){torso.scale.set(1.5,1.1,1.5);const load=new THREE.Mesh(cart,wood);load.position.set(0,.5,1.1);group.add(load);for(const x of [-.7,.7]){const tire=new THREE.Mesh(wheel,wheelMaterial);tire.rotation.z=Math.PI/2;tire.position.set(x,.35,1.1);group.add(tire);}}
    return group;
  }
  function formation(attacking=true){const group=new THREE.Group(),color=attacking?red:blue;for(let i=0;i<4;i++){const f=figure(i);f.userData.body.material=color;f.position.set((i%2)*.8,0,Math.floor(i/2)*.8);group.add(f);}const staff=new THREE.Mesh(pole,wood),banner=new THREE.Mesh(flag,color);staff.position.set(-.5,1.2,0);banner.position.set(0,2.1,0);group.add(staff,banner);return group;}
  return {figure,formation};
}
