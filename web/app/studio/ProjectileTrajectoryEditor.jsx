"use client";
import { useEffect, useMemo, useState } from "react";
import { getProjectileTrajectoryOffset, getProjectileLaunchPoint } from "../../game/studio/projectileTrajectory.mjs";
import gridCalibration from "../../game/data/farm-grid-calibration.json";

const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));
const BOARD={width:840,height:525,columns:8,rows:5,cellSize:105};
const DEFAULT_POINTS=[{progress:0,x:0,y:0},{progress:.5,x:0,y:110},{progress:1,x:0,y:0}];
export default function ProjectileTrajectoryEditor({
 imageUrl,plantUrl,frameCount=1,rows=1,columns=1,
 plantFrameCount=1,plantRows=1,plantColumns=1,plantSizePercent=100,
 idleStartFrame=0,idleEndFrame=0,idleFps=6,
 points=DEFAULT_POINTS,setPoints,plantFps=8,targetX=0,targetY=0,
 launchX,setLaunchX,launchY,setLaunchY,
 speed,setSpeed,collisionRadius,setCollisionRadius,height,setHeight,
 rotation,setRotation,playing,setPlaying
}){
 const [progress,setProgress]=useState(0);
 const [drag,setDrag]=useState(null);
 const [selectedPoint,setSelectedPoint]=useState(-1);
 const [imageSize,setImageSize]=useState({width:1,height:1});
 const [plantImageSize,setPlantImageSize]=useState({width:1,height:1});
 const [plantFrame,setPlantFrame]=useState(0);
 const [plantPlaying,setPlantPlaying]=useState(false);
 const [projectileFrame,setProjectileFrame]=useState(0);
 const [projectilePlaying,setProjectilePlaying]=useState(false);
 const [projectileFps,setProjectileFps]=useState(10);
 // Asset/preview synchronization effects intentionally normalize derived editor state.
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{if(!imageUrl){setImageSize({width:1,height:1});return;}const image=new window.Image();image.onload=()=>{setImageSize({width:image.naturalWidth,height:image.naturalHeight});};image.src=imageUrl;return()=>{image.onload=null;};},[imageUrl]);
 // Asset/preview synchronization effects intentionally normalize derived editor state.
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{if(!plantUrl){setPlantImageSize({width:1,height:1});return;}const image=new window.Image();image.onload=()=>setPlantImageSize({width:image.naturalWidth,height:image.naturalHeight});image.src=plantUrl;return()=>{image.onload=null;};},[plantUrl]);
 // Asset/preview synchronization effects intentionally normalize derived editor state.
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{setPlantFrame(clamp(idleStartFrame,0,Math.max(0,plantFrameCount-1)));setPlantPlaying(false);},[plantUrl,plantFrameCount,plantRows,plantColumns,idleStartFrame]);
 // Asset/preview synchronization effects intentionally normalize derived editor state.
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{if(!plantPlaying)return;const first=0;const last=Math.max(0,plantFrameCount-1);setPlantFrame(first);const timer=window.setInterval(()=>setPlantFrame(frame=>frame>=last?first:Math.min(last,frame+1)),1000/Math.max(1,plantFps||1));return()=>window.clearInterval(timer);},[plantPlaying,plantFps,plantFrameCount]);
 useEffect(()=>{if(!playing)return;let last=0,raf=0;const tick=now=>{if(!last)last=now;const dt=Math.min(64,now-last);last=now;setProgress(p=>Math.min(1,p+dt*Math.max(.05,speed)/24000));raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);},[playing,speed]);
 useEffect(()=>{if(playing&&progress>=1)setPlaying(false);},[playing,progress,setPlaying]);
 // Asset/preview synchronization effects intentionally normalize derived editor state.
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{setProgress(0);},[points,launchX,launchY,height,targetX,targetY]);
 useEffect(()=>{if((!playing&&!projectilePlaying)||!imageUrl)return;const timer=window.setInterval(()=>setProjectileFrame(frame=>(frame+1)%Math.max(1,frameCount)),1000/Math.max(1,projectileFps));return()=>window.clearInterval(timer);},[playing,projectilePlaying,imageUrl,frameCount,projectileFps]);
 const laneOrigin={x:105,y:262.5};
 // Runtime plants are anchored 5px above the lane center in the upper rows.
 const plantAnchor={x:laneOrigin.x,y:laneOrigin.y-5};
 const start=getProjectileLaunchPoint({laneX:laneOrigin.x,laneY:laneOrigin.y,offsetX:clamp(launchX,-300,300),offsetY:clamp(launchY,-300,300)});
 const end={x:735,y:262.5};
 const targetHead={x:end.x,y:end.y-10};
 const baseAt=t=>({x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t});
 const normalizedPoints=useMemo(()=>{const source=Array.isArray(points)&&points.length>=2?points:DEFAULT_POINTS;const origin=source[0]||{x:0,y:0};return source.map(item=>({...item,x:Number(item.x||0)-Number(origin.x||0),y:Number(item.y||0)-Number(origin.y||0)}));},[points]);
 const offsetAt=t=>getProjectileTrajectoryOffset({type:"custom",progress:t,points:normalizedPoints,height,targetX,targetY});
 const rawPointAt=t=>{const base=baseAt(t),offset=offsetAt(t);return{x:base.x+offset.x,y:base.y-offset.y};};
 const rawEnd=rawPointAt(1);
 const headCorrectionAt=t=>({x:(targetHead.x-rawEnd.x)*t,y:(targetHead.y-rawEnd.y)*t});
 const pointAt=t=>{const raw=rawPointAt(t),correction=headCorrectionAt(t);return{x:raw.x+correction.x,y:raw.y+correction.y};};
 const pathD=useMemo(()=>Array.from({length:101},(_,i)=>pointAt(i/100)).map((p,i)=>(i?"L":"M")+p.x.toFixed(1)+","+p.y.toFixed(1)).join(" "),[normalizedPoints,launchX,launchY,height,targetX,targetY]);
 const current=pointAt(progress);
 const frameIndex=Math.min(Math.max(1,frameCount)-1,projectileFrame);
 const frameColumn=frameIndex%Math.max(1,columns),frameRow=Math.floor(frameIndex/Math.max(1,columns));
 const frameWidth=imageSize.width/Math.max(1,columns),frameHeight=imageSize.height/Math.max(1,rows);
 const safePlantFrame=Math.min(Math.max(0,plantFrameCount-1),plantFrame);
 const plantColumn=safePlantFrame%Math.max(1,plantColumns),plantRow=Math.floor(safePlantFrame/Math.max(1,plantColumns));
 const plantFrameWidth=plantImageSize.width/Math.max(1,plantColumns),plantFrameHeight=plantImageSize.height/Math.max(1,plantRows);
 const plantScale=clamp(plantSizePercent,25,200)/100;
 const previewRow=2;
 const laneCenters=gridCalibration.grid.controlPoints.map((row,index)=>index<gridCalibration.grid.rows?(row[0].y+gridCalibration.grid.controlPoints[index+1][0].y)/2:null).filter(Number.isFinite);
 const previewLaneGap=laneCenters[previewRow+1]-laneCenters[previewRow];
 const plantPerspective=clamp(previewLaneGap/54,.62,1.08);
 const plantHeight=88*plantPerspective*plantScale;
 const plantWidth=Math.min(plantHeight*(plantFrameWidth/Math.max(1,plantFrameHeight)),100*plantPerspective*plantScale);
 const pointerPosition=e=>{const svg=e.currentTarget;const rect=svg.getBoundingClientRect();return{x:(e.clientX-rect.left)*BOARD.width/rect.width,y:(e.clientY-rect.top)*BOARD.height/rect.height};};
 const movePointer=e=>{if(!drag)return;const p=pointerPosition(e);if(drag.type==="launch"){setLaunchX(Math.round(clamp(p.x-laneOrigin.x,-300,300)));setLaunchY(Math.round(clamp(p.y-laneOrigin.y,-300,300)));return;}if(drag.type==="waypoint"){const t=normalizedPoints[drag.index]?.progress;if(t==null)return;const base=baseAt(t),correction=headCorrectionAt(t);const next=normalizedPoints.map((item,index)=>index===drag.index?{...item,x:Math.round(clamp((p.x-base.x-correction.x),-1000,1000)),y:Math.round(clamp((base.y+correction.y-p.y),-1000,1000))}:item);setPoints(next);}};
 const addWaypoint=e=>{const p=pointerPosition(e);const t=clamp((p.x-start.x)/(end.x-start.x),.02,.98);if(normalizedPoints.length>=18||normalizedPoints.some(item=>Math.abs(item.progress-t)<.005))return;const base=baseAt(t),correction=headCorrectionAt(t);const next=[...normalizedPoints,{progress:Number(t.toFixed(3)),x:Math.round(clamp((p.x-base.x-correction.x),-1000,1000)),y:Math.round(clamp((base.y+correction.y-p.y),-1000,1000))}].sort((a,b)=>a.progress-b.progress);setPoints(next);setSelectedPoint(next.findIndex(item=>item.progress===Number(t.toFixed(3))));};
 const removeWaypoint=()=>{if(selectedPoint<=0||selectedPoint>=normalizedPoints.length-1)return;setPoints(normalizedPoints.filter((_,index)=>index!==selectedPoint));setSelectedPoint(-1);};
 const previousFrame=()=>setPlantFrame(frame=>Math.max(0,frame-1));
 const nextFrame=()=>setPlantFrame(frame=>Math.min(Math.max(0,plantFrameCount-1),frame+1));
 return <section className="studio-trajectory-editor studio-motion-editor">
  <div className="studio-trajectory-heading"><div><h4>محرر حركة النبتة والقذيفة</h4><small>انقر مرتين على المسار لإضافة دبوس واسحبه لتشكيل المسار. اسحب صورة القذيفة نفسها أو مقبض الإطلاق لضبط مكان خروجها وارتفاعها.</small></div><div className="studio-trajectory-actions"><button type="button" onClick={()=>{setProgress(0);setPlaying(false);}}>إعادة موضع التشغيل</button><button type="button" onClick={()=>{if(!playing&&progress>=1)setProgress(0);setPlaying(v=>!v);}}>{playing?"إيقاف القذيفة":"تشغيل المسار"}</button></div></div>
  <div className="studio-battle-preview-legend"><span>🌱 النبتة</span><span>☄️ القذيفة</span><span>● دبابيس المسار (انقر مرتين لإضافة)</span></div>
  <svg className="studio-trajectory-canvas studio-battle-preview studio-motion-canvas" viewBox="0 0 840 525" role="img" aria-label="محرر تفاعلي لمسار القذيفة" onPointerMove={movePointer} onPointerUp={()=>setDrag(null)} onPointerCancel={()=>setDrag(null)} onDoubleClick={addWaypoint}>
   <defs>
    <linearGradient id="motion-grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#527d45"/><stop offset="1" stopColor="#294c32"/></linearGradient>
    <pattern id="motion-ground" width="105" height="105" patternUnits="userSpaceOnUse"><rect width="105" height="75" fill="url(#motion-grass)"/><path d="M0 0H105V75H0Z" fill="none" stroke="#b4d28a" strokeOpacity=".25"/><path d="M12 55l6-9m15 13 5-8m42-25 5-7" stroke="#c6dc9b" strokeOpacity=".2" strokeWidth="2"/></pattern>
   </defs>
   <rect width="840" height="525" rx="16" fill="#17251b"/><rect x="0" y="0" width="840" height="525" fill="url(#motion-ground)"/>
   {Array.from({length:BOARD.columns*BOARD.rows},(_,i)=><rect key={i} x={(i%BOARD.columns)*BOARD.cellSize} y={Math.floor(i/BOARD.columns)*BOARD.cellSize} width={BOARD.cellSize} height={BOARD.cellSize} fill={i%2?"#ffffff":"#000000"} fillOpacity=".035" stroke="#d2e9b3" strokeOpacity=".25"/>)}
   <path d="M0 350H840" stroke="#d4e7b4" strokeDasharray="6 7" opacity=".3"/>
   <path d={pathD} fill="none" stroke="#102719" strokeWidth="13" strokeLinecap="round" opacity=".55" pointerEvents="none"/><path d={pathD} fill="none" stroke="#f7d36c" strokeWidth="4" strokeDasharray="9 7" strokeLinecap="round" pointerEvents="none"/>
   <ellipse cx={plantAnchor.x} cy={plantAnchor.y+5} rx={Math.max(24,plantWidth*.46)} ry={8*plantScale} fill="#102719" opacity=".55"/>
   {plantUrl&&<svg x={plantAnchor.x-plantWidth/2} y={plantAnchor.y-plantHeight+2} width={plantWidth} height={plantHeight} viewBox={`${plantColumn*plantFrameWidth} ${plantRow*plantFrameHeight} ${plantFrameWidth} ${plantFrameHeight}`} preserveAspectRatio="xMidYMid meet" overflow="hidden"><image href={plantUrl} x="0" y="0" width={plantImageSize.width} height={plantImageSize.height} preserveAspectRatio="none"/></svg>}
   {!plantUrl&&<g><circle cx={plantAnchor.x} cy={plantAnchor.y-30} r="30" fill="#72bd54"/><path d="M100 232Q58 188 68 170Q96 172 103 212Q113 176 140 179Q143 208 104 233" fill="#9cdb70"/></g>}
   <circle cx={start.x} cy={start.y} r="15" fill="#37c990" stroke="#fff" strokeWidth="3" style={{cursor:"move"}} onPointerDown={e=>{e.stopPropagation();e.currentTarget.ownerSVGElement.setPointerCapture(e.pointerId);setDrag({type:"launch"});}}/>
   <text x={start.x+18} y={start.y-15} fill="#fff" fontSize="13">فوهة الإطلاق · اسحبها</text>
   {normalizedPoints.map((item,index)=>{if(index===0)return null;const p=pointAt(item.progress);return <g key={index}><circle cx={p.x} cy={p.y} r={selectedPoint===index?12:9} fill={index===0||index===normalizedPoints.length-1?"#35c98a":"#4dc6e8"} stroke="#fff" strokeWidth="2" style={{cursor:"grab"}} onPointerDown={e=>{e.stopPropagation();e.currentTarget.ownerSVGElement.setPointerCapture(e.pointerId);setSelectedPoint(index);setDrag({type:"waypoint",index});}}/><text x={p.x} y={p.y-17} fill="#fff" fontSize="11" textAnchor="middle">{index+1}</text></g>;})}
   {progress<1&&imageUrl&&<svg x={current.x-24} y={current.y-24} width="48" height="48" style={{cursor:progress===0?"grab":"default"}} onPointerDown={e=>{if(progress>0.001)return;e.stopPropagation();e.currentTarget.ownerSVGElement.setPointerCapture(e.pointerId);setDrag({type:"launch"});}} viewBox={`${frameColumn*frameWidth} ${frameRow*frameHeight} ${frameWidth} ${frameHeight}`} preserveAspectRatio="xMidYMid meet" overflow="hidden" transform={`rotate(${rotation} ${current.x} ${current.y} )`}><image href={imageUrl} x="0" y="0" width={imageSize.width} height={imageSize.height} preserveAspectRatio="none"/></svg>}
   {!imageUrl&&progress<1&&<circle cx={current.x} cy={current.y} r="13" fill="#ffc247" stroke="#fff1c1" strokeWidth="2"/>}
   {progress>=1&&<g transform={`translate(${targetHead.x} ${targetHead.y} )`} pointerEvents="none"><circle r="24" fill="#ffd76b" fillOpacity=".28" stroke="#ffe28a" strokeWidth="3"/><path d="M0-31L6-13L23-22L15-5L32 0L14 6L23 23L5 14L0 32L-6 14L-23 23L-14 5L-32 0L-14-6L-23-23L-5-14Z" fill="#ffbd4a" stroke="#fff0b2" strokeWidth="2"/><circle r="8" fill="#fff3b0"/></g>}
   <circle cx={targetHead.x} cy={targetHead.y} r={Math.max(18,clamp(collisionRadius,4,100)*.32)} fill="none" stroke="#ff927d" strokeDasharray="4 4" strokeWidth="2" pointerEvents="none"/>
