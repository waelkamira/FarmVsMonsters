"""Run local SAM 2 + CLIP against real FarmVsMonsters sprites.

Run from web/local-ai-worker after setting SAM2_CONFIG, SAM2_CHECKPOINT,
FVM_CLIP_MODEL_DIR and (optionally) the source asset paths.
"""
import argparse
import base64
import json
from pathlib import Path

import cv2
import numpy as np

from worker import decode_image_data, detect_parts
from visual_semantic_classifier import classify_regions


def load_frame(path, columns=1, rows=1, frame_index=0):
    image = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if image is None:
        raise RuntimeError("Could not read real game asset: " + str(path))
    height, width = image.shape[:2]
    if columns < 1 or rows < 1 or frame_index < 0 or frame_index >= columns * rows:
        raise ValueError("Invalid sprite-sheet grid or frame index.")
    frame_width, frame_height = width // columns, height // rows
    col, row = frame_index % columns, frame_index // columns
    frame = image[row * frame_height:(row + 1) * frame_height, col * frame_width:(col + 1) * frame_width]
    ok, encoded = cv2.imencode(".png", frame)
    if not ok:
        raise RuntimeError("Could not encode source frame: " + str(path))
    return frame, "data:image/png;base64," + base64.b64encode(encoded.tobytes()).decode("ascii")


def run_asset(path, character_type, columns, rows, frame_index):
    frame, data_url = load_frame(path, columns, rows, frame_index)
    height, width = frame.shape[:2]
    payload = {
        "canvas": {"width": width, "height": height},
        "imageDataUrl": data_url,
    }
    decoded, _visible = decode_image_data(data_url, width, height)
    segmented = detect_parts(payload)
    proposals = segmented.get("proposals", [])
    if not proposals:
        raise RuntimeError("SAM 2 returned no visible masks for " + str(path))
    classified = classify_regions(decoded, proposals, character_type)
    suggestions = classified["suggestions"]
    if len(suggestions) != len(proposals):
        raise RuntimeError("Visual classifier returned an incomplete proposal set for " + str(path))
    known = [item for item in suggestions if item["role"] != "unknown"]
    return {
        "asset": str(path),
        "characterType": character_type,
        "frame": {"index": frame_index, "columns": columns, "rows": rows, "width": width, "height": height},
        "sam2ProposalCount": len(proposals),
        "visualSuggestionCount": len(known),
        "unknownSuggestionCount": len(suggestions) - len(known),
        "suggestions": suggestions,
    }


def main():
    parser = argparse.ArgumentParser(description="Smoke-test real plant and monster art with local SAM 2 and CLIP.")
    parser.add_argument("--plant", default="../public/assets/plants/hazelnut-level-1.png")
    parser.add_argument("--plant-columns", type=int, default=3)
    parser.add_argument("--plant-rows", type=int, default=3)
    parser.add_argument("--plant-frame", type=int, default=0)
    parser.add_argument("--monster", default="../public/assets/characters/monsters/hyena/hyena-idle.png")
    parser.add_argument("--monster-columns", type=int, default=1)
    parser.add_argument("--monster-rows", type=int, default=1)
    parser.add_argument("--monster-frame", type=int, default=0)
    args = parser.parse_args()
    plant = run_asset(Path(args.plant), "plant", args.plant_columns, args.plant_rows, args.plant_frame)
    monster = run_asset(Path(args.monster), "monster", args.monster_columns, args.monster_rows, args.monster_frame)
    print(json.dumps({"status": "passed", "assets": [plant, monster]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
