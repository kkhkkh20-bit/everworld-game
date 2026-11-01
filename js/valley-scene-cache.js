import * as THREE from 'three';

// A riverside intake can be visible while its parent village is off-screen.
export function visibleTowns(state,inside){
  return state.towns.filter(t=>inside(t.x,t.z)||t.buildings.some(b=>inside(t.x+b.x,t.z+b.z))||(t.project&&inside(t.x+t.project.x,t.z+t.project.z)));
}

// Retain both color and depth: a moving cart must still pass behind a tree.
export function createSceneCache(renderer,scene,camera){
  const bufferSize=new THREE.Vector2(),screenScene=new THREE.Scene(),screenCamera=new THREE.Camera();
  const material=new THREE.ShaderMaterial({
    uniforms:{colorMap:{value:null},depthMap:{value:null}},depthTest:true,depthFunc:THREE.AlwaysDepth,depthWrite:true,
    extensions:{fragDepth:true},
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
    fragmentShader:`uniform sampler2D colorMap;uniform sampler2D depthMap;varying vec2 vUv;
      void main(){gl_FragColor=texture2D(colorMap,vUv);gl_FragDepthEXT=texture2D(depthMap,vUv).x;
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);quad.frustumCulled=false;screenScene.add(quad);
  let target=null,key=null,builds=0,composites=0;
  function render(signature){
    renderer.getDrawingBufferSize(bufferSize);
    if(!target||target.width!==bufferSize.x||target.height!==bufferSize.y){
      target?.dispose();target=new THREE.WebGLRenderTarget(bufferSize.x,bufferSize.y,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
      target.depthTexture=new THREE.DepthTexture(bufferSize.x,bufferSize.y,THREE.UnsignedIntType);
      material.uniforms.colorMap.value=target.texture;material.uniforms.depthMap.value=target.depthTexture;key=null;
    }
    const mask=camera.layers.mask,autoClear=renderer.autoClear,background=scene.background;
    // Restore from an offscreen target. Default-framebuffer depth copies are
    // not portable, and can silently lose the background across browser frames.
    if(key!==signature){camera.layers.set(0);renderer.setRenderTarget(target);renderer.autoClear=true;renderer.render(scene,camera);key=signature;builds++;}
    renderer.setRenderTarget(null);renderer.autoClear=false;renderer.clear();renderer.render(screenScene,screenCamera);
    camera.layers.set(1);scene.background=null;const deferredShadow=renderer.shadowMap.needsUpdate;renderer.shadowMap.needsUpdate=false;renderer.render(scene,camera);renderer.shadowMap.needsUpdate=deferredShadow;
    camera.layers.mask=mask;scene.background=background;renderer.autoClear=autoClear;composites++;
  }
  return {render,invalidate(){key=null;},stats:()=>({mode:'depth-shader',builds,composites,width:target?.width||0,height:target?.height||0})};
}
