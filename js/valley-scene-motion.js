// Interpolate only display transforms. Goals, inventories and simulation RNG are read-only.
export function animatePosition(figure,goal,delta,paused=false){
  const p=figure.position,distance=Math.hypot(goal.x-p.x,goal.y-p.y,goal.z-p.z);
  if(!figure.userData.placed||paused||distance>40){p.set(goal.x,goal.y,goal.z);figure.userData.placed=true;return false;}
  const blend=1-Math.exp(-Math.min(.15,Math.max(0,delta))*24);
  p.x+=(goal.x-p.x)*blend;p.y+=(goal.y-p.y)*blend;p.z+=(goal.z-p.z)*blend;
  return Math.hypot(goal.x-p.x,goal.y-p.y,goal.z-p.z)>.015;
}
