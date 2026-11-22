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


def load_frame(path, columns=1, rows=1, frame_index=0, frame_width=None, frame_height=None):
    image = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if image is None:
        raise RuntimeError("Could not read real game asset: " + str(path))
    height, width = image.shape[:2]
    if frame_width and frame_height:
        columns, rows = width // frame_width, height // frame_height
    else:
        frame_width, frame_height = width // columns, height // rows
    if columns < 1 or rows < 1 or frame_index < 0 or frame_index >= columns * rows:
        raise ValueError("Invalid sprite-sheet grid or frame index.")
    col, row = frame_index % columns, frame_index // columns
    frame = image[row * frame_height:(row + 1) * frame_height, col * frame_width:(col + 1) * frame_width]
    ok, encoded = cv2.imencode(".png", frame)
    if not ok:
        raise RuntimeError("Could not encode source frame: " + str(path))
    return frame, "data:image/png;base64," + base64.b64encode(encoded.tobytes()).decode("ascii")


def save_mask_preview(rgb, proposals, suggestions, output_path):
    palette = {
        "body": (255, 150, 40), "stem": (255, 190, 60), "leaf": (60, 190, 90),
        "leaf.left": (60, 190, 90), "leaf.right": (30, 150, 70), "head": (230, 90, 190),
        "face": (230, 90, 190), "eye.left": (80, 170, 255), "eye.right": (40, 120, 230),
        "weapon": (240, 70, 60), "weapon.muzzle": (240, 70, 60), "unknown": (150, 150, 150),
    }
    preview = rgb.copy()
    for proposal, suggestion in zip(proposals, suggestions):
        points = proposal.get("mask", {}).get("points", [])
        if len(points) < 3:
            continue
        polygon = np.asarray([[int(point["x"]), int(point["y"])] for point in points], dtype=np.int32)
        role = str(suggestion.get("role", "unknown"))
        color = palette.get(role, palette.get(role.split(".")[0], palette["unknown"]))
        layer = preview.copy()
        cv2.fillPoly(layer, [polygon], color)
        preview = cv2.addWeighted(layer, 0.28, preview, 0.72, 0)
        cv2.polylines(preview, [polygon], True, color, 2, cv2.LINE_AA)
        bounds = proposal.get("bounds", {})
        x = max(0, int(bounds.get("x", 0)))
        y = max(14, int(bounds.get("y", 0)) - 4)
        confidence = float(suggestion.get("confidence", 0))
        cv2.putText(preview, f"{role} {confidence:.2f}", (x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.34, color, 1, cv2.LINE_AA)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(output_path), cv2.cvtColor(preview, cv2.COLOR_RGB2BGR)):
        raise RuntimeError("Could not save segmentation preview: " + str(output_path))
    return output_path


def run_asset(path, character_type, columns, rows, frame_index, frame_width=None, frame_height=None, preview_path=None):
    frame, data_url = load_frame(path, columns, rows, frame_index, frame_width, frame_height)
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
    saved_preview = save_mask_preview(decoded, proposals, suggestions, preview_path) if preview_path else None
    return {
        "asset": str(path),
        "characterType": character_type,
        "frame": {"index": frame_index, "columns": columns, "rows": rows, "width": width, "height": height},
        "sam2ProposalCount": len(proposals),
        "visualSuggestionCount": len(known),
        "unknownSuggestionCount": len(suggestions) - len(known),
        "suggestions": suggestions,
        "preview": str(saved_preview) if saved_preview else None,
    }


def main():
    parser = argparse.ArgumentParser(description="Smoke-test real plant and monster art with local SAM 2 and CLIP.")
    parser.add_argument("--plant", default="../public/assets/plants/hazelnut-level-1.png")
    parser.add_argument("--plant-columns", type=int, default=3)
    parser.add_argument("--plant-rows", type=int, default=3)
    parser.add_argument("--plant-frame-width", type=int, default=341)
    parser.add_argument("--plant-frame-height", type=int, default=341)
    parser.add_argument("--plant-frame", type=int, default=0)
    parser.add_argument("--monster", default="../public/assets/characters/monsters/hyena/hyena-idle.png")
    parser.add_argument("--monster-columns", type=int, default=1)
    parser.add_argument("--monster-rows", type=int, default=1)
    parser.add_argument("--monster-frame-width", type=int, default=360)
    parser.add_argument("--monster-frame-height", type=int, default=298)
    parser.add_argument("--monster-frame", type=int, default=0)
    parser.add_argument("--output-dir", default="auto-rig-real-asset-results", help="Directory for visual mask/role preview PNGs.")
    args = parser.parse_args()
    output_dir = Path(args.output_dir)
    plant = run_asset(Path(args.plant), "plant", args.plant_columns, args.plant_rows, args.plant_frame, args.plant_frame_width, args.plant_frame_height, output_dir / "hazelnut-sam2-clip-preview.png")
    monster = run_asset(Path(args.monster), "monster", args.monster_columns, args.monster_rows, args.monster_frame, args.monster_frame_width, args.monster_frame_height, output_dir / "hyena-sam2-clip-preview.png")
    print(json.dumps({"status": "passed", "assets": [plant, monster]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
