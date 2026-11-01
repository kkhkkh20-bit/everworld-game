import * as THREE from 'three';
import { mergeGeometries } from '../assets/vendor/three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from '../assets/vendor/three/addons/loaders/GLTFLoader.js';

export async function createView(canvas, state, callbacks) {
  const mobile=innerWidth<700;
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.25:1.6));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e6e8d7');scene.fog=new THREE.Fog('#e6e8d7',170,330);
  const camera=new THREE.OrthographicCamera(-100,100,70,-70,.1,600);
  const focus=new THREE.Vector3(0,0,8),desired=focus.clone();let size=145,desiredSize=145,angle=Math.PI/4,desiredAngle=angle,width=innerWidth,height=innerHeight,dirty=true;
  scene.add(new THREE.HemisphereLight('#fff7df','#7f9570',1.8));
  const sun=new THREE.DirectionalLight('#ffedd0',2.2);sun.position.set(-45,85,40);sun.castShadow=true;
  sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(sun.shadow.camera,{left:-115,right:115,top:110,bottom:-110,near:1,far:220});sun.shadow.normalBias=.07;sun.shadow.bias=-.0001;scene.add(sun);
  const loader=new GLTFLoader(),models={},names=['home_A','home_B','townhall','castle','windmill','watermill','market','tent','watchtower','lumbermill','church','grain','scaffolding','bridge_A','tree_single_A','tree_single_B','mountain_A_grass','rock_single_A'];
  let loaded=0;
  await Promise.all(names.map(async name=>{const gltf=await loader.loadAsync('assets/valley/models/'+name+'.glb');models[name]=gltf.scene;models[name].updateMatrixWorld(true);models[name].traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material.roughness=1;o.material.metalness=0;}}});if(name==='mountain_A_grass')models[name].traverse(o=>{if(o.isMesh&&o.material?.color)o.material.color.multiply(new THREE.Color('#a0b480'));});callbacks.progress(++loaded/names.length);}));
  function object(name,span=4){const obj=new THREE.Group(),inner=models[name].clone(true),box=new THREE.Box3().setFromObject(inner),dim=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),k=span/Math.max(dim.x,dim.z);inner.scale.multiplyScalar(k);inner.position.set(-center.x*k,-box.min.y*k,-center.z*k);obj.add(inner);return obj;}
  function riverX(z){return 32+Math.sin(z*.035)*8;}
  function elevation(x,z){let y=(Math.sin(x*.046)*Math.cos(z*.053)+Math.sin((x+z)*.025))*.55;
    for(const t of state.towns){const d=Math.hypot(x-t.x,z-t.z);if(d<18)y*=Math.max(0,(d-13)/5);}
    const river=Math.abs(x-riverX(z));if(river<4.5)return -.5;if(river<7)y*=Math.max(0,(river-4.5)/2.5);
    return y;
  }
  const terrainGeo=new THREE.PlaneGeometry(230,195,115,98);terrainGeo.rotateX(-Math.PI/2);
  const points=terrainGeo.attributes.position,col=[];const c=new THREE.Color();
  for(let i=0;i<points.count;i++){const x=points.getX(i),z=points.getZ(i);points.setY(i,elevation(x,z));const n=(Math.sin(x*.12+z*.04)+Math.sin(z*.15))*.018;c.setRGB(.12+n,.205+n,.09+n);col.push(c.r,c.g,c.b);}
  terrainGeo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));terrainGeo.computeVertexNormals();
  const terrain=new THREE.Mesh(terrainGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));terrain.receiveShadow=true;scene.add(terrain);
  // An actual river ribbon, with pale banks and one crossing on the trade route.
  const riverVerts=[],riverColors=[];
  for(let i=0;i<100;i++){const z=-98+i*1.96,next=z+1.96,a=riverX(z),b=riverX(next);riverVerts.push(a-3.8,.015,z,a+3.8,.015,z,b-3.8,.015,next,a+3.8,.015,z,b+3.8,.015,next,b-3.8,.015,next);for(let j=0;j<6;j++){c.set(j%2?'#73a6ad':'#8bb4b4');riverColors.push(c.r,c.g,c.b);}}
  const riverGeo=new THREE.BufferGeometry();riverGeo.setAttribute('position',new THREE.Float32BufferAttribute(riverVerts,3));riverGeo.setAttribute('color',new THREE.Float32BufferAttribute(riverColors,3));riverGeo.computeVertexNormals();
  scene.add(new THREE.Mesh(riverGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.38,metalness:.04,side:THREE.DoubleSide})));
  for(const side of [-1,1]){const path=[];for(let z=-98;z<98;z+=2)path.push(new THREE.Vector3(riverX(z)+side*4.3,.035,z));const geom=new THREE.BufferGeometry().setFromPoints(path);scene.add(new THREE.Line(geom,new THREE.LineBasicMaterial({color:'#bac7b0',transparent:true,opacity:.65})));}
  const roadMat=new THREE.MeshStandardMaterial({color:'#c8bb98',roughness:1});
  const roadGeometries=[];let roadMesh=null;
  function road(from,to,width=.7){const verts=[],dx=to.x-from.x,dz=to.z-from.z,len=Math.hypot(dx,dz)||1,nx=-dz/len*width,nz=dx/len*width;
    for(let i=0;i<16;i++){const a=i/16,b=(i+1)/16,ax=from.x+dx*a,az=from.z+dz*a,bx=from.x+dx*b,bz=from.z+dz*b;
      const pts=[[ax+nx,az+nz],[bx+nx,bz+nz],[ax-nx,az-nz],[ax-nx,az-nz],[bx+nx,bz+nz],[bx-nx,bz-nz]];
      for(const[x,z]of pts)verts.push(x,elevation(x,z)+.065,z);
    }const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.computeVertexNormals();roadGeometries.push(g);return g;
  }
  function rebuildRoads(){const g=mergeGeometries(roadGeometries,false);if(!roadMesh){roadMesh=new THREE.Mesh(g,roadMat);roadMesh.receiveShadow=true;scene.add(roadMesh);}else{roadMesh.geometry.dispose();roadMesh.geometry=g;}}
  const main=state.towns.find(t=>t.id===1);
  for(const t of state.towns)if(t.id!==1)road(main,t,t.id===0?.55:.7);
  const port=state.towns.find(t=>t.style==='port');let crossing=port;for(let i=0;i<=200;i++){const k=i/200,p={x:main.x+(port.x-main.x)*k,z:main.z+(port.z-main.z)*k};if(Math.abs(p.x-riverX(p.z))<.35){crossing=p;break;}}const bridge=object('bridge_A',12);bridge.children[0].position.y=0;bridge.position.set(crossing.x,.06,crossing.z);bridge.rotation.y=Math.atan2(port.x-main.x,port.z-main.z);scene.add(bridge);
  function forestInstances(name,placements){const normalized=object(name,2.5);normalized.updateMatrixWorld(true);normalized.traverse(mesh=>{if(!mesh.isMesh)return;const inst=new THREE.InstancedMesh(mesh.geometry,mesh.material,placements.length),m=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),sc=new THREE.Vector3();for(let i=0;i<placements.length;i++){const p=placements[i];v.set(p.x,elevation(p.x,p.z),p.z);q.setFromAxisAngle(new THREE.Vector3(0,1,0),p.angle);sc.setScalar(p.scale);m.compose(v,q,sc);m.multiply(mesh.matrixWorld);inst.setMatrixAt(i,m);}inst.castShadow=true;inst.receiveShadow=true;scene.add(inst);});}
  const forests=[[],[]];
  for(let i=0;i<560;i++){const x=Math.sin(i*54.153)*104,z=Math.cos(i*19.717)*87;
    if(Math.abs(x-riverX(z))<9)continue;
    const near=state.towns.some(t=>Math.hypot(x-t.x,z-t.z)<18);if(near)continue;
    // Leave open fields along the central valley, with denser wooded edges.
    if(Math.abs(x)<42&&Math.abs(z)<45&&i%4!==0)continue;
    forests[i%2].push({x,z,angle:i*.7,scale:.75+(i%7)*.12});
  }
  forestInstances('tree_single_A',forests[0]);forestInstances('tree_single_B',forests[1]);
  for(let i=0;i<10;i++){const mount=object('mountain_A_grass',18+(i%3)*5);mount.children[0].position.y=0;mount.position.set(-94+i*18,0,-90-Math.sin(i)*4);mount.rotation.y=i*.8;scene.add(mount);}
  const townGroups=new Map(),workerMeshes=new Map(),caravanMeshes=new Map();
  const buildModel={home:'home_A',farm:'grain',workshop:'lumbermill',market:'market',mill:'windmill'};
  const shirtMaterials=[new THREE.MeshStandardMaterial({color:'#c49a69'}),new THREE.MeshStandardMaterial({color:'#647d8d'}),new THREE.MeshStandardMaterial({color:'#8e9a66'})];
  const headGeo=new THREE.SphereGeometry(.2,6,5),bodyGeo=new THREE.CylinderGeometry(.17,.24,.6,6),skin=new THREE.MeshStandardMaterial({color:'#deba8e'}),crateMat=new THREE.MeshStandardMaterial({color:'#a47c50'});
  function workerFigure(i,caravan=false){const group=new THREE.Group(),body=new THREE.Mesh(bodyGeo,shirtMaterials[i%3]);body.position.y=.43;const head=new THREE.Mesh(headGeo,skin);head.position.y=.94;group.add(body,head);const pack=new THREE.Mesh(new THREE.BoxGeometry(.44,.34,.36),crateMat);pack.position.set(0,.52,.3);group.add(pack);group.userData.pack=pack;group.userData.body=body;if(caravan){body.scale.set(1.5,1.1,1.5);const cart=new THREE.Mesh(new THREE.BoxGeometry(1.1,.55,1.4),crateMat);cart.position.set(0,.5,1.1);group.add(cart);for(const x of [-.7,.7]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.13,8),roadMat);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.35,1.1);group.add(wheel);}}return group;}
  const buildingPlacements=new Map(),buildingBatches=[];
  function queueBuilding(name,span,x,z,rotation){const key=name+':'+span;if(!buildingPlacements.has(key))buildingPlacements.set(key,{name,span,items:[]});buildingPlacements.get(key).items.push({x,z,rotation});}
  function rebuildBuildings(){for(const old of buildingBatches){scene.remove(old);old.dispose();}buildingBatches.length=0;
    for(const {name,span,items}of buildingPlacements.values()){const template=object(name,span);template.updateMatrixWorld(true);template.traverse(mesh=>{if(!mesh.isMesh)return;const inst=new THREE.InstancedMesh(mesh.geometry,mesh.material,items.length),m=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3();for(let i=0;i<items.length;i++){const p=items[i];v.set(p.x,.08,p.z);q.setFromAxisAngle(new THREE.Vector3(0,1,0),p.rotation);m.compose(v,q,new THREE.Vector3(1,1,1));m.multiply(mesh.matrixWorld);inst.setMatrixAt(i,m);}inst.castShadow=true;inst.receiveShadow=true;scene.add(inst);buildingBatches.push(inst);});}
  }
  function makeTown(t){const group=new THREE.Group();group.position.set(t.x,0,t.z);scene.add(group);const plaza=new THREE.Mesh(new THREE.CircleGeometry(3.5,24),new THREE.MeshStandardMaterial({color:'#d2c4a0',roughness:1}));plaza.rotation.x=-Math.PI/2;plaza.position.y=.08;plaza.receiveShadow=true;group.add(plaza);return {group,buildings:0,site:null,siteKey:'',roads:[]};}
  for(const t of state.towns){for(let i=0;i<5;i++){const tree=object(i%2?'tree_single_A':'tree_single_B',2.3);tree.position.set(t.x+12+(i%3)*2,elevation(t.x+14,t.z-8),t.z-10+Math.floor(i/3)*3);scene.add(tree);}for(let i=0;i<3;i++){const rock=object('rock_single_A',1.5);rock.position.set(t.x+10+i,elevation(t.x+11,t.z+12),t.z+12+(i%2));scene.add(rock);}townGroups.set(t.id,makeTown(t));for(const w of t.workers){const fig=workerFigure(w.id);scene.add(fig);workerMeshes.set(t.id+':'+w.id,fig);}}
  function updateTowns(){let rebuild=false;for(const t of state.towns){const record=townGroups.get(t.id);
      while(record.buildings<t.buildings.length){const i=record.buildings++,b=t.buildings[i];let model=b.type==='hall'?(t.id===0?'tent':t.style==='castle'?'castle':t.style==='capital'?'townhall':t.style==='port'?'watermill':'church'):buildModel[b.type];if(b.type==='home'&&i%3===0)model='home_B';
        const span=b.type==='hall'?(t.id===0?4.3:7.6):b.type==='farm'?5.1:b.type==='mill'?6.5:4.6;
        queueBuilding(model,span,t.x+b.x,t.z+b.z,(i%4)*Math.PI/2);rebuild=true;record.roads.push(road(t,{x:t.x+b.x,z:t.z+b.z},.38));
      }
      const key=t.project?t.project.type+':'+t.project.x+':'+t.project.z:'';
      if(record.siteKey!==key){if(record.site)record.group.remove(record.site);record.site=null;record.siteKey=key;if(t.project){const site=object('scaffolding',4.8);site.position.set(t.project.x,.05,t.project.z);record.group.add(site);record.site=site;}}
      if(record.site&&t.project){const p=t.project,progress=p.work/window.Valley.PLANS[p.type].work;record.site.scale.y=.35+progress*.65;}
    }if(rebuild){rebuildBuildings();rebuildRoads();}}
  const townLabels=document.getElementById('townLabels'),labelElements=new Map();let selected=0;
  for(const t of state.towns){const b=document.createElement('button');b.className='town-label'+(t.id===0?' our':'');b.dataset.town=String(t.id);b.setAttribute('aria-label',t.name+' 살펴보기');b.innerHTML='<i class="flag"></i><span><strong>'+t.name+'</strong><small></small></span>';b.onclick=()=>callbacks.select(t.id);townLabels.append(b);labelElements.set(t.id,b);}
  const projectPos=new THREE.Vector3();
  function labels(){for(const t of state.towns){const el=labelElements.get(t.id);projectPos.set(t.x,7.8,t.z).project(camera);const x=(projectPos.x*.5+.5)*width,y=(-projectPos.y*.5+.5)*height;el.style.left=x+'px';el.style.top=y+'px';el.hidden=x<-50||x>width+50||y<80||y>height-70;el.classList.toggle('selected',t.id===selected);el.querySelector('small').textContent=t.pop+'명 · '+(t.project?'새 '+window.Valley.PLANS[t.project.type].name+' 공사':t.id===0?'우리의 작은 터전':({capital:'오래된 모촌',castle:'북부의 성채',port:'강변 교역 도시',farm:'계곡의 곡창',forest:'목재와 장인의 마을'})[t.style]);}}
  function cameraUpdate(){const d=width/height;camera.left=-size*d/2;camera.right=size*d/2;camera.top=size/2;camera.bottom=-size/2;camera.updateProjectionMatrix();camera.position.set(focus.x+Math.sin(angle)*110,100,focus.z+Math.cos(angle)*110);camera.lookAt(focus);camera.updateMatrixWorld();}
  function resize(){width=canvas.clientWidth;height=canvas.clientHeight;renderer.setSize(width,height,false);cameraUpdate();dirty=true;}new ResizeObserver(resize).observe(canvas);resize();
  let pointers=new Map(),origin=null,pinch=0,moved=false;
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});origin={x:e.clientX,y:e.clientY};moved=false;if(pointers.size===2){const[a,b]=[...pointers.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y);}});
  canvas.addEventListener('pointermove',e=>{const prev=pointers.get(e.pointerId);if(!prev)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const[a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)desiredSize=Math.max(24,Math.min(Math.max(190,220*height/width),desiredSize*pinch/d));pinch=d;moved=true;}else if(origin&&Math.hypot(e.clientX-origin.x,e.clientY-origin.y)>4){const dx=(e.clientX-prev.x)*size/height,dz=(e.clientY-prev.y)*size/height;desired.x-=dx*Math.cos(angle)+dz*Math.sin(angle);desired.z+=dx*Math.sin(angle)-dz*Math.cos(angle);desired.x=Math.max(-100,Math.min(100,desired.x));desired.z=Math.max(-85,Math.min(85,desired.z));moved=true;}dirty=true;});
  function release(e){pointers.delete(e.pointerId);pinch=0;origin=null;}canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
  canvas.addEventListener('wheel',e=>{e.preventDefault();desiredSize=Math.max(24,Math.min(Math.max(190,220*height/width),desiredSize*Math.exp(e.deltaY*.001)));dirty=true;},{passive:false});
  canvas.addEventListener('keydown',e=>{const moves={ArrowLeft:[-5,0],ArrowRight:[5,0],ArrowUp:[0,-5],ArrowDown:[0,5]};if(moves[e.key]){e.preventDefault();desired.x+=moves[e.key][0];desired.z+=moves[e.key][1];dirty=true;}});
  let renders=0,lastBuildingCheck=-1,lastCameraTime=performance.now();
  function render(force=false){
    let cameraMoving=focus.distanceTo(desired)>.01||Math.abs(size-desiredSize)>.01||Math.abs(angle-desiredAngle)>.001;
    const now=performance.now(),alpha=1-Math.exp(-Math.min(.5,(now-lastCameraTime)/1000)*8);lastCameraTime=now;if(cameraMoving){focus.lerp(desired,alpha);size+=(desiredSize-size)*alpha;angle+=(desiredAngle-angle)*alpha;cameraUpdate();}
    if(lastBuildingCheck!==state.day){updateTowns();lastBuildingCheck=state.day;}
    for(const t of state.towns)for(const w of t.workers){const fig=workerMeshes.get(t.id+':'+w.id);const dx=w.x-fig.position.x,dz=w.z-fig.position.z;fig.position.set(w.x,elevation(w.x,w.z)+.1,w.z);if(Math.hypot(dx,dz)>.001)fig.rotation.y=Math.atan2(dx,dz);fig.userData.pack.visible=!!w.cargo;fig.userData.body.rotation.z=/중/.test(w.phase)?Math.sin(state.time*12+w.id)*.11:0;fig.visible=t.pop>0;}
    const live=new Set();for(const c of state.caravans){live.add(c.id);let fig=caravanMeshes.get(c.id);if(!fig){fig=workerFigure(c.id,true);caravanMeshes.set(c.id,fig);scene.add(fig);}const dx=c.x-fig.position.x,dz=c.z-fig.position.z;const riverDistance=Math.abs(c.x-riverX(c.z)),deck=riverDistance<8?1.45*Math.cos(riverDistance/8*Math.PI/2):0;fig.position.set(c.x,Math.max(elevation(c.x,c.z),deck)+.15,c.z);if(Math.hypot(dx,dz)>.001)fig.rotation.y=Math.atan2(dx,dz);}
    for(const[id,fig]of caravanMeshes)if(!live.has(id)){scene.remove(fig);caravanMeshes.delete(id);}
    if(dirty||force||cameraMoving){renderer.render(scene,camera);renders++;labels();dirty=false;}
    return cameraMoving;
  }
  updateTowns();
  return {render,markDirty(){dirty=true;},focusTown(id){const t=state.towns.find(t=>t.id===id);selected=id;desired.set(t.x,0,t.z);desiredSize=innerWidth<700?39:43;dirty=true;},world(){desired.set(0,0,8);desiredSize=innerWidth<700?200/(width/height):145;dirty=true;},zoom(f){desiredSize=Math.max(24,Math.min(Math.max(190,220*height/width),desiredSize*f));dirty=true;},rotate(){desiredAngle+=Math.PI/4;dirty=true;},select(id){selected=id;dirty=true;},stats(){return {renders,calls:renderer.info.render.calls,models:Object.keys(models).length,workers:workerMeshes.size,buildings:state.towns.reduce((n,t)=>n+t.buildings.length,0),size,focus:{x:focus.x,z:focus.z}};},project(x,z){projectPos.set(x,0,z).project(camera);return {x:(projectPos.x*.5+.5)*width,y:(-projectPos.y*.5+.5)*height};}};
}
