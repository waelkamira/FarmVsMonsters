#!/usr/bin/env python3
"""Authenticated Wan 2.1 VACE 1.3B image-to-video worker for FarmVsMonsters Studio."""
from __future__ import annotations

import base64
import json
import math
import os
import re
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import FileResponse
from PIL import Image, ImageOps
from pydantic import BaseModel, ConfigDict

ROOT = Path(os.environ.get("FVM_WAN_WORKER_DATA_DIR", Path(__file__).resolve().parent / "data")).resolve()
JOBS = ROOT / "jobs"
TOKEN = os.environ.get("FVM_WAN_WORKER_TOKEN", "")
MODEL_ID = os.environ.get("FVM_WAN_MODEL_ID", "Wan-AI/Wan2.1-VACE-1.3B-diffusers")
MAX_BODY_BYTES = 16 * 1024 * 1024
MAX_IMAGE_BYTES = 8 * 1024 * 1024
ALLOWED_MOTIONS = {"idle", "walk", "run", "fly", "attack", "hurt", "death"}
app = FastAPI(title="FarmVsMonsters Wan Worker", version="1.0.0")
executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="fvm-wan")
pipeline = None
pipeline_lock = threading.Lock()


class Motion(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    prompt: str
    negativePrompt: str = ""
    frames: int = 24
    fps: int = 12
    width: int = 832
    height: int = 480
    durationSeconds: float = 2
    frameWidth: int = 150
    frameHeight: int = 150
    columns: int = 6
    steps: int = 20
    guidanceScale: float = 5.0
    seed: int | None = None


class GenerateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    protocolVersion: int
    jobId: str
    sourceImage: dict[str, Any]
    motions: list[Motion]


def require_auth(authorization: str | None):
    if not TOKEN:
        raise HTTPException(status_code=503, detail="FVM_WAN_WORKER_TOKEN is not configured.")
    if authorization != "Bearer " + TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized.")


def job_folder(job_id: str) -> Path:
    if not re.fullmatch(r"[a-f0-9-]{36}", job_id or "", re.I):
        raise HTTPException(status_code=400, detail="Invalid job ID.")
    return JOBS / job_id


def write_job(folder: Path, job: dict):
    folder.mkdir(parents=True, exist_ok=True)
    temp = folder / "job.tmp"
    temp.write_text(json.dumps(job, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(folder / "job.json")


def read_job(job_id: str) -> dict:
    folder = job_folder(job_id)
    try:
        return json.loads((folder / "job.json").read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Job not found.")


def validate_motion(motion: Motion):
    if motion.id not in ALLOWED_MOTIONS:
        raise ValueError("Unsupported motion ID: " + motion.id)
    if not 2 <= motion.frames <= 96 or not 1 <= motion.fps <= 30:
        raise ValueError("Frames must be 2–96 and FPS 1–30.")
    if not 256 <= motion.width <= 832 or not 256 <= motion.height <= 480 or motion.width % 16 or motion.height % 16:
        raise ValueError("Wan VACE dimensions must be multiples of 16 within 256–832 × 256–480.")
    if not 0.5 <= motion.durationSeconds <= 12:
        raise ValueError("Duration must be between 0.5 and 12 seconds.")
    if not 8 <= motion.steps <= 40 or not 1 <= motion.guidanceScale <= 10:
        raise ValueError("Inference steps or guidance scale is outside the supported range.")
    if not 32 <= motion.frameWidth <= 512 or not 32 <= motion.frameHeight <= 512:
        raise ValueError("Sprite frame dimensions must be between 32 and 512.")
    if not 1 <= motion.columns <= motion.frames:
        raise ValueError("Sprite columns must be between 1 and requested frame count.")
    if len(motion.prompt) > 3000 or len(motion.negativePrompt) > 3000:
        raise ValueError("Prompts may not exceed 3000 characters.")


def decode_source(source: dict) -> Image.Image:
    mime = source.get("mimeType")
    if mime not in ("image/png", "image/jpeg"):
        raise ValueError("Source image must be PNG or JPEG.")
    raw = source.get("base64")
    if not isinstance(raw, str) or len(raw) > (MAX_IMAGE_BYTES * 4 // 3 + 32):
        raise ValueError("Source image exceeds 8 MB.")
    try:
        data = base64.b64decode(raw, validate=True)
        if len(data) > MAX_IMAGE_BYTES:
            raise ValueError("Source image exceeds 8 MB.")
        image = Image.open(BytesIO(data))
        image.verify()
        image = Image.open(BytesIO(data)).convert("RGB")
    except Exception as exc:
        raise ValueError("Source image is invalid: " + str(exc)) from exc
    return image


def get_pipeline():
    global pipeline
    with pipeline_lock:
        if pipeline is not None:
            return pipeline
        import torch
        from diffusers import AutoencoderKLWan, WanVACEPipeline
        from diffusers.schedulers.scheduling_unipc_multistep import UniPCMultistepScheduler

        if not torch.cuda.is_available():
            raise RuntimeError("Wan VACE requires a CUDA GPU. Select a GPU runtime in Colab.")
        # T4 supports FP16; the VAE is kept in FP32 for numerical stability.
        vae = AutoencoderKLWan.from_pretrained(MODEL_ID, subfolder="vae", torch_dtype=torch.float32)
        pipe = WanVACEPipeline.from_pretrained(MODEL_ID, vae=vae, torch_dtype=torch.float16)
        pipe.scheduler = UniPCMultistepScheduler.from_config(pipe.scheduler.config, flow_shift=3.0)
        pipe.enable_model_cpu_offload()
        try:
            pipe.enable_vae_slicing()
        except Exception:
            pass
        pipeline = pipe
        return pipeline


def make_conditioning_frames(image: Image.Image, width: int, height: int, num_frames: int):
    fitted = ImageOps.contain(image, (width, height), method=Image.Resampling.LANCZOS)
    first = Image.new("RGB", (width, height), (0, 0, 255))
    first.paste(fitted, ((width - fitted.width) // 2, (height - fitted.height) // 2))
    generated_placeholder = Image.new("RGB", (width, height), (128, 128, 128))
    video = [first] + [generated_placeholder.copy() for _ in range(num_frames - 1)]
    preserve = Image.new("L", (width, height), 0)
    generate = Image.new("L", (width, height), 255)
    mask = [preserve] + [generate.copy() for _ in range(num_frames - 1)]
    return first, video, mask


def vace_frame_count(requested_frames: int) -> int:
    """Wan VACE temporal frame count is 4N+1; round upward, never undershoot."""
    return max(5, 4 * math.ceil((requested_frames - 1) / 4) + 1)


def generate_motion(folder: Path, image: Image.Image, motion: Motion):
    import torch
    from diffusers.utils import export_to_video

    pipe = get_pipeline()
    # Wan VACE temporal length follows 4N+1. The final sprite extractor resamples
    # the rendered clip to the exact frame count selected in Studio.
    model_frames = vace_frame_count(motion.frames)
    reference, video, mask = make_conditioning_frames(image, motion.width, motion.height, model_frames)
    generator_device = "cuda" if torch.cuda.is_available() else "cpu"
    generator = torch.Generator(device=generator_device)
    if motion.seed is not None:
        generator.manual_seed(motion.seed)
    else:
        generator.seed()
    result = pipe(
        video=video,
        mask=mask,
        reference_images=[reference],
        prompt=motion.prompt,
        negative_prompt=motion.negativePrompt,
        height=motion.height,
        width=motion.width,
        num_frames=model_frames,
        num_inference_steps=motion.steps,
        guidance_scale=motion.guidanceScale,
        generator=generator,
    )
    frames = result.frames[0]
    output_dir = folder / "videos"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / (motion.id + ".mp4")
    output_fps = model_frames / motion.durationSeconds
    export_to_video(frames, str(output_path), fps=output_fps)
    return output_path, model_frames


def run_job(job_id: str):
    folder = job_folder(job_id)
    job = read_job(job_id)
    try:
        source = Image.open(folder / "source-image").convert("RGB")
        job["status"] = "running"
        write_job(folder, job)
        for motion_data in job["motions"]:
            motion = Motion(**motion_data)
            item = job["motionResults"][motion.id]
            item["status"] = "running"
            job["currentMotion"] = motion.id
            write_job(folder, job)
            try:
                output, model_frames = generate_motion(folder, source, motion)
                item.update({
                    "status": "completed",
                    "filename": output.name,
                    "modelFrames": model_frames,
                    "downloadPath": "/v1/jobs/" + job_id + "/videos/" + motion.id
                })
            except Exception as exc:
                item.update({"status": "failed", "error": str(exc)[:1200]})
            write_job(folder, job)
        results = list(job["motionResults"].values())
        job["status"] = "completed" if all(item["status"] == "completed" for item in results) else "failed"
        job["currentMotion"] = None
        write_job(folder, job)
    except Exception as exc:
        job["status"] = "failed"
        job["error"] = str(exc)[:2000]
        write_job(folder, job)
    finally:
        try:
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        except Exception:
            pass


@app.get("/v1/capabilities")
def capabilities(authorization: str | None = Header(default=None)):
    require_auth(authorization)
    return {
        "status": "ready" if TOKEN else "not_configured",
        "provider": "wan2.1-vace-1.3b",
        "model": MODEL_ID,
        "motions": sorted(ALLOWED_MOTIONS),
        "maxWidth": 832,
        "maxHeight": 480,
        "maxFrames": 96,
        "queueConcurrency": 1,
        "background": "#0000FF"
    }


@app.post("/v1/generate")
async def create_generation(request: Request, authorization: str | None = Header(default=None)):
    require_auth(authorization)
    length = int(request.headers.get("content-length") or 0)
    if length > MAX_BODY_BYTES:
        raise HTTPException(status_code=413, detail="Request body exceeds 16 MB.")
    try:
        payload = GenerateRequest(**(await request.json()))
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid generation request: " + str(exc)) from exc
    if payload.protocolVersion != 1 or not payload.motions or len(payload.motions) > 7:
        raise HTTPException(status_code=400, detail="Unsupported protocol or empty motion list.")
    if len({motion.id for motion in payload.motions}) != len(payload.motions):
        raise HTTPException(status_code=400, detail="Motion IDs must be unique.")
    try:
        image = decode_source(payload.sourceImage)
        for motion in payload.motions:
            validate_motion(motion)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    provider_job_id = str(uuid.uuid4())
    folder = job_folder(provider_job_id)
    folder.mkdir(parents=True, exist_ok=True)
    image.save(folder / "source-image", format="PNG")
    motions = [motion.model_dump() for motion in payload.motions]
    job = {
        "providerJobId": provider_job_id,
        "studioJobId": payload.jobId,
        "status": "queued",
        "motions": motions,
        "motionResults": {motion.id: {"status": "queued"} for motion in payload.motions},
        "createdAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "currentMotion": None
    }
    write_job(folder, job)
    executor.submit(run_job, provider_job_id)
    return {"providerJobId": provider_job_id, "status": "queued"}


@app.get("/v1/jobs/{job_id}")
def get_generation(job_id: str, authorization: str | None = Header(default=None)):
    require_auth(authorization)
    job = read_job(job_id)
    videos = [
        {"motionId": motion_id, "downloadPath": result["downloadPath"]}
        for motion_id, result in job["motionResults"].items()
        if result.get("status") == "completed" and result.get("downloadPath")
    ]
    return {"status": job["status"], "currentMotion": job.get("currentMotion"), "videos": videos,
            "errors": {key: value.get("error") for key, value in job["motionResults"].items() if value.get("error")}}


@app.get("/v1/jobs/{job_id}/videos/{motion_id}")
def download_video(job_id: str, motion_id: str, authorization: str | None = Header(default=None)):
    require_auth(authorization)
    if motion_id not in ALLOWED_MOTIONS:
        raise HTTPException(status_code=400, detail="Invalid motion ID.")
    folder = job_folder(job_id)
    job = read_job(job_id)
    result = job["motionResults"].get(motion_id)
    if not result or result.get("status") != "completed":
        raise HTTPException(status_code=404, detail="Generated video is not ready.")
    file_path = (folder / "videos" / (motion_id + ".mp4")).resolve()
    if not file_path.is_relative_to((folder / "videos").resolve()) or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Video file not found.")
    return FileResponse(file_path, media_type="video/mp4", filename=motion_id + ".mp4")


@app.get("/health")
def health():
    return {"status": "ok", "provider": "wan2.1-vace-1.3b"}
    
if __name__ == "__main__":
    import uvicorn
    JOBS.mkdir(parents=True, exist_ok=True)
    uvicorn.run(app, host=os.environ.get("FVM_WAN_WORKER_HOST", "0.0.0.0"), port=int(os.environ.get("FVM_WAN_WORKER_PORT", "8787")))