<g transform={`translate(${end.x} ${end.y})`}><ellipse cy="25" rx="24" ry="7" fill="#102719" opacity=".5"/><path d="M-16 14Q-27-3-15-21Q0-34 15-21Q27-3 16 14Z" fill="#718b79" stroke="#d4e5c8" strokeWidth="2"/><circle cx="-6" cy="-8" r="3" fill="#fff"/><circle cx="7" cy="-8" r="3" fill="#fff"/><circle cx="-6" cy="-8" r="1.5" fill="#26352b"/><circle cx="7" cy="-8" r="1.5" fill="#26352b"/></g>
   <text x="20" y="30" fill="#d7e8c9" fontSize="14">ساحة المعركة · 8 × 5 خلايا متساوية</text><text x="105" y="505" fill="#e6f2d9" fontSize="12" textAnchor="middle">النبتة · موضع الارتكاز مطابق للعبة</text><text x="735" y="505" fill="#e6f2d9" fontSize="12" textAnchor="middle">الهدف</text>
  </svg>
  <label className="studio-motion-progress">موضع القذيفة على المسار<input type="range" min="0" max="1000" step="1" value={Math.round(progress*1000)} onChange={e=>{setPlaying(false);setProgress(Number(e.target.value)/1000);}}/><span>{Math.round(progress*100)}%</span></label>
  <div className="studio-motion-toolbar">
   <div className="studio-motion-frame-controls"><b>معاينة إطارات النبتة</b><div className="studio-trajectory-actions"><button type="button" onClick={()=>setPlantFrame(0)}>الأول</button><button type="button" onClick={previousFrame}>◀ السابق</button><span>الإطار {plantFrame+1} / {Math.max(1,plantFrameCount)}</span><button type="button" onClick={nextFrame}>التالي ▶</button><button type="button" onClick={()=>setPlantFrame(Math.max(0,plantFrameCount-1))}>الأخير</button><button type="button" onClick={()=>setPlantPlaying(v=>!v)}>{plantPlaying?"إيقاف":"تشغيل الإطارات"}</button></div></div>
   <div className="studio-motion-frame-controls"><b>معاينة إطارات القذيفة</b><div className="studio-trajectory-actions"><button type="button" onClick={()=>setProjectileFrame(0)}>الأول</button><button type="button" onClick={()=>setProjectileFrame(frame=>Math.max(0,frame-1))}>◀</button><span>الإطار {projectileFrame+1} / {Math.max(1,frameCount)}</span><button type="button" onClick={()=>setProjectileFrame(frame=>Math.min(Math.max(0,frameCount-1),frame+1))}>التالي ▶</button><button type="button" onClick={()=>setProjectileFrame(Math.max(0,frameCount-1))}>الأخير</button><button type="button" onClick={()=>setProjectilePlaying(value=>{if(!value)setProjectileFrame(0);return !value;})}>{projectilePlaying?"إيقاف الإطارات":"تشغيل الإطارات"}</button></div><label className="studio-motion-fps">سرعة إطارات القذيفة<input type="range" min="1" max="24" value={projectileFps} onChange={e=>setProjectileFps(Number(e.target.value))}/><span>{projectileFps} FPS</span></label></div>
  </div>
  <div className="studio-grid studio-motion-settings">
   <label>سرعة القذيفة<input type="number" inputMode="numeric" min="60" max="1200" step="1" value={speed} onChange={e=>setSpeed(e.target.value===""?"":Number(e.target.value))} onBlur={()=>setSpeed(clamp(speed,60,1200))}/></label>
   <label>إزاحة الإطلاق الأفقية<input type="number" inputMode="numeric" min="-300" max="300" step="1" value={launchX} onChange={e=>setLaunchX(e.target.value===""?"":Number(e.target.value))} onBlur={()=>setLaunchX(clamp(launchX,-300,300))}/></label>
   <label>ارتفاع / إزاحة الإطلاق العمودية<input type="number" inputMode="numeric" min="-300" max="300" step="1" value={launchY} onChange={e=>setLaunchY(e.target.value===""?"":Number(e.target.value))} onBlur={()=>setLaunchY(clamp(launchY,-300,300))}/></label>
   <label>دوران القذيفة (درجة)<input type="number" inputMode="numeric" min="0" max="360" step="1" value={rotation} onChange={e=>setRotation(e.target.value===""?"":Number(e.target.value))} onBlur={()=>setRotation(clamp(rotation,0,360))}/></label>
   <label>نصف قطر الإصابة<input type="number" inputMode="numeric" min="4" max="100" step="1" value={collisionRadius} onChange={e=>setCollisionRadius(e.target.value===""?"":Number(e.target.value))} onBlur={()=>setCollisionRadius(clamp(collisionRadius,4,100))}/></label>
   <label>ارتفاع المسار العام<input type="number" inputMode="numeric" min="-300" max="300" step="1" value={height} onChange={e=>setHeight(e.target.value===""?"":Number(e.target.value))} onBlur={()=>setHeight(clamp(height,-300,300))}/></label>
  </div>
  <div className="studio-motion-point-actions"><span>{normalizedPoints.length} نقاط تحكم · {selectedPoint>=0?`النقطة المحددة ${selectedPoint+1}`:"حدد دبوساً لتعديله أو حذفه"}</span><button type="button" onClick={()=>{const gaps=normalizedPoints.slice(1).map((item,index)=>({progress:(item.progress+normalizedPoints[index].progress)/2,index:index+1})).sort((a,b)=>(b.progress-a.progress));const progressValue=gaps[0]?.progress??.5;const next=[...normalizedPoints,{progress:Number(progressValue.toFixed(3)),x:0,y:0}].sort((a,b)=>a.progress-b.progress);setPoints(next);setSelectedPoint(next.findIndex(item=>item.progress===Number(progressValue.toFixed(3))));}} disabled={normalizedPoints.length>=18}>إضافة نقطة</button><button type="button" onClick={removeWaypoint} disabled={selectedPoint<=0||selectedPoint>=normalizedPoints.length-1}>حذف النقطة المحددة</button><button type="button" onClick={()=>{setPoints(DEFAULT_POINTS);setSelectedPoint(-1);}}>إعادة المسار الافتراضي</button></div>
  <small className="studio-field-help">النقاط محفوظة كإزاحات فعلية بالبكسل، ويستخدم محرك المعركة منحنى Catmull–Rom المار عبرها. تبقى نسبتا البداية والنهاية ثابتتين، ويمكن تعديل إزاحتهما.</small>
 </section>;
}
