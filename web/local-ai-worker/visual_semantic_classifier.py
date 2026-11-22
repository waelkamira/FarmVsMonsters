"""Local CLIP zero-shot semantic role classifier for SAM 2 regions.

The model is loaded only from FVM_CLIP_MODEL_DIR on disk. No network downloads,
hosted inference, or silent geometry-based fallback are performed.
"""
import os
import threading
from pathlib import Path

_MODEL = None
_MODEL_ERROR = None
_MODEL_LOCK = threading.Lock()

TAXONOMY = {
    "plant": [
        ("body", "the main central body of a stylized plant character"),
        ("stem", "a plant stem or stalk"),
        ("leaf", "a leaf of a plant"),
        ("flower", "a flower blossom or petal cluster"),
        ("fruit", "a fruit or seed pod growing on a plant"),
        ("root", "plant roots"),
        ("weapon", "a plant character projectile launcher or weapon"),
        ("accessory", "a decorative accessory attached to a plant character"),
        ("shadow", "a cast shadow"),
        ("effect", "a glow, particle, or visual effect"),
    ],
    "monster": [
        ("body", "the torso or main body of a cartoon monster"),
        ("head", "the head of a cartoon monster"),
        ("face", "the face area of a cartoon monster"),
        ("eye", "an eye of a cartoon monster"),
        ("mouth", "the mouth, teeth, or jaw of a cartoon monster"),
        ("arm", "an arm of a cartoon monster"),
        ("hand", "a hand or claw of a cartoon monster"),
        ("leg", "a leg of a cartoon monster"),
        ("foot", "a foot of a cartoon monster"),
        ("weapon", "a weapon held or carried by a monster"),
        ("tail", "a tail of a cartoon monster"),
        ("armor", "armor or protective plating"),
        ("accessory", "a decorative accessory"),
        ("shadow", "a cast shadow"),
        ("effect", "a glow, particle, or visual effect"),
    ],
}

def model_status():
    model_dir = os.environ.get("FVM_CLIP_MODEL_DIR", "").strip()
    return bool(model_dir and Path(model_dir).is_dir())

def _load_model():
    global _MODEL, _MODEL_ERROR
    with _MODEL_LOCK:
        if _MODEL is not None:
            return _MODEL
        if _MODEL_ERROR:
            raise RuntimeError(_MODEL_ERROR)
        model_dir = os.environ.get("FVM_CLIP_MODEL_DIR", "").strip()
        if not model_dir or not Path(model_dir).is_dir():
            _MODEL_ERROR = "Set FVM_CLIP_MODEL_DIR to a locally downloaded CLIP model directory."
            raise RuntimeError(_MODEL_ERROR)
        try:
            import torch
            from transformers import CLIPModel, CLIPProcessor
            processor = CLIPProcessor.from_pretrained(model_dir, local_files_only=True)
            model = CLIPModel.from_pretrained(model_dir, local_files_only=True)
            device = "cuda" if torch.cuda.is_available() else "cpu"
            model.to(device)
            model.eval()
            _MODEL = (model, processor, device, torch)
            return _MODEL
        except Exception as exc:
            _MODEL_ERROR = "Could not load the local CLIP model: " + str(exc)[:220]
            raise RuntimeError(_MODEL_ERROR) from exc

def _role_prompts(character_type):
    kind = "monster" if character_type == "monster" else "plant"
    entries = TAXONOMY[kind]
    return kind, entries, [
        "a cropped close-up image of " + description + ", from a 2D game character sprite"
        for _role, description in entries
    ]

def classify_regions(image_rgb, proposals, character_type):
    """Return visual suggestions. Low-margin predictions are explicitly unknown."""
    import cv2
    import numpy as np
    from PIL import Image

    if not isinstance(proposals, list) or not 1 <= len(proposals) <= 63:
        raise ValueError("Visual classification requires 1–63 segmentation proposals.")
    kind, entries, prompts = _role_prompts(character_type)
    model, processor, device, torch = _load_model()
    crops, indexes = [], []
    height, width = image_rgb.shape[:2]
    for index, proposal in enumerate(proposals):
        bounds = proposal.get("bounds") or {}
        x, y = int(bounds.get("x", -1)), int(bounds.get("y", -1))
        w, h = int(bounds.get("width", 0)), int(bounds.get("height", 0))
        mask_data = proposal.get("mask") or {}
        points = mask_data.get("points") if mask_data.get("kind") == "polygon" else None
        if x < 0 or y < 0 or w < 2 or h < 2 or x + w > width or y + h > height:
            raise ValueError("Proposal " + str(index) + " has invalid crop bounds.")
        if not isinstance(points, list) or len(points) < 3 or len(points) > 512:
            raise ValueError("Proposal " + str(index) + " requires a valid polygon mask.")
        polygon = np.asarray([[int(p["x"]), int(p["y"])] for p in points], dtype=np.int32)
        if np.any(polygon[:, 0] < 0) or np.any(polygon[:, 0] >= width) or np.any(polygon[:, 1] < 0) or np.any(polygon[:, 1] >= height):
            raise ValueError("Proposal " + str(index) + " polygon is outside the image.")
        if np.any(polygon[:, 0] < x) or np.any(polygon[:, 0] >= x + w) or np.any(polygon[:, 1] < y) or np.any(polygon[:, 1] >= y + h):
            raise ValueError("Proposal " + str(index) + " polygon is outside proposal crop.")
        mask = np.zeros((height, width), dtype=np.uint8)
        cv2.fillPoly(mask, [polygon], 255)
        crop = image_rgb[y:y+h, x:x+w].copy()
        crop_mask = mask[y:y+h, x:x+w]
        if not np.any(crop_mask):
            raise ValueError("Proposal " + str(index) + " has an empty polygon mask.")
        crop[crop_mask == 0] = 255
        crops.append(Image.fromarray(crop).convert("RGB"))
        indexes.append(index)

    results = []
    for batch_start in range(0, len(crops), 8):
        batch = crops[batch_start:batch_start + 8]
        inputs = processor(text=prompts, images=batch, return_tensors="pt", padding=True)
        inputs = {key: value.to(device) for key, value in inputs.items()}
        with torch.inference_mode():
            logits = model(**inputs).logits_per_image.float()
            probabilities = torch.softmax(logits, dim=-1).cpu().numpy()
        for offset, scores in enumerate(probabilities):
            order = np.argsort(scores)[::-1]
            best_index = int(order[0])
            best_score = float(scores[best_index])
            second_score = float(scores[int(order[1])]) if len(order) > 1 else 0.0
            margin = best_score - second_score
            role = entries[best_index][0] if best_score >= 0.22 and margin >= 0.035 else "unknown"
            proposal_index = indexes[batch_start + offset]
            bounds = proposals[proposal_index]["bounds"]
            center_x = float(bounds["x"]) + float(bounds["width"]) / 2
            side = "left" if center_x < width / 2 else "right"
            if kind == "plant" and role == "leaf":
                role = "leaf." + side
            elif kind == "monster" and role in ("arm", "hand", "eye"):
                role = role + "." + side
            results.append({
                "proposalId": str(proposals[proposal_index].get("id", "")),
                "role": role,
                "confidence": round(best_score, 5),
                "margin": round(margin, 5),
                "reason": "Local CLIP visual match; softmax score is not calibrated and author review is mandatory.",
                "model": "local-clip-zero-shot",
            })
    return {"protocolVersion": 1, "classifier": "local-clip-zero-shot", "characterType": kind, "suggestions": results}
