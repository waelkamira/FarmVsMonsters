"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { evaluateSkeletalClip, getSkeletalAttachmentTransform, getSkeletalHitboxTransform, validateSkeletalRigProfile } from "../../game/studio/skeletalAnimation.mjs";

function createDefaultRig(width = 256, height = 256) {
  return {
    version: 1,
    canvas: { width, height },
    bones: [{ id: "root", name: "الجذر", parentId: null, x: width / 2, y: height / 2, rotation: 0, scaleX: 1, scaleY: 1, pivot: { x: 0, y: 0 }, part: null }],
    attachments: [],
    hitboxes: [],
    clips: [{ id: "idle", name: "خمول", durationMs: 1000, fps: 24, loop: true, tracks: [{ boneId: "root", keyframes: [
      { timeMs: 0, x: width / 2, y: height / 2, rotation: 0, scaleX: 1, scaleY: 1 },
      { timeMs: 1000, x: width / 2, y: height / 2, rotation: 0, scaleX: 1, scaleY: 1 }
    ] }] }]
  };
}
const clone = (value) => JSON.parse(JSON.stringify(value));

export default function RigEditor({ profile, onChange, assets = [], currentAssetId, disabled = false }) {
  const canvasRef = useRef(null);
  const [selectedBoneId, setSelectedBoneId] = useState(profile?.bones?.[0]?.id || "root");
  const [selectedClipId, setSelectedClipId] = useState(profile?.clips?.[0]?.id || "idle");
  const [timeMs, setTimeMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [editTool, setEditTool] = useState("bone");
  const [selectedAttachmentId, setSelectedAttachmentId] = useState(profile?.attachments?.[0]?.id || "");
  const [selectedHitboxId, setSelectedHitboxId] = useState(profile?.hitboxes?.[0]?.id || "");
  const [imageRevision, setImageRevision] = useState(0);
  const [error, setError] = useState("");
  const imageCache = useRef(new Map());
  const rig = profile || createDefaultRig();
  const validation = useMemo(() => validateSkeletalRigProfile(rig), [rig]);
  const hasVisualPart = rig.bones.some((item) => item.part);
  const rigIsReady = validation.valid && hasVisualPart;
  const editorErrors = [...validation.errors, ...(!hasVisualPart ? ["يجب ربط صورة جزء واحدة على الأقل بأحد العظام."] : [])];
  const bone = rig.bones.find((item) => item.id === selectedBoneId) || rig.bones[0];
  const clip = rig.clips.find((item) => item.id === selectedClipId) || rig.clips[0];
  const selectedPose = useMemo(() => {
    if (!clip || !validation.valid) return null;
    try { const frameMs = 1000 / (clip.fps || 24); return evaluateSkeletalClip(rig, clip.id, Math.round(timeMs / frameMs) * frameMs); } catch { return null; }
  }, [rig, clip, timeMs, validation.valid]);
  const bonePose = selectedPose?.localBones?.[selectedBoneId] || bone;
  useEffect(() => {
    if (!rig.bones.some((item) => item.id === selectedBoneId)) setSelectedBoneId(rig.bones[0]?.id || "root");
    if (!rig.clips.some((item) => item.id === selectedClipId)) setSelectedClipId(rig.clips[0]?.id || "");
    if (!rig.attachments.some((item) => item.id === selectedAttachmentId)) setSelectedAttachmentId(rig.attachments[0]?.id || "");
    if (!rig.hitboxes.some((item) => item.id === selectedHitboxId)) setSelectedHitboxId(rig.hitboxes[0]?.id || "");
  }, [rig.bones, rig.clips, rig.attachments, rig.hitboxes, selectedBoneId, selectedClipId, selectedAttachmentId, selectedHitboxId]);
  const partAssets = useMemo(() => assets.filter((asset) => asset.id !== currentAssetId && asset.type !== "audio" && asset.status !== "archived" && asset.path), [assets, currentAssetId]);
  const availableParts = useMemo(() => partAssets.filter((asset) => ["item", "plant", "monster", "effect"].includes(asset.type)), [partAssets]);

  function update(mutator) {
    const next = clone(rig);
    mutator(next);
    onChange(next);
  }
  function updateBone(field, value) {
    update((next) => {
      const target = next.bones.find((item) => item.id === selectedBoneId);
      if (!target) return;
      if (field === "part") { target.part = value; return; }
      if (field.startsWith("pivot.")) { target.pivot[field.slice(6)] = value; return; }
      if (field.startsWith("part.")) {
        if (!target.part) target.part = { assetId: availableParts[0]?.id || "", frame: 0 };
        target.part[field.slice(5)] = value;
        return;
      }
      if (["x", "y", "rotation", "scaleX", "scaleY"].includes(field) && clip) {
        const targetClip = next.clips.find((item) => item.id === selectedClipId);
        if (targetClip) {
          let track = targetClip.tracks.find((item) => item.boneId === selectedBoneId);
          if (!track) {
            track = { boneId: selectedBoneId, keyframes: [
              { timeMs: 0, x: target.x, y: target.y, rotation: target.rotation, scaleX: target.scaleX, scaleY: target.scaleY },
              { timeMs: targetClip.durationMs, x: target.x, y: target.y, rotation: target.rotation, scaleX: target.scaleX, scaleY: target.scaleY }
            ] };
            targetClip.tracks.push(track);
          }
          const at = Math.min(targetClip.durationMs, Math.max(0, timeMs));
          const current = selectedPose?.localBones?.[selectedBoneId] || target;
          const frame = { ...current, timeMs: at, [field]: value };
          const index = track.keyframes.findIndex((item) => item.timeMs === at);
          if (index >= 0) track.keyframes[index] = frame;
          else track.keyframes.push(frame);
          track.keyframes.sort((a, b) => a.timeMs - b.timeMs);
          return;
        }
      }
      target[field] = value;
    });
  }
  function updateBonePosition(x, y) {
    update((next) => {
      const target = next.bones.find((item) => item.id === selectedBoneId);
      if (!target) return;
      if (!clip) { target.x = x; target.y = y; return; }
      const targetClip = next.clips.find((item) => item.id === selectedClipId);
      if (!targetClip) { target.x = x; target.y = y; return; }
      let track = targetClip.tracks.find((item) => item.boneId === selectedBoneId);
      if (!track) {
        const base = { x: target.x, y: target.y, rotation: target.rotation, scaleX: target.scaleX, scaleY: target.scaleY };
        track = { boneId: selectedBoneId, keyframes: [{ timeMs: 0, ...base }, { timeMs: targetClip.durationMs, ...base }] };
        targetClip.tracks.push(track);
      }
      const current = selectedPose?.localBones?.[selectedBoneId] || target;
      const at = Math.min(targetClip.durationMs, Math.max(0, timeMs));
      const frame = { timeMs: at, x, y, rotation: current.rotation, scaleX: current.scaleX, scaleY: current.scaleY };
      const index = track.keyframes.findIndex((item) => item.timeMs === at);
      if (index >= 0) track.keyframes[index] = frame;
      else track.keyframes.push(frame);
      track.keyframes.sort((a, b) => a.timeMs - b.timeMs);
    });
  }
  function addBone() {
    if (rig.bones.length >= 64) return;
    let boneIndex = 1;
    while (rig.bones.some((item) => item.id === "bone-" + boneIndex)) boneIndex += 1;
    const id = "bone-" + boneIndex;
    update((next) => {
      next.bones.push({ id, name: "مفصل جديد", parentId: selectedBoneId, x: 24, y: 0, rotation: 0, scaleX: 1, scaleY: 1, pivot: { x: 0, y: 0 }, part: null });
      for (const item of next.clips) item.tracks.push({ boneId: id, keyframes: [{ timeMs: 0, x: 24, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }, { timeMs: item.durationMs, x: 24, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }] });
    });
    setSelectedBoneId(id);
  }
  function removeBone() {
    if (!bone || bone.parentId === null) return;
    const parentId = bone.parentId;
    update((next) => {
      next.bones = next.bones.filter((item) => item.id !== selectedBoneId);
      next.bones.forEach((item) => { if (item.parentId === selectedBoneId) item.parentId = parentId; });
      next.attachments = next.attachments.filter((item) => item.boneId !== selectedBoneId);
      next.hitboxes = next.hitboxes.filter((item) => item.boneId !== selectedBoneId);
      next.clips.forEach((item) => { item.tracks = item.tracks.filter((track) => track.boneId !== selectedBoneId); });
    });
    setSelectedBoneId(parentId);
  }
  function addAttachment() {
    let attachmentIndex = 1;
    while (rig.attachments.some((item) => item.id === "attachment-" + attachmentIndex)) attachmentIndex += 1;
    const id = !rig.attachments.some((item) => item.id === "muzzle") ? "muzzle" : "attachment-" + attachmentIndex;
    update((next) => next.attachments.push({ id, name: id === "muzzle" ? "فوهة السلاح" : "نقطة تثبيت " + (next.attachments.length + 1), boneId: selectedBoneId, x: 20, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }));
    setSelectedAttachmentId(id);
  }
  function addHitbox() {
    let hitboxIndex = 1;
    while (rig.hitboxes.some((item) => item.id === "hitbox-" + hitboxIndex)) hitboxIndex += 1;
    const id = "hitbox-" + hitboxIndex;
    update((next) => next.hitboxes.push({ id, name: "منطقة إصابة " + (next.hitboxes.length + 1), boneId: selectedBoneId, x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, width: 32, height: 32, kind: "hurt" }));
    setSelectedHitboxId(id);
  }
  function addClip() {
    if (rig.clips.length >= 16) return;
    const preferred = ["move", "attack", "hit", "death", "jump", "special"];
    let clipIndex = 1;
    while (rig.clips.some((item) => item.id === "clip-" + clipIndex)) clipIndex += 1;
    const id = preferred.find((candidate) => !rig.clips.some((item) => item.id === candidate)) || "clip-" + clipIndex;
    const clipNames = { move: "تنقل", attack: "هجوم", hit: "إصابة", death: "موت", jump: "قفز", special: "حركة خاصة" };
    update((next) => next.clips.push({
      id, name: clipNames[id] || "حركة جديدة", durationMs: 1000, fps: 24, loop: id === "move" || id === "special",
      tracks: next.bones.map((item) => ({ boneId: item.id, keyframes: [
        { timeMs: 0, x: item.x, y: item.y, rotation: item.rotation, scaleX: item.scaleX, scaleY: item.scaleY },
        { timeMs: 1000, x: item.x, y: item.y, rotation: item.rotation, scaleX: item.scaleX, scaleY: item.scaleY }
      ] }))
    }));
    setSelectedClipId(id);
    setTimeMs(0);
  }
  function applyPreset(preset) {
    const stateId = preset === "breathing" ? "idle" : preset === "walk" ? "move" : "attack";
    const stateNames = { idle: "خمول", move: "تنقل", attack: "هجوم" };
    update((next) => {
      let target = next.clips.find((item) => item.id === stateId);
      if (!target) {
        if (next.clips.length >= 16) return;
        target = { id: stateId, name: stateNames[stateId], durationMs: preset === "recoil" ? 420 : preset === "walk" ? 800 : 1400, fps: 24, loop: stateId !== "attack", tracks: [] };
        next.clips.push(target);
      }
      if (preset === "recoil") { target.durationMs = 420; target.loop = false; }
      if (preset === "breathing") { target.durationMs = 1400; target.loop = true; }
      if (preset === "walk") { target.durationMs = 800; target.loop = true; }
      for (const existingTrack of target.tracks) {
        const byTime = new Map();
        for (const keyframe of existingTrack.keyframes) {
          const time = Math.min(target.durationMs, Math.max(0, keyframe.timeMs));
          byTime.set(time, { ...keyframe, timeMs: time });
        }
        existingTrack.keyframes = [...byTime.values()].sort((a, b) => a.timeMs - b.timeMs);
      }
      const base = selectedPose?.localBones?.[selectedBoneId] || bone;
      let track = target.tracks.find((item) => item.boneId === selectedBoneId);
      if (!track) { track = { boneId: selectedBoneId, keyframes: [] }; target.tracks.push(track); }
      const frame = (time, patch = {}) => ({ timeMs: time, x: base.x, y: base.y, rotation: base.rotation, scaleX: base.scaleX, scaleY: base.scaleY, ...patch });
      if (preset === "breathing") track.keyframes = [frame(0, { rotation: base.rotation - 3 }), frame(700, { rotation: base.rotation + 3 }), frame(1400, { rotation: base.rotation - 3 })];
      else if (preset === "recoil") track.keyframes = [frame(0), frame(100, { rotation: base.rotation - 20 }), frame(240, { rotation: base.rotation + 5 }), frame(420)];
      else track.keyframes = [frame(0), frame(400, { x: base.x + 8, y: base.y - 4 }), frame(800)];
    });
    setSelectedClipId(stateId);
    setTimeMs(0);
    setPlaying(false);
  }
  function removeKeyframe() {
    if (!clip) return;
    update((next) => {
      const target = next.clips.find((item) => item.id === selectedClipId);
      const track = target?.tracks.find((item) => item.boneId === selectedBoneId);
      if (!track || track.keyframes.length <= 1) return;
      track.keyframes = track.keyframes.filter((item) => item.timeMs !== Math.min(target.durationMs, Math.max(0, timeMs)));
    });
  }
  function removeClip() {
    if (rig.clips.length <= 1 || !clip) return;
    const nextId = rig.clips.find((item) => item.id !== selectedClipId)?.id || rig.clips[0].id;
    update((next) => { next.clips = next.clips.filter((item) => item.id !== selectedClipId); });
    setSelectedClipId(nextId);
    setTimeMs(0);
    setPlaying(false);
  }
  function updateClip(field, value) {
    update((next) => {
      const target = next.clips.find((item) => item.id === selectedClipId);
      if (!target) return;
      if (field === "fps") { target.fps = Math.max(1, Math.min(60, Math.floor(Number(value) || 24))); return; }
      if (field === "durationMs") {
        const duration = Math.max(1, Math.min(60000, Math.floor(Number(value) || 1)));
        target.durationMs = duration;
        for (const track of target.tracks) {
          const byTime = new Map();
          for (const keyframe of track.keyframes) {
            const time = Math.min(duration, Math.max(0, keyframe.timeMs));
            byTime.set(time, { ...keyframe, timeMs: time });
          }
          track.keyframes = [...byTime.values()].sort((a, b) => a.timeMs - b.timeMs);
        }
        setTimeMs((current) => Math.min(current, duration));
      } else target[field] = value;
    });
  }
  function addKeyframe() {
    if (!clip || !bone) return;
    update((next) => {
      const target = next.clips.find((item) => item.id === selectedClipId);
      let track = target.tracks.find((item) => item.boneId === selectedBoneId);
      const current = selectedPose?.localBones?.[selectedBoneId] || bone;
      if (!track) {
        const base = { x: bone.x, y: bone.y, rotation: bone.rotation, scaleX: bone.scaleX, scaleY: bone.scaleY };
        track = { boneId: selectedBoneId, keyframes: [{ timeMs: 0, ...base }, { timeMs: target.durationMs, ...base }] };
        target.tracks.push(track);
      }
      const frame = { timeMs: Math.min(target.durationMs, Math.max(0, timeMs)), x: current.x, y: current.y, rotation: current.rotation, scaleX: current.scaleX, scaleY: current.scaleY };
      const existing = track.keyframes.findIndex((item) => item.timeMs === frame.timeMs);
      if (existing >= 0) track.keyframes[existing] = frame;
      else track.keyframes.push(frame);
      track.keyframes.sort((a, b) => a.timeMs - b.timeMs);
    });
  }
  function addPart(assetId) {
    const selected = availableParts.find((item) => item.id === assetId);
    if (!selected) { updateBone("part", null); return; }
    updateBone("part", { assetId: selected.id, frame: 0 });
  }

  useEffect(() => {
    const urls = new Set(rig.bones.map((item) => item.part && partAssets.find((asset) => asset.id === item.part.assetId)?.previewUrl || (item.part && partAssets.find((asset) => asset.id === item.part.assetId)?.path)).filter(Boolean));
    let active = true;
    for (const url of urls) {
      if (imageCache.current.has(url)) continue;
      const image = new Image();
      image.onload = () => { if (active) setImageRevision((value) => value + 1); };
      image.onerror = () => { if (active) setError("تعذر تحميل إحدى صور أجزاء الهيكل."); };
      image.src = url;
      imageCache.current.set(url, image);
    }
    return () => { active = false; };
  }, [rig.bones, partAssets]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    const width = rig.canvas.width, height = rig.canvas.height;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#111a11";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.translate(panX, panY);
    context.scale(zoom, zoom);
    context.strokeStyle = "rgba(220,235,205,.10)";
    context.lineWidth = 1;
    for (let x = 0; x <= width; x += 16) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
    for (let y = 0; y <= height; y += 16) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
    let pose = null;
    if (clip && validation.valid) {
      try { const frameMs = 1000 / (clip.fps || 24); pose = evaluateSkeletalClip(rig, clip.id, Math.round(timeMs / frameMs) * frameMs); } catch { pose = null; }
    }
    const local = pose?.localBones || Object.fromEntries(rig.bones.map((item) => [item.id, item]));
    const children = new Map(rig.bones.map((item) => [item.id, []]));
    rig.bones.forEach((item) => { if (item.parentId !== null) children.get(item.parentId)?.push(item); });
    function drawBone(item) {
      const transform = local[item.id] || item;
      context.save();
      context.translate(transform.x, transform.y);
      context.rotate(transform.rotation * Math.PI / 180);
      context.scale(transform.scaleX, transform.scaleY);
      if (item.part) {
        const asset = partAssets.find((candidate) => candidate.id === item.part.assetId);
        const url = asset?.previewUrl || asset?.path;
        const image = url && imageCache.current.get(url);
        if (image?.complete && image.naturalWidth > 0) {
          const rows = Math.max(1, Number(asset.rows) || 1), columns = Math.max(1, Number(asset.columns) || 1);
          const frameWidth = image.naturalWidth / columns, frameHeight = image.naturalHeight / rows;
          const frame = Math.max(0, Math.min(rows * columns - 1, Number(item.part.frame) || 0));
          context.drawImage(image, (frame % columns) * frameWidth, Math.floor(frame / columns) * frameHeight, frameWidth, frameHeight, -item.pivot.x, -item.pivot.y, frameWidth, frameHeight);
        }
      }
      if (item.id === selectedBoneId) {
        context.strokeStyle = "#f5d16f";
        context.lineWidth = 1.5;
        context.beginPath(); context.arc(0, 0, 6, 0, Math.PI * 2); context.stroke();
      }
      for (const child of children.get(item.id) || []) drawBone(child);
      context.restore();
    }
    const root = rig.bones.find((item) => item.parentId === null);
    if (root) drawBone(root);
    if (pose) {
      for (const item of rig.bones) {
        if (item.parentId === null) continue;
        const parent = pose.bones[item.parentId], child = pose.bones[item.id];
        if (!parent || !child) continue;
        context.strokeStyle = item.id === selectedBoneId ? "#f5d16f" : "rgba(220,235,205,.65)";
        context.lineWidth = item.id === selectedBoneId ? 2.5 : 1.5;
        context.beginPath(); context.moveTo(parent.x, parent.y); context.lineTo(child.x, child.y); context.stroke();
        context.fillStyle = item.id === selectedBoneId ? "#f5d16f" : "#dcebcf";
        context.beginPath(); context.arc(child.x, child.y, item.id === selectedBoneId ? 5 : 3, 0, Math.PI * 2); context.fill();
      }
      for (const attachment of rig.attachments) {
        const point = getSkeletalAttachmentTransform(rig, pose, attachment.id);
        context.fillStyle = "#78d6ff";
        context.beginPath(); context.arc(point.x, point.y, attachment.id === selectedAttachmentId ? 6 : 4, 0, Math.PI * 2); context.fill();
        context.fillStyle = "#dff6ff"; context.font = "9px sans-serif"; context.fillText(attachment.name, point.x + 6, point.y - 6);
      }
      for (const hitbox of rig.hitboxes) {
        const bounds = getSkeletalHitboxTransform(rig, pose, hitbox.id);
        context.save();
        context.translate(bounds.x, bounds.y);
        context.rotate(bounds.rotation * Math.PI / 180);
        context.strokeStyle = bounds.kind === "attack" ? "#ff8a67" : "#8bd49b";
        context.lineWidth = hitbox.id === selectedHitboxId ? 3 : 1.5;
        context.strokeRect(-bounds.width / 2, -bounds.height / 2, bounds.width, bounds.height);
        context.restore();
      }
    }
  }, [rig, partAssets, selectedBoneId, selectedClipId, clip, timeMs, playing, validation.valid, imageRevision, zoom, panX, panY]);

  useEffect(() => {
    if (!playing || !clip) return;
    let frame;
    let previous = performance.now();
    let elapsed = timeMs;
    const tick = (now) => {
      elapsed += Math.min(80, now - previous);
      previous = now;
      if (elapsed >= clip.durationMs) {
        if (clip.loop) elapsed %= clip.durationMs;
        else { elapsed = clip.durationMs; setPlaying(false); }
      }
      setTimeMs(elapsed);
      if (elapsed < clip.durationMs || clip.loop) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, selectedClipId, clip?.durationMs, clip?.loop]);

  function updateToolPosition(kind, id, x, y) {
    update((next) => {
      const collection = kind === "attachment" ? next.attachments : next.hitboxes;
      const target = collection.find((item) => item.id === id);
      if (target) { target.x = x; target.y = y; }
    });
  }

  function handleWheel(event) {
    if (disabled) return;
    event.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = rig.canvas.width / rect.width, scaleY = rig.canvas.height / rect.height;
    const pointX = (event.clientX - rect.left) * scaleX;
    const pointY = (event.clientY - rect.top) * scaleY;
    const worldX = (pointX - panX) / zoom, worldY = (pointY - panY) / zoom;
    const nextZoom = Math.max(0.5, Math.min(3, zoom * Math.exp(-event.deltaY * 0.001)));
    setPanX(pointX - worldX * nextZoom);
    setPanY(pointY - worldY * nextZoom);
    setZoom(nextZoom);
  }

  function pointerDown(event) {
    if (disabled || playing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = rig.canvas.width / rect.width, scaleY = rig.canvas.height / rect.height;
    if (editTool === "pan") {
      const initial = { x: panX, y: panY, clientX: event.clientX, clientY: event.clientY };
      const move = (nextEvent) => {
        setPanX(initial.x + (nextEvent.clientX - initial.clientX) * scaleX);
        setPanY(initial.y + (nextEvent.clientY - initial.clientY) * scaleY);
      };
      const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
      canvasRef.current.setPointerCapture?.(event.pointerId);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up, { once: true });
      event.preventDefault();
      return;
    }
    const selectedToolItem = editTool === "attachment"
      ? rig.attachments.find((item) => item.id === selectedAttachmentId)
      : editTool === "hitbox" ? rig.hitboxes.find((item) => item.id === selectedHitboxId) : null;
    if (editTool === "bone" && !bone) return;
    if ((editTool === "attachment" || editTool === "hitbox") && !selectedToolItem) return;
    const parentPose = editTool === "bone"
      ? (bone.parentId ? selectedPose?.bones?.[bone.parentId] : null)
      : selectedPose?.bones?.[selectedToolItem.boneId];
    const parentRotation = (parentPose?.rotation || 0) * Math.PI / 180;
    const parentScaleX = parentPose?.scaleX || 1, parentScaleY = parentPose?.scaleY || 1;
    const initial = editTool === "bone"
      ? { x: bonePose.x, y: bonePose.y }
      : { x: selectedToolItem.x, y: selectedToolItem.y };
    const start = { ...initial, clientX: event.clientX, clientY: event.clientY };
    const move = (nextEvent) => {
      const dx = (nextEvent.clientX - start.clientX) * scaleX / zoom;
      const dy = (nextEvent.clientY - start.clientY) * scaleY / zoom;
      const localX = (dx * Math.cos(parentRotation) + dy * Math.sin(parentRotation)) / parentScaleX;
      const localY = (-dx * Math.sin(parentRotation) + dy * Math.cos(parentRotation)) / parentScaleY;
      if (editTool === "bone") updateBonePosition(Math.round(start.x + localX), Math.round(start.y + localY));
      else updateToolPosition(editTool, selectedToolItem.id, Math.round(start.x + localX), Math.round(start.y + localY));
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    canvasRef.current.setPointerCapture?.(event.pointerId);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    event.preventDefault();
  }

  if (!profile) return <div className="studio-rig-empty"><b>الهيكل غير مهيأ بعد</b><button type="button" disabled={disabled} onClick={() => onChange(createDefaultRig())}>إنشاء هيكل جديد</button></div>;

  return (
    <section className="studio-rig-editor">
      <header><div><h4>استديو التحريك الهيكلي · Cutout Rig</h4><p>اربط صور الأجزاء بالعظام، اضبط المفاصل بالسحب أو الحقول، ثم أنشئ مقاطع الحركة والإطارات المفتاحية.</p></div><div className="studio-rig-header-actions"><span data-valid={rigIsReady}>{rigIsReady ? "هيكل صالح" : "يحتاج إلى إصلاح"}</span><button type="button" disabled={disabled} onClick={() => { if (window.confirm("إزالة ملف الهيكل من هذه المسودة؟ ستبقى الصور الأصلية وSprite Sheet كما هي.")) onChange(null); }}>العودة إلى Sprite Sheet</button></div></header>
      <div className="studio-rig-layout">
        <div className="studio-rig-stage">
          <canvas ref={canvasRef} width={rig.canvas.width} height={rig.canvas.height} onPointerDown={pointerDown} onWheel={handleWheel} aria-label="معاينة الهيكل العظمي" />
          <div className="studio-rig-stage-actions"><label>أداة السحب<select value={editTool} onChange={(event) => setEditTool(event.target.value)}><option value="bone">العظمة المحددة</option><option value="attachment">نقطة التثبيت</option><option value="hitbox">منطقة الإصابة</option><option value="pan">تحريك مساحة العمل</option></select></label>{editTool === "attachment" && <label>النقطة<select value={selectedAttachmentId} onChange={(event) => setSelectedAttachmentId(event.target.value)}>{rig.attachments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}{editTool === "hitbox" && <label>المنطقة<select value={selectedHitboxId} onChange={(event) => setSelectedHitboxId(event.target.value)}>{rig.hitboxes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}<button type="button" onClick={() => setZoom((value) => Math.min(3, value * 1.2))}>تكبير ＋</button><button type="button" onClick={() => setZoom((value) => Math.max(.5, value / 1.2))}>تصغير −</button><button type="button" onClick={() => { setZoom(1); setPanX(0); setPanY(0); }}>إعادة ضبط العرض</button><span>{Math.round(zoom * 100)}%</span><button type="button" disabled={disabled || playing} onClick={addBone}>＋ إضافة عظمة</button><button type="button" disabled={disabled || !bone || bone.parentId === null} onClick={removeBone}>حذف العظمة</button></div>
          <small>اختر عظمة من القائمة، ثم اسحب على مساحة المعاينة لتحريكها. صور الأجزاء تُحمّل من مكتبة الأصول.</small>
        </div>
        <div className="studio-rig-controls">
          <label>العظمة المحددة<select value={selectedBoneId} onChange={(event) => setSelectedBoneId(event.target.value)}>{rig.bones.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}</select></label>
          {bone && <div className="studio-rig-fields">
            <label>اسم العظمة<input value={bone.name} disabled={disabled} onChange={(event) => updateBone("name", event.target.value)} /></label>
            <label>العظمة الأم<select value={bone.parentId || ""} disabled={disabled || bone.parentId === null} onChange={(event) => updateBone("parentId", event.target.value || null)}><option value="">جذر الهيكل</option>{rig.bones.filter((item) => item.id !== bone.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <div className="studio-rig-fields-grid">
              <label>X<input type="number" value={bonePose.x} disabled={disabled} onChange={(event) => updateBone("x", Number(event.target.value))}/></label>
              <label>Y<input type="number" value={bonePose.y} disabled={disabled} onChange={(event) => updateBone("y", Number(event.target.value))}/></label>
              <label>الدوران °<input type="number" value={bonePose.rotation} disabled={disabled} onChange={(event) => updateBone("rotation", Number(event.target.value))}/></label>
              <label>Scale X<input type="number" min=".01" max="20" step=".05" value={bonePose.scaleX} disabled={disabled} onChange={(event) => updateBone("scaleX", Number(event.target.value))}/></label>
              <label>Scale Y<input type="number" min=".01" max="20" step=".05" value={bonePose.scaleY} disabled={disabled} onChange={(event) => updateBone("scaleY", Number(event.target.value))}/></label>
              <label>Pivot X<input type="number" value={bone.pivot.x} disabled={disabled} onChange={(event) => updateBone("pivot.x", Number(event.target.value))}/></label>
              <label>Pivot Y<input type="number" value={bone.pivot.y} disabled={disabled} onChange={(event) => updateBone("pivot.y", Number(event.target.value))}/></label>
            </div>
            <label>صورة الجزء<select value={bone.part?.assetId || ""} disabled={disabled} onChange={(event) => addPart(event.target.value)}><option value="">بدون صورة</option>{availableParts.map((asset) => <option key={asset.id} value={asset.id}>{asset.name || asset.id} · {asset.type}</option>)}</select></label>
            {bone.part && <label>رقم الإطار<input type="number" min="0" max={Math.max(0, ((partAssets.find((asset) => asset.id === bone.part.assetId)?.spriteSheet ? (partAssets.find((asset) => asset.id === bone.part.assetId)?.frameCount || ((partAssets.find((asset) => asset.id === bone.part.assetId)?.rows || 1) * (partAssets.find((asset) => asset.id === bone.part.assetId)?.columns || 1))) : 1) - 1)} value={bone.part.frame} disabled={disabled} onChange={(event) => updateBone("part.frame", Number(event.target.value))}/></label>}
          </div>}
        </div>
      </div>
      <div className="studio-rig-timeline">
        <div className="studio-rig-presets"><b>قوالب حركة قابلة للتعديل</b><button type="button" disabled={disabled} onClick={() => applyPreset("breathing")}>تنفس / تأرجح</button><button type="button" disabled={disabled} onClick={() => applyPreset("walk")}>دورة تنقل</button><button type="button" disabled={disabled} onClick={() => applyPreset("recoil")}>ارتداد الهجوم</button></div><div className="studio-rig-timeline-head"><h5>مقاطع الحركة والإطارات المفتاحية</h5><div className="studio-rig-stage-actions"><button type="button" disabled={disabled || rig.clips.length >= 16} onClick={addClip}>＋ مقطع حركة</button><button type="button" disabled={disabled || rig.clips.length <= 1} onClick={removeClip}>حذف المقطع المحدد</button></div></div>
        <div className="studio-rig-fields-grid">
          <label>المقطع<select value={selectedClipId} onChange={(event) => { setSelectedClipId(event.target.value); setTimeMs(0); setPlaying(false); }}>{rig.clips.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          {clip && <><label>اسم المقطع<input value={clip.name} disabled={disabled} onChange={(event) => updateClip("name", event.target.value)}/></label><label>المدة (ms)<input type="number" min="1" max="60000" value={clip.durationMs} disabled={disabled} onChange={(event) => updateClip("durationMs", Number(event.target.value))}/></label><label>FPS<input type="number" min="1" max="60" value={clip.fps || 24} disabled={disabled} onChange={(event) => updateClip("fps", Number(event.target.value))}/></label><label className="studio-rig-check"><input type="checkbox" checked={clip.loop} disabled={disabled} onChange={(event) => updateClip("loop", event.target.checked)}/> تكرار المقطع</label></>}
        </div>
        {clip && <><label className="studio-rig-time">الزمن الحالي: {Math.round(timeMs)} ms<input type="range" min="0" max={clip.durationMs} value={Math.min(timeMs, clip.durationMs)} disabled={playing} onChange={(event) => setTimeMs(Number(event.target.value))}/></label><div className="studio-rig-keyframe-tracks">{clip.tracks.map((track) => <div className="studio-rig-keyframe-track" key={track.boneId}><b>{rig.bones.find((item) => item.id === track.boneId)?.name || track.boneId}</b><div className="studio-rig-keyframe-rail">{track.keyframes.map((keyframe) => <button key={keyframe.timeMs} type="button" title={keyframe.timeMs + " ms"} style={{ left: (keyframe.timeMs / clip.durationMs * 100) + "%" }} onClick={() => { setSelectedBoneId(track.boneId); setTimeMs(keyframe.timeMs); setPlaying(false); }}>{keyframe.timeMs}</button>)}</div></div>)}</div><div className="studio-rig-stage-actions"><button type="button" disabled={disabled || !rigIsReady} onClick={() => setPlaying((value) => !value)}>{playing ? "إيقاف المعاينة" : "▶ تشغيل المقطع"}</button><button type="button" disabled={disabled || playing} onClick={addKeyframe}>＋ حفظ إطار للعظمة المحددة</button><button type="button" disabled={disabled || playing || !clip.tracks.find((track) => track.boneId === selectedBoneId)?.keyframes.some((keyframe) => keyframe.timeMs === timeMs) || (clip.tracks.find((track) => track.boneId === selectedBoneId)?.keyframes.length || 0) <= 1} onClick={removeKeyframe}>حذف الإطار الحالي</button><span>{clip.tracks.find((track) => track.boneId === selectedBoneId)?.keyframes.length || 0} إطار مفتاحي للعظمة المحددة</span></div></>}
      </div>
      <div className="studio-rig-tools">
        <div><h5>نقاط تثبيت السلاح والقذائف</h5><p>تُستخدم لاحقاً لإطلاق القذائف من موضع السلاح الحقيقي.</p><button type="button" disabled={disabled} onClick={addAttachment}>＋ إضافة نقطة تثبيت</button></div>
        {rig.attachments.map((item) => <div className="studio-rig-tool-row" key={item.id}><label>الاسم<input value={item.name} disabled={disabled} onChange={(event) => update((next) => { next.attachments.find((entry) => entry.id === item.id).name = event.target.value; })}/></label><label>العظمة<select value={item.boneId} disabled={disabled} onChange={(event) => update((next) => { next.attachments.find((entry) => entry.id === item.id).boneId = event.target.value; })}>{rig.bones.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label><label>X<input type="number" value={item.x} disabled={disabled} onChange={(event) => update((next) => { next.attachments.find((entry) => entry.id === item.id).x = Number(event.target.value); })}/></label><label>Y<input type="number" value={item.y} disabled={disabled} onChange={(event) => update((next) => { next.attachments.find((entry) => entry.id === item.id).y = Number(event.target.value); })}/></label><label>الدوران<input type="number" value={item.rotation} disabled={disabled} onChange={(event) => update((next) => { next.attachments.find((entry) => entry.id === item.id).rotation = Number(event.target.value); })}/></label><button type="button" disabled={disabled} onClick={() => { update((next) => { next.attachments = next.attachments.filter((entry) => entry.id !== item.id); }); if (selectedAttachmentId === item.id) setSelectedAttachmentId(rig.attachments.find((entry) => entry.id !== item.id)?.id || ""); }}>حذف</button></div>)}
        <div><h5>مناطق الهجوم والتلقي</h5><p>حدد مناطق الضرر أو مناطق تلقي الإصابة المرتبطة بالعظام.</p><button type="button" disabled={disabled} onClick={addHitbox}>＋ إضافة منطقة إصابة</button></div>
        {rig.hitboxes.map((item) => <div className="studio-rig-tool-row" key={item.id}><label>الاسم<input value={item.name} disabled={disabled} onChange={(event) => update((next) => { next.hitboxes.find((entry) => entry.id === item.id).name = event.target.value; })}/></label><label>العظمة<select value={item.boneId} disabled={disabled} onChange={(event) => update((next) => { next.hitboxes.find((entry) => entry.id === item.id).boneId = event.target.value; })}>{rig.bones.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label><label>النوع<select value={item.kind} disabled={disabled} onChange={(event) => update((next) => { next.hitboxes.find((entry) => entry.id === item.id).kind = event.target.value; })}><option value="hurt">تلقي ضرر</option><option value="attack">هجوم</option></select></label><label>العرض<input type="number" min="1" value={item.width} disabled={disabled} onChange={(event) => update((next) => { next.hitboxes.find((entry) => entry.id === item.id).width = Number(event.target.value); })}/></label><label>X<input type="number" value={item.x} disabled={disabled} onChange={(event) => update((next) => { next.hitboxes.find((entry) => entry.id === item.id).x = Number(event.target.value); })}/></label><label>Y<input type="number" value={item.y} disabled={disabled} onChange={(event) => update((next) => { next.hitboxes.find((entry) => entry.id === item.id).y = Number(event.target.value); })}/></label><label>الدوران<input type="number" value={item.rotation} disabled={disabled} onChange={(event) => update((next) => { next.hitboxes.find((entry) => entry.id === item.id).rotation = Number(event.target.value); })}/></label><label>الارتفاع<input type="number" min="1" value={item.height} disabled={disabled} onChange={(event) => update((next) => { next.hitboxes.find((entry) => entry.id === item.id).height = Number(event.target.value); })}/></label><button type="button" disabled={disabled} onClick={() => { update((next) => { next.hitboxes = next.hitboxes.filter((entry) => entry.id !== item.id); }); if (selectedHitboxId === item.id) setSelectedHitboxId(rig.hitboxes.find((entry) => entry.id !== item.id)?.id || ""); }}>حذف</button></div>)}
      </div>
      {!rigIsReady && <div className="studio-rig-errors" role="alert"><b>أخطاء يجب إصلاحها قبل الحفظ:</b><ul>{editorErrors.map((item) => <li key={item}>{item}</li>)}</ul></div>}
      {error && <p className="studio-rig-errors">{error}</p>}
      <footer>الأجزاء تُرفع أولاً إلى مكتبة الأصول كصور مستقلة من نوع «عنصر»، ثم تُربط هنا. لا يتغير أي أصل أصلي عند تعديل الهيكل.</footer>
    </section>
  );
}
