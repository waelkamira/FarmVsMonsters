"use client";
import { useEffect, useMemo, useState } from "react";
import { getProjectileTrajectoryOffset } from "../../game/studio/projectileTrajectory.mjs";

const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));
export default function ProjectileTrajectoryEditor({imageUrl,plantUrl,frameCount=1,rows=1,columns=1,path,setPath,curveX,setCurveX,curveY,setCurveY,launchX,setLaunchX,launchY,setLaunchY,targetX,setTargetX,targetY,setTargetY,speed,setSpeed,height,setHeight,rotation,setRotation,playing,setPlaying}){
 const [progress,setProgress]=useState(0);
 const [drag,setDrag]=useState("");
 const [imageSize,setImageSize]=useState({width:1,height:1});
 useEffect(()=>{if(!imageUrl)return;const image=new window.Image();image.onload=()=>setImageSize({width:image.naturalWidth,height:image.naturalHeight});image.src=imageUrl;return()=>{image.onload=null;};},[imageUrl]);
 useEffect(()=>{if(!playing)return;let last=0;let frame=0;const tick=now=>{if(!last)last=now;const dt=Math.min(64,now-last);last=now;setProgress(p=>{const n=p+dt*Math.max(0.05,speed)/18000;return n>=1?0:n;});frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);},[playing,speed]);
 useEffect(()=>{if(!playing)setProgress(0);},[playing,path,curveX,curveY,launchX,launchY]);
 const start={x:86+clamp(launchX,-70,70)*.55,y:168-clamp(launchY,-120,120)*.55};
 const end={x:520+clamp(targetX,-100,100)*.55,y:164-clamp(targetY,-100,100)*.55};
 const control={x:303+clamp(curveX,-180,180)*.55,y:164-clamp(curveY,-300,300)*.55};
 const point=t=>{const offset=getProjectileTrajectoryOffset({type:path,progress:t,height:clamp(height,0,300),curveX,curveY,targetX,targetY});return{x:start.x+(end.x-start.x)*t+offset.x*.55,y:start.y+(end.y-start.y)*t-offset.y*.55};};
 const pathD=useMemo(()=>Array.from({length:51},(_,i)=>point(i/50)).map((p,i)=>(i?"L":"M")+p.x.toFixed(1)+","+p.y.toFixed(1)).join(" "),[path,curveX,curveY,launchX,launchY,targetX,targetY,height]);
 const pointer=(e)=>{const rect=e.currentTarget.ownerSVGElement?.getBoundingClientRect()||e.currentTarget.getBoundingClientRect();const x=(e.clientX-rect.left)*560/rect.width,y=(e.clientY-rect.top)*240/rect.height;if(drag==="launch"){setLaunchX(Math.round(clamp((x-86)/.55,-70,70)));setLaunchY(Math.round(clamp((168-y)/.55,-120,120)));}if(drag==="curve"){setCurveX(Math.round(clamp((x-303)/.55,-180,180)));setCurveY(Math.round(clamp((164-y)/.55,-300,300)));}if(drag==="target"){setTargetX(Math.round(clamp((x-520)/.55,-100,100)));setTargetY(Math.round(clamp((164-y)/.55,-100,100)));}};
 const current=point(progress);
 const frameIndex=Math.min(Math.max(1,frameCount)-1,Math.floor(progress*Math.max(1,frameCount)));
 const frameColumn=frameIndex%Math.max(1,columns),frameRow=Math.floor(frameIndex/Math.max(1,columns));
 const frameWidth=imageSize.width/Math.max(1,columns),frameHeight=imageSize.height/Math.max(1,rows);
 return <section className="studio-trajectory-editor">
  <div className="studio-trajectory-heading"><div><h4>محرّر مسار القذيفة</h4><small>اسحب نقطة الإطلاق أو نقطة الإصابة أو مقبض المنحنى بالماوس. حرّك القيم من الحقول أيضاً.</small></div><div className="studio-trajectory-actions"><button type="button" onClick={()=>{setProgress(0);setPlaying(false);}}>إعادة ضبط</button><button type="button" onClick={()=>setPlaying(v=>!v)}>{playing?"إيقاف":"تشغيل المعاينة"}</button></div></div>
  <svg className="studio-trajectory-canvas" viewBox="0 0 560 240" role="img" aria-label="محرر مرئي لمسار القذيفة">
   <defs><pattern id="trajectory-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M 28 0 L 0 0 0 28" fill="none" stroke="#ffffff" strokeOpacity=".09" strokeWidth="1"/></pattern></defs>
   <rect width="560" height="240" rx="14" fill="#101a17"/><rect width="560" height="240" fill="url(#trajectory-grid)"/>
   <path d="M0 190 H560" stroke="#78916e" strokeDasharray="5 6" opacity=".5"/>
   <path d={pathD} fill="none" stroke="#f7c65f" strokeWidth="3" strokeDasharray="7 5"/>
   {path==="bezier"&&<path d={`M${start.x},${start.y} L${control.x},${control.y} L${end.x},${end.y}`} stroke="#7ed9c0" strokeDasharray="4 5" fill="none" opacity=".7"/>}
   <circle cx={end.x} cy={end.y} r="17" fill="#a84f48" stroke="#ffc9a7" strokeWidth="2" style={{cursor:"grab"}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);setDrag("target");}} onPointerMove={e=>{if(drag==="target")pointer(e);}} onPointerUp={()=>setDrag("")}/><text x={end.x} y={end.y+4} textAnchor="middle" fill="white" fontSize="10">هدف</text>
   {plantUrl&&<image href={plantUrl} x="35" y="115" width="74" height="74" preserveAspectRatio="xMidYMid meet"/>}
   {imageUrl&&<svg x={current.x-15} y={current.y-15} width="30" height="30" viewBox={`${frameColumn*frameWidth} ${frameRow*frameHeight} ${frameWidth} ${frameHeight}`} preserveAspectRatio="xMidYMid meet" overflow="hidden" transform={`rotate(${rotation} ${current.x} ${current.y})`}><image href={imageUrl} x="0" y="0" width={imageSize.width} height={imageSize.height} preserveAspectRatio="none"/></svg> }
   {!imageUrl&&<circle cx={current.x} cy={current.y} r="10" fill="#ffc247" stroke="#fff1c1" strokeWidth="2"/>}
   <circle cx={start.x} cy={start.y} r="11" fill="#4abf8a" stroke="white" strokeWidth="2" style={{cursor:"grab"}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);setDrag("launch");}} onPointerMove={e=>{if(drag==="launch")pointer(e);}} onPointerUp={()=>setDrag("")}/>
   {path==="bezier"&&<circle cx={control.x} cy={control.y} r="10" fill="#55c8d9" stroke="white" strokeWidth="2" style={{cursor:"grab"}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);setDrag("curve");}} onPointerMove={e=>{if(drag==="curve")pointer(e);}} onPointerUp={()=>setDrag("")}/>}
   <text x="20" y="22" fill="#b8c9b5" fontSize="11">الأخضر: الإطلاق · الأحمر: نقطة الإصابة</text>
   {path==="bezier"&&<text x="310" y="22" fill="#8be0e7" fontSize="11">المقبض الأزرق: شكل المنحنى</text>}
  </svg>
  <div className="studio-grid">
   <label>نوع المسار<select value={path} onChange={e=>setPath(e.target.value)}><option value="arc">قوس ناعم</option><option value="straight">مستقيم</option><option value="sine">موجة جيبية</option><option value="bezier">منحنى قابل للتحكم (Bezier)</option></select></label>
   <label>سرعة القذيفة<input type="number" min="60" max="1200" value={speed} onChange={e=>setSpeed(clamp(e.target.value,60,1200))}/></label>
   <label>إزاحة الإطلاق الأفقية<input type="number" min="-70" max="70" value={launchX} onChange={e=>setLaunchX(clamp(e.target.value,-70,70))}/></label>
   <label>إزاحة الإطلاق العمودية<input type="number" min="-120" max="120" value={launchY} onChange={e=>setLaunchY(clamp(e.target.value,-120,120))}/></label>\n   <label>إزاحة نقطة الإصابة أفقياً<input type="number" min="-100" max="100" value={targetX} onChange={e=>setTargetX(clamp(e.target.value,-100,100))}/></label>\n   <label>إزاحة نقطة الإصابة عمودياً<input type="number" min="-100" max="100" value={targetY} onChange={e=>setTargetY(clamp(e.target.value,-100,100))}/></label>
   {path!=="straight"&&path!=="bezier"&&<label>ارتفاع القوس<input type="number" min="0" max="300" value={height} onChange={e=>setHeight(clamp(e.target.value,0,300))}/></label>}
   {path==="bezier"&&<><label>انحراف المقبض أفقياً<input type="number" min="-180" max="180" value={curveX} onChange={e=>setCurveX(clamp(e.target.value,-180,180))}/></label><label>ارتفاع المقبض<input type="number" min="-300" max="300" value={curveY} onChange={e=>setCurveY(clamp(e.target.value,-300,300))}/></label></>}
   <label>دوران صورة القذيفة<input type="number" min="0" max="360" value={rotation} onChange={e=>setRotation(clamp(e.target.value,0,360))}/></label>
  </div>
  <small className="studio-field-help">المعاينة توضح المسار والسرعة والموضع بصرياً. تُحفظ قيم المسار مع ملف النبتة وتُطبّق في محرك المعركة.</small>
 </section>;
}
