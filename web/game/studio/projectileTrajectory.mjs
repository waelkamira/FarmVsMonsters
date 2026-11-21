export function getProjectileTrajectoryOffset({type="arc",progress=0,height=0,curveX=0,curveY=110,targetX=0,targetY=0}={}) {
  const t=Math.min(1,Math.max(0,Number(progress)||0));
  const bend=2*t*(1-t);
  const targetOffset={x:(Number(targetX)||0)*t,y:(Number(targetY)||0)*t};
  if(type==="straight")return targetOffset;
  if(type==="sine")return {x:targetOffset.x,y:targetOffset.y+Math.sin(Math.PI*2*t)*(Number(height)||0)};
  if(type==="bezier")return {x:targetOffset.x+bend*(Number(curveX)||0),y:targetOffset.y+bend*(Number(curveY)||0)};
  return {x:targetOffset.x,y:targetOffset.y+Math.sin(Math.PI*t)*(Number(height)||0)};
}
