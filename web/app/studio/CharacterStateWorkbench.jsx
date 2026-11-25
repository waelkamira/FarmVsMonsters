"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { inferSpriteGrid } from "../../game/studio/spriteSheetGrid.mjs";
import { CHARACTER_STATUS_STATES } from "../../game/studio/characterStateAnimations.mjs";
import { getEffect, listEffects } from "../../game/vfx/effects/effectLibrary.mjs";
import { createEffectPreview } from "../../game/vfx/effects/effectPreview.mjs";

function FramePreview({ src, rows = 1, columns = 1, frameCount = 1, fps = 8, loop = true, label, startFrame = 0 }) {
  const [frame, setFrame] = useState(0);
  const canvasRef = useRef(null);
  const count = Math.max(1, Number(frameCount) || 1);
  useEffect(() => {
    if (!src || count < 2) return;
    const delay = Math.max(33, 1000 / Math.max(1, Math.min(30, Number(fps) || 8)));
    const timer = window.setInterval(() => setFrame((current) => current + 1 >= count ? (loop ? 0 : current) : current + 1), delay);
    return () => window.clearInterval(timer);
  }, [src, count, fps, loop]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !src) return;
    const image = new Image();
    image.onload = () => {
      const frameWidth = Math.max(1, Math.floor(image.naturalWidth / Math.max(1, columns)));
      const frameHeight = Math.max(1, Math.floor(image.naturalHeight / Math.max(1, rows)));
      const absoluteFrame = Math.max(0, Number(startFrame) || 0) + frame;
      const column = absoluteFrame % Math.max(1, columns);
      const row = Math.floor(absoluteFrame / Math.max(1, columns));
      canvas.width = frameWidth;
      canvas.height = frameHeight;
      const context = canvas.getContext("2d");
      context?.clearRect(0, 0, frameWidth, frameHeight);
      context?.drawImage(image, column * frameWidth, row * frameHeight, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
    };
    image.src = src;
  }, [src, rows, columns, frame, startFrame]);
  return <div className="studio-state-preview-wrap">
    <canvas ref={canvasRef} className="studio-state-preview" role="img" aria-label={label || "معاينة إطارات الشخصية"} />
    <div className="studio-state-preview-meta"><span>الإطار {frame + 1} / {count}</span><span>{fps} FPS</span></div>
    <input aria-label="تحديد إطار المعاينة" type="range" min="0" max={count - 1} value={frame} onChange={(event) => setFrame(Number(event.target.value))} />
  </div>;
}

function appendExistingCombat(form, asset) {
  const combat = asset.combat || {};
  const projectile = combat.projectile || {};
  const values = {
    type: asset.type, id: asset.id, name: asset.name || asset.id,
    rows: String(asset.rows || 1), columns: String(asset.columns || 1),
    frameCount: String(asset.frameCount || ((asset.rows || 1) * (asset.columns || 1))),
    replace: "true", removeProjectile: "false",
    behavior: combat.mode || "",
    energyCost: String(combat.energyCost ?? 60), hp: String(combat.hp ?? 150),
    damage: String(combat.damage ?? 30), cooldownMs: String(combat.cooldownMs ?? 1800),
    range: String(combat.range ?? 180), energyAmount: String(combat.energyAmount ?? 15),
    energyIntervalMs: String(combat.energyIntervalMs ?? 12000),
    projectileSpeed: String(combat.projectileSpeed ?? 280),
    projectileCollisionRadius: String(combat.projectileCollisionRadius ?? 22),
    projectileHeight: String(combat.projectileHeight ?? 0),
    projectileEffectColor: combat.projectileEffectColor || "#ffc247",
    projectileRotation: String(combat.projectileRotation ?? 0),
    projectileTrajectoryType: combat.projectileTrajectoryType || "arc",
    projectilePathPoints: JSON.stringify(combat.projectilePathPoints || null),
    projectileCurveX: String(combat.projectileCurveX ?? 0),
    projectileCurveY: String(combat.projectileCurveY ?? 110),
    projectileLaunchOffsetX: String(combat.projectileLaunchOffsetX ?? 14),
    projectileLaunchOffsetY: String(combat.projectileLaunchOffsetY ?? -30),
    projectileTargetOffsetX: String(combat.projectileTargetOffsetX ?? 0),
    projectileTargetOffsetY: String(combat.projectileTargetOffsetY ?? 0),
    sizePercent: String(combat.sizePercent ?? 100), flipX: String(Boolean(asset.flipX)),
    animationProfile: JSON.stringify(asset.animationProfile || null),
    rigProfile: JSON.stringify(asset.rigProfile || null),
    monsterProfile: JSON.stringify(asset.monsterProfile || {}),
    projectileAssetId: projectile.managed ? projectile.id : "",
    projectileFrameCount: String(projectile.frameCount || 1),
    projectileRows: String(projectile.rows || 1),
    projectileColumns: String(projectile.columns || 1)
  };
  Object.entries(values).forEach(([key, value]) => form.set(key, value));
}

