"""Local diffusion inpainting for reviewable hidden-part reconstruction.

All model files must already exist in FVM_INPAINT_MODEL_DIR. This module never
downloads weights and emits only the authored target polygon as a transparent
patch, with explicit model/prompt/seed provenance.
"""
import base64
import os
import threading
from pathlib import Path

_PIPELINE = None
_PIPELINE_ERROR = None
_PIPELINE_LOCK = threading.Lock()
_INFERENCE_LOCK = threading.Lock()

def model_status():
    model_dir = Path(os.environ.get("FVM_INPAINT_MODEL_DIR", "").strip())
    if not model_dir.is_dir() or not (model_dir / "model_index.json").is_file():
        return False
    unet = model_dir / "unet"
    return (unet / "config.json").is_file() and any((unet / name).is_file() for name in ("diffusion_pytorch_model.safetensors", "diffusion_pytorch_model.bin"))

def _load_pipeline():
    global _PIPELINE, _PIPELINE_ERROR
    with _PIPELINE_LOCK:
        if _PIPELINE is not None:
            return _PIPELINE
        if _PIPELINE_ERROR:
            raise RuntimeError(_PIPELINE_ERROR)
        model_dir = os.environ.get("FVM_INPAINT_MODEL_DIR", "").strip()
        if not model_dir or not Path(model_dir).is_dir():
            _PIPELINE_ERROR = "Set FVM_INPAINT_MODEL_DIR to a locally downloaded diffusion inpainting model directory."
            raise RuntimeError(_PIPELINE_ERROR)
        try:
            import torch
            from diffusers import StableDiffusionInpaintPipeline
            device = "cuda" if torch.cuda.is_available() else "cpu"
            dtype = torch.float16 if device == "cuda" else torch.float32
            pipeline = StableDiffusionInpaintPipeline.from_pretrained(
                model_dir,
                local_files_only=True,
                torch_dtype=dtype
            )
            pipeline.to(device)
            pipeline.enable_attention_slicing()
            _PIPELINE = (pipeline, torch, device)
            return _PIPELINE
        except Exception as exc:
            _PIPELINE_ERROR = "Could not load the local anatomical inpainting model: " + str(exc)[:220]
            raise RuntimeError(_PIPELINE_ERROR) from exc

