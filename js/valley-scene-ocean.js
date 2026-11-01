import * as THREE from 'three';
import {gridLayer} from './valley-scene-geometry.js?v=1';

// A single surface per point: the far ocean surrounds the coastal grid without
// lying beneath it. Nearly coincident full-size planes flicker while panning.
export function createOceanLayer(scene,{worldWidth,worldDepth,centerX,centerZ},coastDistance){
  const group=new THREE.Group();group.name='ocean';scene.add(group);
  const seaY=-.12,innerX=worldWidth*1.2,innerZ=worldDepth*1.2,outerX=worldWidth*3,outerZ=worldDepth*3;
  const ring=new THREE.BufferGeometry(),vertices=[],indices=[];
  for(const [x,z]of [[-outerX,-outerZ],[outerX,-outerZ],[outerX,outerZ],[-outerX,outerZ],[-innerX,-innerZ],[innerX,-innerZ],[innerX,innerZ],[-innerX,innerZ]])vertices.push(centerX+x,seaY,centerZ+z);
  for(let i=0;i<4;i++){const j=(i+1)%4;indices.push(i,4+j,j,i,4+i,4+j);}
  ring.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));ring.setIndex(indices);ring.computeVertexNormals();
  const far=new THREE.Mesh(ring,new THREE.MeshStandardMaterial({color:'#285a78',roughness:.6,metalness:.03}));far.name='far-ocean';far.matrixAutoUpdate=false;group.add(far);
  const coastal=new THREE.PlaneGeometry(innerX*2,innerZ*2,160,160);coastal.rotateX(-Math.PI/2);coastal.translate(centerX,seaY,centerZ);
  const positions=coastal.attributes.position,colors=[];
  for(let i=0;i<positions.count;i++){const distance=coastDistance(positions.getX(i),positions.getZ(i)),color=new THREE.Color('#285a78').lerp(new THREE.Color('#65b6b2'),Math.max(0,Math.min(1,(distance+80)/80)));colors.push(color.r,color.g,color.b);}
  coastal.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const layer=gridLayer(coastal,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.6,metalness:.03}),group,32,false);
  for(const {mesh}of layer.tiles)mesh.name='coastal-ocean';
  return group;
}