export default function CharacterStateWorkbench({ asset, onSaved }) {
  const [selectedClip, setSelectedClip] = useState("idle");
  const [selectedState, setSelectedState] = useState(CHARACTER_STATUS_STATES[0].id);
  const [previewEffectId, setPreviewEffectId] = useState(() => listEffects({ appliesTo: asset.type })[0]?.id || "burn");
  const effectCanvasRef = useRef(null);
  const effectPreviewRef = useRef(null);
  const [file, setFile] = useState(null);
  const [grid, setGrid] = useState({ rows: 3, columns: 3, frameCount: 9 });
  const [fps, setFps] = useState(10);
  const [loop, setLoop] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : "", [file]);
  const states = asset.stateAnimations || {};
  const selectedStateData = states[selectedState] || null;
  const selectedStateDefinition = CHARACTER_STATUS_STATES.find((state) => state.id === selectedState) || CHARACTER_STATUS_STATES[0];
  const clip = asset.animationProfile?.[selectedClip] || asset.animationProfile?.idle || { startFrame: 0, endFrame: 0, fps: 8, loop: true };
  const baseFrameCount = Math.max(1, Number(asset.frameCount) || Number(asset.rows || 1) * Number(asset.columns || 1));
  const baseClipCount = Math.max(1, Number(clip.endFrame) - Number(clip.startFrame) + 1);
  const baseClipUrl = asset.previewUrl || asset.path;
  const availablePreviewEffects = useMemo(() => listEffects({ appliesTo: asset.type }), [asset.type]);
  const previewEffect = getEffect(previewEffectId);
  const effectTarget = file && previewUrl ? { path: previewUrl, rows: grid.rows, columns: grid.columns, frameCount: grid.frameCount, fps, loop, startFrame: 0 } : selectedStateData ? { ...selectedStateData, path: selectedStateData.previewUrl || selectedStateData.path, startFrame: 0 } : { path: baseClipUrl, rows: asset.rows || 1, columns: asset.columns || 1, frameCount: baseClipCount, fps: clip.fps || 8, loop: clip.loop !== false, startFrame: clip.startFrame || 0 };

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => {
    const canvas = effectCanvasRef.current;
    if (!canvas || !previewEffect || !effectTarget?.path) return;
    let active = true;
    let preview = null;
    const image = new Image();
    image.onload = () => {
      if (!active) return;
      const rows = Math.max(1, Number(effectTarget.rows) || 1);
      const columns = Math.max(1, Number(effectTarget.columns) || 1);
      const frameCount = Math.max(1, Number(effectTarget.frameCount) || rows * columns);
      const startFrame = Math.max(0, Number(effectTarget.startFrame) || 0);
      const fpsValue = Math.max(1, Number(effectTarget.fps) || 8);
      const targetRenderer = (context, centerX, centerY, effect, elapsed) => {
        const frameOffset = Math.floor((elapsed * fpsValue) / 1000);
        const frame = startFrame + (effectTarget.loop === false ? Math.min(frameCount - 1, frameOffset) : frameOffset % frameCount);
        const sourceX = (frame % columns) * (image.naturalWidth / columns);
        const sourceY = Math.floor(frame / columns) * (image.naturalHeight / rows);
        const sourceWidth = image.naturalWidth / columns;
        const sourceHeight = image.naturalHeight / rows;
        const scale = Math.min(1, 112 / sourceWidth, 124 / sourceHeight);
        const drawWidth = sourceWidth * scale;
        const drawHeight = sourceHeight * scale;
        let scaleX = 1;
        let scaleY = 1;
        let shake = 0;
        for (const layer of effect.layers) {
          const layerProgress = (elapsed - (layer.delay || 0)) / (layer.life || 1);
          if (layer.type === "squash" && layerProgress >= 0 && layerProgress <= 1) {
            const amount = layer.from ? 1 - layerProgress : Math.sin(Math.PI * layerProgress);
            scaleX = 1 + ((layer.sx || 1) - 1) * amount;
            scaleY = layer.from ? .2 + .8 * layerProgress : 1 + ((layer.sy || 1) - 1) * amount;
          }
          if (layer.type === "shake" && elapsed < layer.ms) shake = Math.max(shake, layer.intensity * 900 * (1 - elapsed / layer.ms));
        }
        const jitterX = Math.sin(elapsed * .071) * shake;
        const jitterY = Math.cos(elapsed * .083) * shake;
        context.save();
        context.translate(centerX + jitterX, centerY + jitterY);
        context.scale(scaleX, scaleY);
        context.fillStyle = "rgba(0,0,0,.28)";
        context.beginPath();
        context.ellipse(0, drawHeight * .43, drawWidth * .34, 5, 0, 0, Math.PI * 2);
        context.fill();
        context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        const tint = effect.layers.find((layer) => layer.type === "tint" && elapsed >= (layer.delay || 0) && elapsed <= (layer.delay || 0) + (layer.life || 0));
        if (tint) {
          const progress = (elapsed - (tint.delay || 0)) / (tint.life || 1);
          const alpha = tint.flicker ? (Math.floor(elapsed / 45) % 2 ? .18 : .62) : .58 * (1 - progress * .45);
          context.globalCompositeOperation = "source-atop";
          context.globalAlpha = alpha;
          context.fillStyle = "#" + (tint.color >>> 0).toString(16).padStart(6, "0").slice(-6);
          context.fillRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        }
        context.restore();
      };
      preview = createEffectPreview(canvas, previewEffect, { loop: true, targetRenderer });
      effectPreviewRef.current = preview;
      preview.start();
    };
    image.onerror = () => { if (active) effectPreviewRef.current = null; };
    image.src = effectTarget.path;
    return () => {
      active = false;
      preview?.stop();
      if (effectPreviewRef.current === preview) effectPreviewRef.current = null;
      image.onload = null;
      image.onerror = null;
    };
  }, [previewEffect, effectTarget.path, effectTarget.rows, effectTarget.columns, effectTarget.frameCount, effectTarget.fps, effectTarget.loop, effectTarget.startFrame]);

  useEffect(() => {
    let active = true;
    if (!file) return;
    createImageBitmap(file).then((image) => {
      const inferred = inferSpriteGrid(image.width, image.height, 9);
      image.close();
      if (active) setGrid({ ...inferred, frameCount: 9 });
    }).catch(() => { if (active) setMessage("تعذر قراءة أبعاد صورة الحالة."); });
    return () => { active = false; };
  }, [file]);

  async function saveStateAnimation() {
    if (!file) { setMessage("اختر Sprite Sheet لحالة الشخصية أولاً."); return; }
    if (grid.rows * grid.columns !== grid.frameCount) { setMessage("تقسيم الإطارات غير متطابق."); return; }
    setBusy(true); setMessage("");
    try {
      const form = new FormData();
      appendExistingCombat(form, asset);
      form.set("stateAnimationFile", file);
      form.set("stateId", selectedState);
      form.set("stateRows", String(grid.rows));
      form.set("stateColumns", String(grid.columns));
      form.set("stateFrameCount", String(grid.frameCount));
      form.set("stateFps", String(fps));
      form.set("stateLoop", String(loop));
      const response = await fetch("/api/studio/assets", { method: "POST", credentials: "same-origin", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر حفظ إطارات الحالة.");
      onSaved?.(data.asset);
      setFile(null);
      setMessage("تم حفظ إطارات حالة «" + selectedStateDefinition.label + "» كإصدار جديد من الأصل.");
    } catch (error) {
      setMessage(error.message || "فشل حفظ إطارات الحالة.");
    } finally {
      setBusy(false);
    }
  }

  const clips = asset.type === "monster"
    ? [{ id: "idle", label: "الخمول" }, { id: "move", label: "المشي" }, { id: "attack", label: "الهجوم" }]
    : [{ id: "idle", label: "الخمول" }, { id: "attack", label: "الهجوم" }];

  return <section className="studio-detail-panel studio-character-workbench" data-testid="character-state-workbench">
    <div className="studio-workbench-heading"><div><small>CHARACTER ANIMATION LAB</small><h2>مختبر حركة وحالات الشخصية</h2></div><span>{asset.type === "monster" ? "مختبر الوحوش" : "مختبر النباتات"}</span></div>
    <p className="studio-detail-muted">اختبر إطارات الشخصية الأساسية أولاً، ثم جهّز Sprite Sheet منفصلاً لكل حالة وتأكّد من شكله وسرعته قبل اعتماد الأصل.</p>

    <section className="studio-state-stage">
      <div className="studio-state-section-head"><h3>1 · اختبار الحركة الأساسية</h3><span>{baseFrameCount} إطار أساسي</span></div>
      <div className="studio-state-tabs" role="tablist" aria-label="حركات الشخصية">
        {clips.map((item) => <button key={item.id} type="button" className={selectedClip === item.id ? "active" : ""} onClick={() => setSelectedClip(item.id)}>{item.label}</button>)}
      </div>
      <FramePreview key={"base-" + selectedClip + "-" + baseClipUrl + "-" + baseClipCount} src={baseClipUrl} rows={asset.rows || 1} columns={asset.columns || 1} frameCount={baseClipCount} fps={clip.fps || 8} loop={clip.loop !== false} startFrame={clip.startFrame || 0} label={asset.name + " " + selectedClip} />
      <p className="studio-detail-muted">المقطع المحدد يستخدم الإطارات {clip.startFrame ?? 0} إلى {clip.endFrame ?? 0} من الصورة الأساسية. راجع تناسق الوضعيات قبل إضافة حالات التأثير.</p>
    </section>

    <section className="studio-state-stage">
      <div className="studio-state-section-head"><h3>2 · إطارات حالات التأثير</h3><span>{Object.keys(states).length} حالة محفوظة</span></div>
      <label className="studio-state-select">اختر الحالة
        <select value={selectedState} onChange={(event) => { setSelectedState(event.target.value); setFile(null); setMessage(""); }}>
          {CHARACTER_STATUS_STATES.map((state) => <option key={state.id} value={state.id}>{state.label}</option>)}
        </select>
      </label>
      <p className="studio-detail-muted">{selectedStateDefinition.hint} هذه الإطارات خاصة بمظهر الشخصية، ويمكن استخدامها مع مؤثرات الجسيمات والصوت من مكتبة التأثيرات.</p>
      {selectedStateData && <div className="studio-state-saved"><b>الإطارات المحفوظة حالياً</b><FramePreview key={"saved-" + selectedState + "-" + selectedStateData.path} src={selectedStateData.previewUrl || selectedStateData.path} rows={selectedStateData.rows} columns={selectedStateData.columns} frameCount={selectedStateData.frameCount} fps={selectedStateData.fps} loop={selectedStateData.loop !== false} label={selectedStateDefinition.label} /><small>{selectedStateData.rows} × {selectedStateData.columns} · {selectedStateData.frameCount} إطار · {selectedStateData.fps} FPS</small></div>}
      <div className="studio-state-effect-preview">
        <div className="studio-state-section-head"><h4>معاينة التأثير فوق الشخصية</h4><span>نفس بيانات تأثيرات المعركة</span></div>
        <label>التأثير المراد تجربته
          <select value={previewEffectId} onChange={(event) => setPreviewEffectId(event.target.value)}>
            {availablePreviewEffects.map((effect) => <option key={effect.id} value={effect.id}>{effect.nameAr}</option>)}
          </select>
        </label>
        <canvas ref={effectCanvasRef} width="320" height="220" className="studio-character-effect-preview" aria-label={"معاينة " + (previewEffect?.nameAr || "التأثير") + " فوق الشخصية"} />
        <small>تظهر إطارات الحالة المختارة فوقها طبقات التأثير الفعلية من مكتبة VFX. إذا لم ترفع إطارات لهذه الحالة، تُستخدم الحركة الأساسية مؤقتاً.</small>
      </div>
      <label className="studio-state-upload">رفع Sprite Sheet للحالة
        <input type="file" accept="image/png,image/webp" onChange={(event) => { setFile(event.target.files?.[0] || null); event.target.value = ""; }} />
      </label>
      {file && <div className="studio-state-new-preview"><b>معاينة قبل الحفظ</b><FramePreview key={"new-" + selectedState + "-" + grid.rows + "-" + grid.columns + "-" + grid.frameCount} src={previewUrl} rows={grid.rows} columns={grid.columns} frameCount={grid.frameCount} fps={fps} loop={loop} label={"معاينة " + selectedStateDefinition.label} />
        <div className="studio-state-grid-controls">
          <label>الصفوف<input type="number" min="1" max="24" value={grid.rows} onChange={(event) => setGrid((current) => { const rows = Math.max(1, Math.min(24, Number(event.target.value) || 1)); const frameCount = rows * current.columns; return frameCount <= 24 ? { ...current, rows, frameCount } : current; })} /></label>
          <label>الأعمدة<input type="number" min="1" max="24" value={grid.columns} onChange={(event) => setGrid((current) => { const columns = Math.max(1, Math.min(24, Number(event.target.value) || 1)); const frameCount = current.rows * columns; return frameCount <= 24 ? { ...current, columns, frameCount } : current; })} /></label>
          <label>عدد الإطارات<input type="number" min="1" max="24" value={grid.frameCount} onChange={(event) => setGrid((current) => { const frameCount = Math.max(1, Math.min(24, Number(event.target.value) || 1)); return { ...current, frameCount, columns: frameCount, rows: 1 }; })} /></label>
          <label>سرعة الحركة<input type="number" min="1" max="30" value={fps} onChange={(event) => setFps(Math.max(1, Math.min(30, Number(event.target.value) || 1)))} /></label>
          <label className="studio-state-loop"><input type="checkbox" checked={loop} onChange={(event) => setLoop(event.target.checked)} /> تكرار مستمر</label>
        </div>
        <small>التقسيم المكتشف: {grid.rows} صف × {grid.columns} أعمدة. يمكنك ضبط عدد الإطارات ثم معاينتها قبل الحفظ.</small>
      </div>}
      <button type="button" className="studio-state-save" disabled={busy || !file} onClick={saveStateAnimation}>{busy ? "جارٍ الحفظ…" : "حفظ إطارات الحالة"}</button>
      {message && <p className="studio-message" role="status" aria-live="polite">{message}</p>}
    </section>
  </section>;
}
