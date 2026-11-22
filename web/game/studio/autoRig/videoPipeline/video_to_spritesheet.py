#!/usr/bin/env python3
"""AI video -> normalized PNG frames + Phaser atlas JSON. Requires FFmpeg and Pillow."""
import argparse
import json
import math
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from PIL import Image

def command(args):
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout.strip()

def probe(path):
    data = json.loads(command(["ffprobe", "-v", "error", "-show_entries",
        "format=duration:stream=width,height,codec_name,pix_fmt", "-of", "json", str(path)]))
    stream = next((s for s in data.get("streams", []) if "width" in s), None)
    duration = float(data.get("format", {}).get("duration") or 0)
    if not stream or duration <= 0:
        raise ValueError("Cannot read video dimensions or duration.")
    return {"width": stream["width"], "height": stream["height"], "durationSeconds": duration,
            "codec": stream.get("codec_name"), "pixelFormat": stream.get("pix_fmt")}

def bbox(image):
    alpha = image.convert("RGBA").getchannel("A")
    return alpha.point(lambda p: 255 if p > 12 else 0).getbbox()

def extract(video, folder, count, info, background, start_seconds, clip_duration):
    rate = count / clip_duration
    filters = [f"fps={rate:.10f}"]
    if background == "green":
        filters.append("chromakey=0x00FF00:0.16:0.08")
    filters.append("format=rgba")
    target = folder / "frame-%04d.png"
    command(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(start_seconds),
             "-i", str(video), "-t", str(clip_duration), "-an", "-vf", ",".join(filters),
             "-frames:v", str(count), str(target)])
    paths = sorted(folder.glob("frame-*.png"))
    if not paths:
        raise RuntimeError("FFmpeg did not produce frames.")
    original_count = len(paths)
    if original_count < count:
        with Image.open(paths[-1]) as last:
            for i in range(original_count, count):
                last.save(folder / ("frame-%04d.png" % (i + 1)))
        paths = sorted(folder.glob("frame-*.png"))
    return paths[:count], original_count

