export function getProjectileTrajectoryOffset({type="arc",progress=0,height=0,curveX=0,curveY=110}={}) {
  const t=Math.min(1,Math.max(0,Number(progress)||0));
  const bend=2*t*(1-t);
  if(type==="straight")return {x:0,y:0};
  if(type==="sine")return {x:0,y:Math.sin(Math.PI*2*t)*(Number(height)||0)};
  if(type==="bezier")return {x:bend*(Number(curveX)||0),y:bend*(Number(curveY)||0)};
  return {x:0,y:Math.sin(Math.PI*t)*(Number(height)||0)};
}
