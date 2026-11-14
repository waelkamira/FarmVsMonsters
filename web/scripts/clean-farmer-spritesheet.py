#!/usr/bin/env python3
"""Safely remove tiny detached edge fragments from a regular PNG sprite sheet.

The source image is never overwritten. Only small connected alpha components
that touch a frame's edge band are removed. Large or character-connected art
is preserved. Pillow is required: python -m pip install Pillow
"""
from __future__ import annotations

import argparse
import json
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw


def components(alpha: bytes, width: int, height: int, threshold: int):
    """Yield (pixel_indices, bbox, touches_edge_band) for 8-connected alpha."""
    size = width * height
    seen = bytearray(size)
    for start in range(size):
        if seen[start] or alpha[start] <= threshold:
            continue
        seen[start] = 1
        queue = deque([start])
        pixels = []
        min_x = max_x = start % width
        min_y = max_y = start // width
        touches = False
        while queue:
            index = queue.popleft()
            pixels.append(index)
            x, y = index % width, index // width
            min_x, max_x = min(min_x, x), max(max_x, x)
            min_y, max_y = min(min_y, y), max(max_y, y)
            for dy in (-1, 0, 1):
                ny = y + dy
                if ny < 0 or ny >= height:
                    continue
                for dx in (-1, 0, 1):
                    nx = x + dx
                    if nx < 0 or nx >= width or (dx == 0 and dy == 0):
                        continue
                    nxt = ny * width + nx
                    if not seen[nxt] and alpha[nxt] > threshold:
                        seen[nxt] = 1
                        queue.append(nxt)
        yield pixels, (min_x, min_y, max_x, max_y)


def clean_sheet(source: Image.Image, frame_width: int, frame_height: int,
                max_area: int, edge_band: int, alpha_threshold: int):
    source = source.convert("RGBA")
    width, height = source.size
    if width % frame_width or height % frame_height:
        raise ValueError(
            f"Image {width}x{height} is not divisible by frame "
            f"{frame_width}x{frame_height}; refusing to guess frame boundaries."
        )

    output = source.copy()
    reports = []
    cols, rows = width // frame_width, height // frame_height
    for row in range(rows):
        for col in range(cols):
            left, top = col * frame_width, row * frame_height
            tile = source.crop((left, top, left + frame_width, top + frame_height))
            alpha = tile.getchannel("A").tobytes()
            tile_report = []
            for pixels, (x0, y0, x1, y1) in components(
                alpha, frame_width, frame_height, alpha_threshold
            ):
                area = len(pixels)
                at_edge = (
                    x0 <= edge_band or y0 <= edge_band
                    or x1 >= frame_width - 1 - edge_band
                    or y1 >= frame_height - 1 - edge_band
                )
                if area <= max_area and at_edge:
                    for index in pixels:
                        output.putpixel(
                            (left + index % frame_width, top + index // frame_width),
                            (0, 0, 0, 0),
                        )
                    tile_report.append({
                        "area_px": area,
                        "bbox": [x0, y0, x1, y1],
                        "action": "removed_tiny_detached_edge_component",
                    })
            reports.append({
                "frame": row * cols + col,
                "row": row,
                "column": col,
                "removed_components": tile_report,
            })
    return output, reports, cols, rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", default="web/public/assets/characters/farmer/farmer-plant.png")
    parser.add_argument("--frame-width", type=int, default=180)
    parser.add_argument("--frame-height", type=int, default=360)
    parser.add_argument("--max-edge-speck-area", type=int, default=48)
    parser.add_argument("--edge-band", type=int, default=2)
    parser.add_argument("--alpha-threshold", type=int, default=16)
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    source_path = Path(args.input)
    if not source_path.is_file():
        raise SystemExit(f"Source image not found: {source_path}")
    with Image.open(source_path) as image:
        cleaned, report, cols, rows = clean_sheet(
            image, args.frame_width, args.frame_height,
            args.max_edge_speck_area, args.edge_band, args.alpha_threshold
        )

    output_path = Path(args.output) if args.output else source_path.with_name(
        source_path.stem + ".cleaned" + source_path.suffix
    )
    report_path = output_path.with_suffix(".cleanup-report.json")
    preview_path = output_path.with_name(output_path.stem + ".preview.png")

    # A separate output is always used; the original file is never overwritten.
    cleaned.save(output_path)
    report_data = {
        "source": str(source_path),
        "output": str(output_path),
        "frame_size": [args.frame_width, args.frame_height],
        "grid": [cols, rows],
        "max_edge_speck_area": args.max_edge_speck_area,
        "edge_band": args.edge_band,
        "alpha_threshold": args.alpha_threshold,
        "frames": report,
        "removed_component_count": sum(len(frame["removed_components"]) for frame in report),
    }
    report_path.write_text(json.dumps(report_data, indent=2), encoding="utf-8")

    # Contact sheet of individually cropped frames for quick human verification.
    pad, label_h = 12, 24
    preview = Image.new(
        "RGBA",
        (cols * (args.frame_width + pad) + pad,
         rows * (args.frame_height + label_h + pad) + pad),
        (238, 238, 238, 255),
    )
    draw = ImageDraw.Draw(preview)
    for index in range(cols * rows):
        row, col = divmod(index, cols)
        x = pad + col * (args.frame_width + pad)
        y = pad + row * (args.frame_height + label_h + pad)
        tile = cleaned.crop((
            col * args.frame_width, row * args.frame_height,
            (col + 1) * args.frame_width, (row + 1) * args.frame_height,
        ))
        preview.alpha_composite(tile, (x, y + label_h))
        draw.text((x, y + 4), f"Frame {index + 1}", fill=(20, 20, 20, 255))
    preview.convert("RGB").save(preview_path)

    print(f"Cleaned copy: {output_path}")
    print(f"Frame preview: {preview_path}")
    print(f"Removal report: {report_path}")
    print(f"Removed tiny edge components: {report_data['removed_component_count']}")
    print("Review the preview before replacing the original sprite sheet.")


if __name__ == "__main__":
    main()