def reconstruct_anatomical_region(payload, image_rgb):
    import cv2
    import numpy as np
    from PIL import Image

    width, height = payload["canvas"]["width"], payload["canvas"]["height"]
    if image_rgb.shape[:2] != (height, width):
        raise ValueError("Decoded image dimensions do not match the reconstruction canvas.")
    points = payload.get("targetPolygon")
    if not isinstance(points, list) or len(points) < 3 or len(points) > 512:
        raise ValueError("Anatomical target polygon must contain 3–512 points.")
    polygon = np.asarray([[int(point["x"]), int(point["y"])] for point in points], dtype=np.int32)
    if np.any(polygon[:, 0] < 0) or np.any(polygon[:, 0] >= width) or np.any(polygon[:, 1] < 0) or np.any(polygon[:, 1] >= height):
        raise ValueError("Anatomical target polygon is outside the source image.")
    full_mask = np.zeros((height, width), dtype=np.uint8)
    cv2.fillPoly(full_mask, [polygon], 255)
    x, y, w, h = cv2.boundingRect(full_mask)
    if w < 8 or h < 8 or int((full_mask > 0).sum()) < 64:
        raise ValueError("Anatomical target region is too small for diffusion reconstruction.")
    if max(w, h) > 768:
        raise ValueError("Split large hidden regions into smaller reviewable anatomical patches (maximum target dimension 768 px).")
    prompt_detail = payload.get("prompt", "")
    if not isinstance(prompt_detail, str) or len(prompt_detail) > 400:
        raise ValueError("Reconstruction prompt must be a string of at most 400 characters.")
    prompt_detail = prompt_detail.strip()
    if not prompt_detail:
        raise ValueError("Describe the missing anatomical part before generation.")
    seed = payload.get("seed", 20261122)
    if isinstance(seed, bool) or not isinstance(seed, int) or not 0 <= seed <= 2147483647:
        raise ValueError("Reconstruction seed must be an integer from 0 to 2147483647.")

    side = max(256, min(1536, max(w, h) * 2))
    center_x, center_y = x + w / 2, y + h / 2
    crop_x0, crop_y0 = int(round(center_x - side / 2)), int(round(center_y - side / 2))
    crop_canvas = np.full((side, side, 3), 255, dtype=np.uint8)
    crop_mask = np.zeros((side, side), dtype=np.uint8)
    src_x0, src_y0 = max(0, crop_x0), max(0, crop_y0)
    src_x1, src_y1 = min(width, crop_x0 + side), min(height, crop_y0 + side)
    dst_x0, dst_y0 = src_x0 - crop_x0, src_y0 - crop_y0
    crop_canvas[dst_y0:dst_y0 + (src_y1-src_y0), dst_x0:dst_x0 + (src_x1-src_x0)] = image_rgb[src_y0:src_y1, src_x0:src_x1]
    shifted = polygon.copy()
    shifted[:, 0] -= crop_x0
    shifted[:, 1] -= crop_y0
    cv2.fillPoly(crop_mask, [shifted], 255)

    input_image = Image.fromarray(crop_canvas).resize((512, 512), Image.Resampling.LANCZOS)
    input_mask = Image.fromarray(crop_mask).resize((512, 512), Image.Resampling.NEAREST)
    pipeline, torch, device = _load_pipeline()
    full_prompt = (
        "seamlessly reconstruct the missing anatomical part " + prompt_detail +
        " of the same stylized 2D game character, preserve its original art direction, "
        "outline thickness, material, lighting and color palette, clean game sprite illustration"
    )
    negative_prompt = "different character, extra unrelated objects, extra limbs, duplicate anatomy, text, watermark, blurry, photorealistic, 3d render"
    generator = torch.Generator(device=device).manual_seed(seed)
    with _INFERENCE_LOCK, torch.inference_mode():
        generated = pipeline(
            prompt=full_prompt,
            negative_prompt=negative_prompt,
            image=input_image,
            mask_image=input_mask,
            num_inference_steps=25,
            guidance_scale=7.0,
            generator=generator
        ).images[0].convert("RGB")

    left = max(0, int(round((x - crop_x0) * 512 / side)))
    top = max(0, int(round((y - crop_y0) * 512 / side)))
    right = min(512, int(round((x + w - crop_x0) * 512 / side)))
    bottom = min(512, int(round((y + h - crop_y0) * 512 / side)))
    generated_crop = generated.crop((left, top, right, bottom)).resize((w, h), Image.Resampling.LANCZOS)
    alpha = full_mask[y:y+h, x:x+w]
    rgba = np.asarray(generated_crop, dtype=np.uint8).copy()
    rgba = cv2.cvtColor(rgba, cv2.COLOR_RGB2RGBA)
    rgba[:, :, 3] = alpha
    ok, encoded = cv2.imencode(".png", cv2.cvtColor(rgba, cv2.COLOR_RGBA2BGRA))
    if not ok:
        raise RuntimeError("Could not encode the generated anatomical patch.")
    data_url = "data:image/png;base64," + base64.b64encode(encoded.tobytes()).decode("ascii")
    if len(data_url) > 11 * 1024 * 1024:
        raise ValueError("Generated anatomical patch exceeds the output size limit.")
    return {
        "protocolVersion": 1,
        "patchDataUrl": data_url,
        "targetBounds": {"x": x, "y": y, "width": w, "height": h},
        "provenance": {
            "pixels": "reconstructed",
            "method": "local-diffusion-anatomical-inpaint",
            "model": Path(os.environ["FVM_INPAINT_MODEL_DIR"]).name,
            "seed": seed,
            "prompt": prompt_detail,
            "reviewRequired": True
        }
    }
