import * as THREE from 'three';

// Keep the original grid and colors; split only its GPU submission bounds.
export function gridLayer(source,material,scene,cells=32,receiveShadow=true){
  const {widthSegments:W,heightSegments:H}=source.parameters,stride=W+1,tiles=[];
  for(let z=0;z<H;z+=cells)for(let x=0;x<W;x+=cells){
    const w=Math.min(cells,W-x),h=Math.min(cells,H-z),ids=[],g=new THREE.BufferGeometry();
    for(let dz=0;dz<=h;dz++)for(let dx=0;dx<=w;dx++)ids.push((z+dz)*stride+x+dx);
    for(const [name,attr]of Object.entries(source.attributes)){
      const values=new Float32Array(ids.length*attr.itemSize);
      ids.forEach((id,i)=>{for(let k=0;k<attr.itemSize;k++)values[i*attr.itemSize+k]=attr.array[id*attr.itemSize+k];});
      g.setAttribute(name,new THREE.BufferAttribute(values,attr.itemSize));
    }
    const indices=[];
    for(let dz=0;dz<h;dz++)for(let dx=0;dx<w;dx++){const offset=((z+dz)*W+x+dx)*6;for(let k=0;k<6;k++){const id=source.index.array[offset+k];indices.push((Math.floor(id/stride)-z)*(w+1)+(id%stride-x));}}
    g.setIndex(indices);g.computeBoundingSphere();const mesh=new THREE.Mesh(g,material);mesh.receiveShadow=receiveShadow;mesh.matrixAutoUpdate=false;scene.add(mesh);tiles.push({mesh,ids});
  }
  return {tiles,updateColors(){const src=source.attributes.color;for(const{mesh,ids}of tiles){const dst=mesh.geometry.attributes.color;ids.forEach((id,i)=>dst.setXYZ(i,src.getX(id),src.getY(id),src.getZ(id)));dst.needsUpdate=true;}}};
}

// Indexed road ribbons stay indexed when grouped into spatially cullable meshes.
export function spatialGeometry(sources,cell=64){
  const buckets=new Map();
  sources.forEach((g,gi)=>{const p=g.attributes.position,n=g.attributes.normal,c=g.attributes.color,index=g.index;
    for(let i=0;i<index.count;i+=3){const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)],x=ids.reduce((v,id)=>v+p.getX(id),0)/3,z=ids.reduce((v,id)=>v+p.getZ(id),0)/3,key=Math.floor(x/cell)+':'+Math.floor(z/cell);
      let b=buckets.get(key);if(!b){b={positions:[],normals:[],colors:[],indices:[],vertices:new Map()};buckets.set(key,b);}
      for(const id of ids){const vkey=gi+':'+id;let local=b.vertices.get(vkey);if(local===undefined){local=b.positions.length/3;b.vertices.set(vkey,local);b.positions.push(p.getX(id),p.getY(id),p.getZ(id));b.normals.push(n.getX(id),n.getY(id),n.getZ(id));b.colors.push(c.getX(id),c.getY(id),c.getZ(id));}b.indices.push(local);}
    }
  });
  return [...buckets.entries()].map(([key,b])=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(b.normals,3));g.setAttribute('color',new THREE.Float32BufferAttribute(b.colors,3));g.setIndex(b.indices);g.computeBoundingSphere();g.userData.chunkKey=key;return g;});
}
