import * as THREE from 'three';

// Overview traffic is a light overlay; moving a dot never redraws the continent.
export function createMapMarkers(map){
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),point=new THREE.Vector3();
  canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:fixed;inset:0;width:100%;height:100dvh;pointer-events:none';map.after(canvas);
  let width=0,height=0,visible=false,draws=0;
  function resize(w,h){if(w===width&&h===height)return;width=w;height=h;const ratio=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);}
  function draw(state,camera,enabled,w,h,elevation){
    resize(w,h);canvas.hidden=!enabled;if(!enabled){if(visible)ctx.clearRect(0,0,width,height);visible=false;return;}visible=true;ctx.clearRect(0,0,width,height);draws++;
    function dot(x,z,y,r,color){point.set(x,y,z).project(camera);const px=(point.x*.5+.5)*width,py=(-point.y*.5+.5)*height;if(px<0||px>width||py<0||py>height)return;ctx.fillStyle=color;ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.fill();}
    for(const c of state.caravans){point.set(c.x,elevation(c.x,c.z)+.5,c.z).project(camera);const x=(point.x*.5+.5)*width,y=(-point.y*.5+.5)*height;if(x<0||x>width||y<0||y>height)continue;ctx.fillStyle='#c59348';ctx.fillRect(x-2.5,y-2,5,3);if(c.vehicle==='porter'||c.people){ctx.fillStyle='#644c36';ctx.fillRect(x-.7,y-4,1.4,2);continue;}ctx.fillStyle='#644c36';for(const dx of [-1.7,1.7]){ctx.beginPath();ctx.arc(x+dx,y+1.5,.8,0,Math.PI*2);ctx.fill();}}
    for(const a of state.armies){dot(a.x,a.z,elevation(a.x,a.z)+.5,3,'#ad5f54');if(a.phase==='battle')dot(a.x+2.3,a.z,elevation(a.x,a.z)+.5,2.5,'#71879c');}
  }
  return {draw,stats:()=>({draws})};
}
