import * as THREE from 'three';

// Every figure shares these GPU geometries, including carts created later.
export function createActorModels(wheelMaterial){
  const shirts=['#c49a69','#647d8d','#8e9a66'].map(color=>new THREE.MeshStandardMaterial({color})),skin=new THREE.MeshStandardMaterial({color:'#deba8e'}),wood=new THREE.MeshStandardMaterial({color:'#a47c50'});
  const head=new THREE.SphereGeometry(.2,6,5),body=new THREE.CylinderGeometry(.17,.24,.6,6),pack=new THREE.BoxGeometry(.44,.34,.36),cart=new THREE.BoxGeometry(1.1,.55,1.4),wheel=new THREE.CylinderGeometry(.3,.3,.13,8),pole=new THREE.CylinderGeometry(.05,.05,2.3,5),flag=new THREE.PlaneGeometry(1,.65);
  const red=new THREE.MeshStandardMaterial({color:'#ad5f54',side:THREE.DoubleSide}),blue=new THREE.MeshStandardMaterial({color:'#71879c',side:THREE.DoubleSide});
  const grainPack=new THREE.MeshStandardMaterial({color:'#c9ad65'});
  const beamGeometry=new THREE.BoxGeometry(1,1,1);
  const rodGeometry=new THREE.CylinderGeometry(.018,.018,1.9,4),bowGeometry=new THREE.TorusGeometry(.42,.025,3,9,Math.PI),fishPack=new THREE.MeshStandardMaterial({color:'#648f9d'}),meatPack=new THREE.MeshStandardMaterial({color:'#a35f4d'});
  function figure(i,caravan=false,vehicle='handcart'){
    const group=new THREE.Group(),torso=new THREE.Mesh(body,shirts[i%3]),face=new THREE.Mesh(head,skin),bundle=new THREE.Mesh(pack,wood);torso.position.y=.43;face.position.y=.94;bundle.position.set(0,.52,.3);group.add(torso,face,bundle);group.userData.pack=bundle;group.userData.body=torso;
    if(caravan&&vehicle!=='porter'){
      torso.scale.set(1.5,1.1,1.5);bundle.visible=false;const load=new THREE.Mesh(cart,wood);load.position.set(0,.5,-1.1);group.add(load);group.userData.wheels=[];group.userData.goods=[];
      function beam(x,y,z,sx,sy,sz,material=wood){const m=new THREE.Mesh(beamGeometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);group.add(m);return m;}
      for(const x of [-.55,.55])beam(x,.36,-.55,.08,.08,2.4);
      if(vehicle==='sledge'){for(const x of [-.6,.6])beam(x,.12,-1.1,.12,.12,1.9);}
      else for(const x of [-.7,.7])for(const z of vehicle==='wagon'?[-1.65,-.55]:[-1.1]){const tire=new THREE.Mesh(wheel,wheelMaterial);tire.rotation.z=Math.PI/2;tire.position.set(x,.35,z);group.add(tire);group.userData.wheels.push(tire);}
      for(let j=0;j<3;j++){const sack=new THREE.Mesh(head,wood);sack.scale.set(1.4,1.3,1.4);sack.position.set((j-1)*.3,.95,-1.1);group.add(sack);group.userData.goods.push(sack);}
      if(vehicle==='wagon'){
        torso.position.x=1;face.position.x=1;beam(0,.75,1,.7,.65,1.2);for(const x of [-.26,.26])for(const z of [.6,1.4])beam(x,.3,z,.12,.6,.12);beam(0,.95,1.75,.45,.4,.45);for(const x of [-.3,.3])beam(x,1.25,1.8,.1,.25,.1,skin);
      }
    }
    if(caravan&&vehicle==='porter')group.userData.goods=[bundle];
    if(!caravan){const rod=new THREE.Mesh(rodGeometry,wood),bow=new THREE.Mesh(bowGeometry,wood);rod.position.set(.45,1,.15);rod.rotation.z=-.6;bow.position.set(.4,.7,.1);rod.visible=false;bow.visible=false;group.add(rod,bow);group.userData.rod=rod;group.userData.bow=bow;}
    group.traverse(o=>o.layers.set(1));return group;
  }
  function formation(attacking=true){const group=new THREE.Group(),color=attacking?red:blue;for(let i=0;i<4;i++){const f=figure(i);f.userData.body.material=color;f.position.set((i%2)*.8,0,Math.floor(i/2)*.8);group.add(f);}const staff=new THREE.Mesh(pole,wood),banner=new THREE.Mesh(flag,color);staff.position.set(-.5,1.2,0);banner.position.set(0,2.1,0);group.add(staff,banner);group.traverse(o=>o.layers.set(1));return group;}
  function activity(figure,w){figure.userData.pack.material=w.cargo?.source==='fish'?fishPack:w.cargo?.source==='meat'?meatPack:wood;if(figure.userData.rod)figure.userData.rod.visible=w.foodTask?.method==='fish'&&w.foodTask.phase==='work';if(figure.userData.bow)figure.userData.bow.visible=w.foodTask?.method==='hunt'&&w.foodTask.phase==='work';}
  function transport(figure,c){const kind=c.phase==='out'?c.kind:c.other,material=kind==='food'?grainPack:kind==='stone'?fishPack:wood;for(const sack of figure.userData.goods||[])sack.material=material;for(const wheel of figure.userData.wheels||[])wheel.rotation.x=-c.progress*50;}
  return {figure,formation,activity,transport};
}
