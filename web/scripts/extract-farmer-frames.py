#!/usr/bin/env python3
"""Extract separated farmer frames from transparent-gutter PNG sheets.

The source is never modified. Fully transparent gutters define frame rows and
columns. Every extracted frame is normalized to a 512x512 transparent canvas,
using one shared scale per source sheet and a common bottom/foot baseline.
Requires Pillow: python -m pip install Pillow
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw


CANVAS = 512
PADDING = 16
ALPHA_THRESHOLD = 8


def occupied_runs(values: list[bool], minimum_gutter: int = 8) -> list[tuple[int, int]]:
    """Return half-open runs of occupied rows or columns."""
    runs = []
    start = None
    for index, occupied in enumerate(values + [False]):
        if occupied and start is None:
            start = index
        elif not occupied and start is not None:
            runs.append((start, index))
            start = None
    return runs


def detect_frames(image: Image.Image, alpha_threshold: int = ALPHA_THRESHOLD):
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    mask = alpha.point(lambda value: 255 if value > alpha_threshold else 0)
    width, height = rgba.size
    px = mask.load()

    occupied_columns = [
        any(px[x, y] for y in range(height)) for x in range(width)
    ]
    occupied_rows = [
        any(px[x, y] for x in range(width)) for y in range(height)
    ]
    columns = occupied_runs(occupied_columns)
    rows = occupied_runs(occupied_rows)
    if not columns or not rows:
        raise ValueError("No visible sprite pixels found.")
    boxes = []
    for top, bottom in rows:
        for left, right in columns:
            crop = mask.crop((left, top, right, bottom))
            bbox = crop.getbbox()
            if bbox:
                boxes.append((left + bbox[0], top + bbox[1],
                              left + bbox[2], top + bbox[3]))
    if not boxes:
        raise ValueError("No frames could be detected.")
    return rgba, boxes, rows, columns


def normalize_frames(image: Image.Image, boxes, canvas=CANVAS, padding=PADDING,
                     shared_scale: float | None = None):
    usable = canvas - 2 * padding
    max_dimension = max(max(x2 - x1, y2 - y1) for x1, y1, x2, y2 in boxes)
    scale = shared_scale if shared_scale is not None else usable / max_dimension
    if scale <= 0:
        raise ValueError("Scale must be a positive number.")
    if max_dimension * scale > usable:
        raise ValueError(
            f"Scale {scale} makes the largest frame exceed the {usable}px usable area."
        )
    frames = []
    metadata = []
    for index, (x1, y1, x2, y2) in enumerate(boxes, start=1):
        crop = image.crop((x1, y1, x2, y2))
        width = max(1, round(crop.width * scale))
        height = max(1, round(crop.height * scale))
        sprite = crop.resize((width, height), Image.Resampling.LANCZOS)
        frame = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
        x = (canvas - width) // 2
        y = canvas - padding - height
        frame.alpha_composite(sprite, (x, y))
        frames.append(frame)
        metadata.append({
            "frame": index,
            "source_bbox": [x1, y1, x2, y2],
            "source_size": [x2 - x1, y2 - y1],
            "output_size": [canvas, canvas],
            "sprite_bbox_on_canvas": [x, y, x + width, y + height],
            "foot_baseline_y": canvas - padding,
        })
    return frames, metadata, scale


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("--output-dir", type=Path, default=None)
    parser.add_argument("--alpha-threshold", type=int, default=ALPHA_THRESHOLD)
    parser.add_argument(
        "--scale", type=float, default=None,
        help="Reuse the exact scale reported for the idle sheet to keep all action sheets the same visual size.",
    )
    args = parser.parse_args()

    if not args.input.is_file():
        raise SystemExit(f"Input image not found: {args.input}")
    output_dir = args.output_dir or args.input.parent / (args.input.stem + "-frames")
    output_dir.mkdir(parents=True, exist_ok=True)

    with Image.open(args.input) as source:
        rgba, boxes, row_runs, column_runs = detect_frames(
            source, args.alpha_threshold
        )
        frames, metadata, scale = normalize_frames(
            rgba, boxes, shared_scale=args.scale
        )

    for index, frame in enumerate(frames, start=1):
        frame.save(output_dir / f"frame-{index:02d}.png")

    columns = len(column_runs)
    rows = len(row_runs)
    pad, label_h = 12, 24
    preview = Image.new(
        "RGBA",
        (columns * (CANVAS + pad) + pad,
         rows * (CANVAS + label_h + pad) + pad),
        (232, 232, 232, 255),
    )
    draw = ImageDraw.Draw(preview)
    for index, frame in enumerate(frames):
        row, col = divmod(index, columns)
        x = pad + col * (CANVAS + pad)
        y = pad + row * (CANVAS + label_h + pad)
        preview.alpha_composite(frame, (x, y + label_h))
        draw.text((x, y + 4), f"Frame {index + 1}", fill=(20, 20, 20, 255))
    preview.convert("RGB").save(output_dir / "contact-sheet.jpg")

    report = {
        "source": str(args.input),
        "frame_count": len(frames),
        "detected_grid": {"rows": rows, "columns": columns},
        "canvas": [CANVAS, CANVAS],
        "transparent_padding": PADDING,
        "shared_scale": scale,
        "frames": metadata,
    }
    (output_dir / "frames.json").write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )
    print(f"Extracted {len(frames)} frames to {output_dir}")
    print(f"Detected grid: {rows} row(s) x {columns} column(s)")
    print(f"Shared scale: {scale:.8f}")
    print("Pass this exact --scale value to every other action sheet.")
    print("Review contact-sheet.jpg before integrating frames into the game.")


if __name__ == "__main__":
    main()