def normalize(paths, width, height, margin):
    images = [Image.open(p).convert("RGBA") for p in paths]
    source_boxes = [bbox(im) for im in images]
    opaque_source_frames = sum(1 for im, b in zip(images, source_boxes) if b == (0, 0, im.width, im.height))
    boxes = [b for b in source_boxes if b]
    if not boxes:
        raise ValueError("No visible pixels. Check the background-removal mode.")
    x0, y0 = min(b[0] for b in boxes), min(b[1] for b in boxes)
    x1, y1 = max(b[2] for b in boxes), max(b[3] for b in boxes)
    cw, ch = x1 - x0, y1 - y0
    scale = min((width - 2 * margin) / cw, (height - 2 * margin) / ch)
    rw, rh = max(1, round(cw * scale)), max(1, round(ch * scale))
    result = []
    for im in images:
        subject = im.crop((x0, y0, x1, y1)).resize((rw, rh), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        canvas.alpha_composite(subject, ((width - rw) // 2, height - margin - rh))
        result.append(canvas)
    return result, {"sourceCrop": [x0, y0, x1, y1], "scale": scale, "subjectSize": [rw, rh]}, opaque_source_frames

def write_atlas(frames, path, columns, name):
    w, h = frames[0].size
    rows = math.ceil(len(frames) / columns)
    sheet = Image.new("RGBA", (columns * w, rows * h), (0, 0, 0, 0))
    atlas_frames = {}
    for i, frame in enumerate(frames):
        x, y = (i % columns) * w, (i // columns) * h
        sheet.alpha_composite(frame, (x, y))
        atlas_frames[name + "_" + str(i).zfill(2)] = {
            "frame": {"x": x, "y": y, "w": w, "h": h},
            "rotated": False, "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": w, "h": h},
            "sourceSize": {"w": w, "h": h}}
    sheet.save(path, optimize=True)
    metadata = {"frames": atlas_frames, "meta": {"app": "FarmVsMonsters AI Video Pipeline",
        "version": "1.0", "image": path.name, "format": "RGBA8888",
        "size": {"w": sheet.width, "h": sheet.height}, "scale": "1"}}
    path.with_suffix(".json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    return rows

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--input", required=True, type=Path)
    p.add_argument("--output-dir", required=True, type=Path)
    p.add_argument("--name", default="character")
    p.add_argument("--frames", type=int, default=24)
    p.add_argument("--fps", type=int, default=12)
    p.add_argument("--start-seconds", type=float, default=0.0)
    p.add_argument("--clip-duration", type=float, default=None,
                   help="Duration to extract; defaults to the remaining source video duration.")
    p.add_argument("--width", type=int, default=150)
    p.add_argument("--height", type=int, default=150)
    p.add_argument("--columns", type=int, default=6)
    p.add_argument("--margin", type=int, default=4)
    p.add_argument("--background", choices=["green", "alpha", "none"], default="green")
    a = p.parse_args()
    if not a.input.is_file():
        raise FileNotFoundError(a.input)
    if min(a.frames, a.fps, a.width, a.height, a.columns) < 1 or a.frames < 2:
        raise ValueError("Invalid frame count, FPS or canvas dimensions.")
    if a.margin < 0 or 2 * a.margin >= min(a.width, a.height):
        raise ValueError("Margin is too large.")
    for exe in ("ffmpeg", "ffprobe"):
        if not shutil.which(exe):
            raise RuntimeError(exe + " must be installed and available on PATH.")
    a.output_dir.mkdir(parents=True, exist_ok=True)
    info = probe(a.input)
    if a.start_seconds < 0 or a.start_seconds >= info["durationSeconds"]:
        raise ValueError("start-seconds must be inside the source video.")
    clip_duration = a.clip_duration if a.clip_duration is not None else info["durationSeconds"] - a.start_seconds
    if clip_duration <= 0 or a.start_seconds + clip_duration > info["durationSeconds"] + 0.02:
        raise ValueError("Selected clip range exceeds the source video duration.")
    with tempfile.TemporaryDirectory(prefix="fvm-ai-video-") as tmp:
        paths, original_count = extract(a.input, Path(tmp), a.frames, info, a.background,
                                        a.start_seconds, clip_duration)
        frames, layout, opaque_source_frames = normalize(paths, a.width, a.height, a.margin)
    frames_dir = a.output_dir / "frames"
    frames_dir.mkdir(exist_ok=True)
    for i, frame in enumerate(frames):
        frame.save(frames_dir / (a.name + "-" + str(i).zfill(2) + ".png"), optimize=True)
    columns = min(a.columns, len(frames))
    atlas_path = a.output_dir / (a.name + ".png")
    rows = write_atlas(frames, atlas_path, columns, a.name)
    empty, opaque = [], 0
    for i, frame in enumerate(frames):
        b = bbox(frame)
        if not b:
            empty.append(i)
        elif b == (0, 0, a.width, a.height):
            opaque += 1
    warnings = []
    if original_count < a.frames:
        warnings.append("Some frames were duplicated to complete the requested count.")
    if empty:
        warnings.append("One or more frames have no visible subject.")
    if opaque_source_frames == len(frames):
        warnings.append("All decoded source frames are fully opaque; background removal may not have occurred.")
    report = {"status": "needs_review" if warnings else "passed_structural_checks",
        "requestedFrames": a.frames, "decodedFrames": original_count, "outputFrames": len(frames),
        "source": info, "sourceClipStartSeconds": a.start_seconds, "sourceClipDurationSeconds": clip_duration,
        "playbackFps": a.fps, "playbackDurationSeconds": len(frames) / a.fps,
        "canvas": {"width": a.width, "height": a.height},
        "sheet": {"columns": columns, "rows": rows, "width": columns * a.width, "height": rows * a.height},
        "backgroundMode": a.background, "layout": layout, "emptyFrames": empty,
        "opaqueFrameCount": opaque, "opaqueSourceFrameCount": opaque_source_frames, "warnings": warnings,
        "note": "Structural checks do not judge artistic quality, anatomy, or identity consistency.",
        "atlas": atlas_path.name, "atlasJson": atlas_path.with_suffix(".json").name}
    (a.output_dir / "validation.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "atlas": str(atlas_path),
                      "validation": str(a.output_dir / "validation.json"), "warnings": warnings}, indent=2))
    return 0 if not warnings else 2

if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError) as exc:
        print("ERROR: " + str(exc), file=sys.stderr)
        sys.exit(1)
