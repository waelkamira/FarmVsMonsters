#!/usr/bin/env python3
"""Extract one known Phaser sprite-sheet frame as an image-to-video reference."""
import argparse
from pathlib import Path
from PIL import Image

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--input", required=True, type=Path)
    p.add_argument("--output", required=True, type=Path)
    p.add_argument("--frame-width", type=int, required=True)
    p.add_argument("--frame-height", type=int, required=True)
    p.add_argument("--columns", type=int, required=True)
    p.add_argument("--index", type=int, default=0)
    a = p.parse_args()
    if not a.input.is_file():
        raise FileNotFoundError(a.input)
    if min(a.frame_width, a.frame_height, a.columns) < 1 or a.index < 0:
        raise ValueError("Frame dimensions/columns must be positive and index non-negative.")
    with Image.open(a.input) as sheet:
        rows = sheet.height // a.frame_height
        total = rows * a.columns
        if a.frame_width * a.columns > sheet.width or rows < 1 or a.index >= total:
            raise ValueError("The requested frame grid does not fit inside the source sheet.")
        col, row = a.index % a.columns, a.index // a.columns
        box = (col * a.frame_width, row * a.frame_height,
               (col + 1) * a.frame_width, (row + 1) * a.frame_height)
        frame = sheet.crop(box).convert("RGBA")
        a.output.parent.mkdir(parents=True, exist_ok=True)
        frame.save(a.output, optimize=True)
    print(f"Saved reference frame {a.index}: {a.output} ({a.frame_width}x{a.frame_height})")

if __name__ == "__main__":
    main()
