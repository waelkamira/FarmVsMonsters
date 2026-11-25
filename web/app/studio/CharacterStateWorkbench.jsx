"use client";

import { useEffect, useMemo, useState } from "react";
import { inferSpriteGrid } from "../../game/studio/spriteSheetGrid.mjs";
import { CHARACTER_STATUS_STATES } from "../../game/studio/characterStateAnimations.mjs";

function FramePreview({ src, rows = 1, columns = 1, frameCount = 1, fps = 8, loop = true, label, startFrame = 0 }) {
  const [frame, setFrame] = useState(0);
  const count = Math.max(1, Number(frameCount) || 1);
  useEffect(() => {
    setFrame(0);
  }, [src, rows, columns, count]);
  useEffect(() => {
    if (!src || count < 2) return;
    const delay = Math.max(33, 1000 / Math.max(1, Math.min(30, Number(fps) || 8)));
    const timer = window.setInterval(() => setFrame((current) => current + 1 >= count ? (loop ? 0 : current) : current + 1), delay);
    return () => window.clearInterval(timer);
  }, [src, count, fps, loop]);
  const row = Math.floor(frame / Math.max(1, columns));
  const column = frame % Math.max(1, columns);
  const style = {
    backgroundImage: src ? `url("${src}")` : "none",
    backgroundSize: `${Math.max(1, columns) * 100}% ${Math.max(1, rows) * 100}%`,
    backgroundPosition: `${columns > 1 ? (column / (columns - 1)) * 100 : 0}% ${rows > 1 ? (row / (rows - 1)) * 100 : 0}%`
  };
  return <div className="studio-state-preview-wrap">
    <div className="studio-state-preview" style={style} role="img" aria-label={label || "معاينة إطارات الشخصية"} />
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

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => {
    let active = true;
    if (!file) return;
    createImageBitmap(file).then((image) => {
      const inferred = inferSpriteGrid(image.width, image.height, grid.frameCount);
      image.close();
      if (active) setGrid({ ...inferred, frameCount: grid.frameCount });
    }).catch(() => { if (active) setMessage("تعذر قراءة أبعاد صورة الحالة."); });
    return () => { active = false; };
  }, [file, grid.frameCount]);

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
      <FramePreview src={baseClipUrl} rows={asset.rows || 1} columns={asset.columns || 1} frameCount={baseClipCount} fps={clip.fps || 8} loop={clip.loop !== false} startFrame={clip.startFrame || 0} label={asset.name + " " + selectedClip} />
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
      {selectedStateData && <div className="studio-state-saved"><b>الإطارات المحفوظة حالياً</b><FramePreview src={"/api/studio/assets?preview=" + encodeURIComponent(selectedStateData.path)} rows={selectedStateData.rows} columns={selectedStateData.columns} frameCount={selectedStateData.frameCount} fps={selectedStateData.fps} loop={selectedStateData.loop !== false} label={selectedStateDefinition.label} /><small>{selectedStateData.rows} × {selectedStateData.columns} · {selectedStateData.frameCount} إطار · {selectedStateData.fps} FPS</small></div>}
      <label className="studio-state-upload">رفع Sprite Sheet للحالة
        <input type="file" accept="image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} />
      </label>
      {file && <div className="studio-state-new-preview"><b>معاينة قبل الحفظ</b><FramePreview src={previewUrl} rows={grid.rows} columns={grid.columns} frameCount={grid.frameCount} fps={fps} loop={loop} label={"معاينة " + selectedStateDefinition.label} />
        <div className="studio-state-grid-controls">
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
