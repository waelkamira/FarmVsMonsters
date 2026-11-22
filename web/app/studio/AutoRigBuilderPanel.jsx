"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AUTO_RIG_ROLE_OPTIONS, buildAutoRigFromParts } from "../../game/studio/autoRigBuilder.mjs";

function slug(value) {
  return String(value || "character").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "character";
}
function polygonBounds(points) {
  const xs = points.map((point) => point.x), ys = points.map((point) => point.y);
  const x = Math.floor(Math.min(...xs)), y = Math.floor(Math.min(...ys));
  const right = Math.ceil(Math.max(...xs)), bottom = Math.ceil(Math.max(...ys));
  return { x, y, width: Math.max(1, right - x), height: Math.max(1, bottom - y) };
}
function canvasBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("تعذر إنشاء صورة الجزء المقصوص.")), "image/png"));
}
async function hashSource(file, url) {
  if (!window.crypto?.subtle) return null;
  let bytes;
  if (file) bytes = await file.arrayBuffer();
  else {
    const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new Error("تعذر قراءة الملف الأصلي لحساب بصمته.");
    bytes = await response.arrayBuffer();
  }
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

export default function AutoRigBuilderPanel({
  sourceUrl = "",
  sourceFile = null,
  currentAssetId = "",
  assets = [],
  disabled = false,
  sourceRows = 1,
  sourceColumns = 1,
  sourceSpriteSheet = false,
  requiresMuzzle = false,
  onRigGenerated,
  onManifestGenerated,
  onAssetsCreated
}) {
  const canvasRef = useRef(null);
  const nextPartIndex = useRef(1);
  const [image, setImage] = useState(null);
  const [imageError, setImageError] = useState("");
  const [role, setRole] = useState("body");
  const [partName, setPartName] = useState("الجسم");
  const [points, setPoints] = useState([]);
  const [parts, setParts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [muzzlePartId, setMuzzlePartId] = useState("");
  const [muzzlePoint, setMuzzlePoint] = useState(null);
  const [muzzleMode, setMuzzleMode] = useState(false);
  const existingIds = useMemo(() => new Set(assets.map((asset) => asset.id)), [assets]);
  const emitterParts = useMemo(() => parts.filter((part) => ["weapon", "weapon.barrel", "weapon.muzzle", "mouth", "head", "face"].includes(part.role)), [parts]);
  const activeEmitterPart = emitterParts.find((part) => part.id === muzzlePartId) || emitterParts[0] || null;

  useEffect(() => {
    if (!sourceFile && !sourceUrl) return;
    let active = true;
    const localUrl = sourceFile ? URL.createObjectURL(sourceFile) : sourceUrl;
    const nextImage = new Image();
    nextImage.onload = () => {
      if (!active) return;
      let workingImage = nextImage;
      if (sourceSpriteSheet) {
        const columns = Math.max(1, Number(sourceColumns) || 1);
        const rows = Math.max(1, Number(sourceRows) || 1);
        const frameWidth = Math.floor(nextImage.naturalWidth / columns);
        const frameHeight = Math.floor(nextImage.naturalHeight / rows);
        if (frameWidth < 1 || frameHeight < 1) {
          setImageError("تعذر تحديد أبعاد أول إطار من Sprite Sheet.");
          return;
        }
        const frame = document.createElement("canvas");
        frame.width = frameWidth;
        frame.height = frameHeight;
        frame.getContext("2d").drawImage(nextImage, 0, 0, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
        workingImage = frame;
      }
      setImage(workingImage);
      setImageError("");
      setPoints([]);
      setParts([]);
      setMuzzlePartId("");
      setMuzzlePoint(null);
      setMuzzleMode(false);
      nextPartIndex.current = 1;
    };
    nextImage.onerror = () => { if (active) setImageError("تعذر قراءة الصورة المصدر."); };
    nextImage.src = localUrl;
    return () => {
      active = false;
      if (sourceFile) URL.revokeObjectURL(localUrl);
    };
  }, [sourceFile, sourceUrl, sourceRows, sourceColumns, sourceSpriteSheet]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    parts.forEach((part) => {
      context.beginPath();
      part.points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
      context.closePath();
      context.fillStyle = "rgba(35, 190, 140, 0.18)";
      context.strokeStyle = "#159b72";
      context.lineWidth = Math.max(2, canvas.width / 300);
      context.fill();
      context.stroke();
    });
    if (muzzlePoint) {
      context.beginPath();
      context.arc(muzzlePoint.x, muzzlePoint.y, Math.max(6, canvas.width / 70), 0, Math.PI * 2);
      context.strokeStyle = "#e23b64";
      context.lineWidth = Math.max(2, canvas.width / 220);
      context.stroke();
      context.beginPath();
      context.moveTo(muzzlePoint.x - canvas.width / 45, muzzlePoint.y);
      context.lineTo(muzzlePoint.x + canvas.width / 45, muzzlePoint.y);
      context.moveTo(muzzlePoint.x, muzzlePoint.y - canvas.width / 45);
      context.lineTo(muzzlePoint.x, muzzlePoint.y + canvas.width / 45);
      context.stroke();
    }
    if (points.length) {
      context.beginPath();
      points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
      context.strokeStyle = "#ff8a32";
      context.lineWidth = Math.max(2, canvas.width / 250);
      context.stroke();
      points.forEach((point) => {
        context.beginPath();
        context.arc(point.x, point.y, Math.max(3, canvas.width / 120), 0, Math.PI * 2);
        context.fillStyle = "#ff8a32";
        context.fill();
      });
    }
  }, [image, points, parts]);

  function addPoint(event) {
    if (!image || disabled || busy) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * canvas.width / rect.width;
    const y = (event.clientY - rect.top) * canvas.height / rect.height;
    if (muzzleMode) {
      setMuzzlePoint({ x, y });
      setMuzzleMode(false);
      setMessage("تم تحديد نقطة مصدر الإطلاق. تأكد أنها داخل الجزء المحدد.");
      return;
    }
    setPoints((current) => [...current, { x, y }]);
  }

  function commitPart() {
    if (points.length < 3) {
      setMessage("ارسم حدود الجزء بثلاث نقاط أو أكثر قبل اعتماده.");
      return;
    }
    if (parts.length >= 63) {
      setMessage("الحد الأقصى 63 جزءاً في الهيكل الواحد.");
      return;
    }
    if (points.length > 512) {
      setMessage("القناع الواحد يدعم 512 نقطة كحد أقصى؛ قلّل عدد النقرات.");
      return;
    }
    const index = nextPartIndex.current++;
    const bounds = polygonBounds(points);
    const roleSlug = slug(role.replaceAll(".", "-"));
    const suffix = "-" + roleSlug + "-" + String(index).padStart(2, "0") + "-cutout";
    const base = slug(currentAssetId || "character").slice(0, 64 - suffix.length);
    let assetId = base + suffix;
    let collision = 1;
    while (existingIds.has(assetId) || parts.some((part) => part.assetId === assetId)) {
      const extra = "-" + collision++;
      assetId = base.slice(0, 64 - suffix.length - extra.length) + suffix + extra;
    }
    const area = points.reduce((sum, point, pointIndex) => {
      const next = points[(pointIndex + 1) % points.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0) / 2;
    if (Math.abs(area) < 4) {
      setMessage("المنطقة صغيرة جداً أو نقاطها على خط واحد. ارسم حدوداً أوضح.");
      nextPartIndex.current -= 1;
      return;
    }
    setParts((current) => [...current, {
      id: "part-" + String(index).padStart(2, "0"),
      assetId,
      role,
      name: partName.trim() || role,
      points,
      bounds,
      drawOrder: index - 1
    }]);
    setPoints([]);
    setMessage("تمت إضافة الجزء. يمكنك رسم الجزء التالي أو إنشاء الهيكل.");
  }

  async function generateRig() {
    if (!image || !parts.length || busy || disabled) return;
    if (requiresMuzzle && (!activeEmitterPart || !muzzlePoint)) {
      setMessage("اختر جزء مصدر الإطلاق ثم حدّد نقطة muzzle داخله قبل إنشاء هيكل نبتة المقذوفات.");
      return;
    }
    setBusy(true);
    setMessage("");
    const created = [];
    try {
      if (sourceFile && sourceFile.size > 8 * 1024 * 1024) {
        throw new Error("الصورة المصدر تتجاوز حد الرفع الحالي البالغ 8 ميغابايت.");
      }
      const descriptors = parts.map((part) => ({
        id: part.id,
        assetId: part.assetId,
        role: part.role,
        name: part.name,
        bounds: part.bounds,
        drawOrder: part.drawOrder,
        mask: { kind: "polygon", points: part.points },
        provenance: { segmentation: "manual-polygon", pixels: "source" }
      }));
      const sourceSha256 = await hashSource(sourceFile, sourceUrl);
      const source = { assetId: currentAssetId || null, sha256: sourceSha256, frame: 0 };
      buildAutoRigFromParts({
        source,
        canvas: { width: image.width, height: image.height },
        parts: descriptors,
        requiresMuzzle,
        anchors: requiresMuzzle ? { muzzle: { partId: activeEmitterPart.id, x: muzzlePoint.x, y: muzzlePoint.y } } : undefined
      });
      if (image.width > 4096 || image.height > 4096) {
        throw new Error("أبعاد الصورة تتجاوز الحد الحالي 4096×4096.");
      }
      for (const part of parts) {
        const bounds = part.bounds;
        const output = document.createElement("canvas");
        output.width = bounds.width;
        output.height = bounds.height;
        const context = output.getContext("2d");
        context.save();
        context.beginPath();
        part.points.forEach((point, index) => {
          const x = point.x - bounds.x, y = point.y - bounds.y;
          if (index) context.lineTo(x, y); else context.moveTo(x, y);
        });
        context.closePath();
        context.clip();
        context.drawImage(image, -bounds.x, -bounds.y);
        context.restore();
        const blob = await canvasBlob(output);
        const form = new FormData();
        form.set("type", "item");
        form.set("id", part.assetId);
        form.set("name", part.name);
        form.set("rows", "1");
        form.set("columns", "1");
        form.set("frameCount", "1");
        form.set("replace", "false");
        form.set("file", new File([blob], part.assetId + ".png", { type: "image/png" }));
        const response = await fetch("/api/studio/assets", { method: "POST", credentials: "same-origin", body: form });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "تعذر حفظ الجزء " + part.name);
        created.push(part.assetId);
      }
      if (onAssetsCreated) await onAssetsCreated();
      const result = buildAutoRigFromParts({
        source,
        canvas: { width: image.width, height: image.height },
        parts: descriptors,
        requiresMuzzle,
        anchors: requiresMuzzle ? { muzzle: { partId: activeEmitterPart.id, x: muzzlePoint.x, y: muzzlePoint.y } } : undefined
      });
      onRigGenerated(result.profile);
      if (onManifestGenerated) onManifestGenerated(result.manifest);
      setMessage("اكتمل استخراج " + created.length + " جزءاً وإنشاء الهيكل ومقاطع الحركة الابتدائية. راجع العظام ونقاط الدوران والحركات قبل الحفظ.");
    } catch (error) {
      setMessage(error.message + (created.length ? " تم حفظ الأجزاء التالية في المكتبة: " + created.join("، ") + ". راجعها قبل إعادة المحاولة." : ""));
    } finally {
      setBusy(false);
    }
  }

  if (!sourceFile && !sourceUrl) return null;

  return (
    <section className="studio-panel" style={{ marginTop: 18 }}>
      <small>AUTO-RIG · GUIDED SEGMENTATION</small>
      <h3>استخراج أجزاء الشخصية وبناء الهيكل الأولي</h3>
      <p>هذه مرحلة التفكيك الموجّه: ابدأ بالأجزاء الخلفية ثم الأمامية، وانقر حول كل جزء لرسم قناعه، ثم اختر دوره. سيُحفظ كل جزء كصورة PNG شفافة مستقلة، وتُقترح نقاط الدوران تلقائياً عند أقرب حدود اتصال مع الجزء الأب، ويمكن تعديلها لاحقاً في محرر الهيكل. كما تُنشأ مقاطع حركة ابتدائية للخمول والحركة والهجوم والإصابة والموت، وكلها قابلة للتعديل. عند استخدام Sprite Sheet تتم معالجة أول إطار فقط كصورة مرجعية. إذا كانت النبتة تطلق قذيفة، حدّد مصدر الإطلاق ونقطة muzzle هنا؛ أما بقية تفاصيل الارتباط فيمكن تعديلها لاحقاً في محرر الهيكل. لا يوجد استدلال AI تلقائي في هذه المرحلة بعد.</p>
      {imageError && <p className="studio-message" role="alert">{imageError}</p>}
      {image && (image.width > 4096 || image.height > 4096)
        ? <p className="studio-message">أبعاد الصورة {image.width}×{image.height} أكبر من الحد الحالي 4096×4096.</p>
        : null}
      {image && <div style={{ border: "1px solid #d8dce5", borderRadius: 12, overflow: "hidden", background: "#f4f5f8", maxHeight: 440, overflowY: "auto" }}>
        <canvas ref={canvasRef} onClick={addPoint} style={{ display: "block", width: "100%", height: "auto", maxHeight: 420, objectFit: "contain", cursor: disabled || busy ? "not-allowed" : "crosshair", touchAction: "manipulation" }} />
      </div>}
      <div className="studio-grid" style={{ marginTop: 12 }}>
        <label>الدور الدلالي
          <select value={role} disabled={disabled || busy} onChange={(event) => {
            const value = event.target.value;
            setRole(value);
            setPartName(AUTO_RIG_ROLE_OPTIONS.find((item) => item.value === value)?.label || value);
          }}>
            {AUTO_RIG_ROLE_OPTIONS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label>اسم الجزء
          <input value={partName} disabled={disabled || busy} onChange={(event) => setPartName(event.target.value)} maxLength={80} />
        </label>
      </div>
      <div className="studio-actions" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        <button type="button" disabled={disabled || busy || !points.length} onClick={() => setPoints((current) => current.slice(0, -1))}>تراجع عن آخر نقطة</button>
        <button type="button" disabled={disabled || busy || !points.length} onClick={() => setPoints([])}>إلغاء التحديد</button>
        <button type="button" disabled={disabled || busy || points.length < 3} onClick={commitPart}>اعتماد الجزء</button>
      </div>
      {requiresMuzzle && <div className="studio-grid" style={{ marginTop: 12 }}>
        <label>جزء مصدر الإطلاق
          <select value={activeEmitterPart?.id || ""} disabled={disabled || busy || !emitterParts.length} onChange={(event) => { setMuzzlePartId(event.target.value); setMuzzlePoint(null); setMuzzleMode(false); }}>
            {emitterParts.map((part) => <option key={part.id} value={part.id}>{part.name} · {part.role}</option>)}
          </select>
        </label>
        <div>
          <span>نقطة فوهة الإطلاق (muzzle)</span>
          <div className="studio-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
            <button type="button" disabled={disabled || busy || !activeEmitterPart} onClick={() => { setMuzzlePoint(null); setMuzzleMode(true); setMessage("انقر داخل حدود جزء مصدر الإطلاق لتحديد نقطة خروج القذيفة."); }}>تحديد النقطة على الصورة</button>
            <button type="button" disabled={disabled || busy || !muzzlePoint} onClick={() => setMuzzlePoint(null)}>مسح النقطة</button>
          </div>
          {muzzleMode && <p>وضع تحديد الفوهة مفعّل: انقر داخل الجزء المحدد على الصورة</p>}
          {muzzlePoint && <p>النقطة المحددة: {Math.round(muzzlePoint.x)}, {Math.round(muzzlePoint.y)}</p>}
          {!emitterParts.length && <p>أضف جزءاً بدور سلاح أو ماسورة أو منطقة فوهة أو فم أو رأس أولاً.</p>}
        </div>
      </div>}
      {parts.length > 0 && <div style={{ marginTop: 12 }}>
        <b>الأجزاء المحددة ({parts.length}/63)</b>
        <ul>{parts.map((part) => <li key={part.id} style={{ marginTop: 5 }}>
          {part.name} · {part.role} · {part.bounds.width}×{part.bounds.height}
          <button type="button" disabled={disabled || busy} style={{ marginInlineStart: 10 }} onClick={() => { setParts((current) => current.filter((item) => item.id !== part.id)); if (part.id === muzzlePartId) { setMuzzlePartId(""); setMuzzlePoint(null); setMuzzleMode(false); } }}>حذف</button>
        </li>)}</ul>
      </div>}
      <button type="button" className="studio-submit" disabled={disabled || busy || !image || !parts.length} onClick={generateRig}>
        {busy ? "جارٍ قصّ الأجزاء وحفظها..." : "قصّ الأجزاء وإنشاء الهيكل ←"}
      </button>
      {message && <p className="studio-message" role="status">{message}</p>}
    </section>
  );
}
