# AI Animation & Asset Studio

The AI Animation Studio is a workflow inside the existing private Studio at `/studio/ai-animation`. It reuses the existing signed Studio session and keeps experiments separate from approved runtime assets.

## Workflow implemented

1. Upload one PNG/JPEG character reference (up to 8 MB).
2. Select the exact motions to produce. The server persists only those selected motion definitions.
3. Configure each selected motion's prompt, negative prompt, duration, frame count, FPS and video dimensions.
4. Submit selected motions to the configured Wan worker, or upload the resulting MP4/WebM manually.
5. Review each motion video independently. The user must approve a video before extraction is allowed.
6. Extract frames using the existing FFmpeg/Pillow video pipeline, keying the required pure blue background (#0000FF).
7. Review the generated Phaser atlas PNG, JSON and structural validation report.
8. Approve or reject the sprite output independently.

## Local workspace

Job inputs and intermediate outputs are stored under:

```text
web/.autorig-workspace/ai-animation/jobs/<uuid>/
  job.json
  source.png
  videos/
  export/<motion-id>/
```

This is build workspace data, not an approved runtime asset location. Keep it ignored by Git and back it up if you need to preserve local experiments.

## Video worker connection

The existing local AI worker at `web/local-ai-worker/worker.py` is a SAM 2 segmentation worker. The separate Wan 2.1 VACE 1.3B GPU worker is implemented in `web/wan-worker/worker.py`; Colab T4 setup and a temporary authenticated Cloudflare tunnel are documented in `web/wan-worker/README.md`. The HTTP contract is documented in `web/local-ai-worker/README-WAN-WORKER.md`.

Configure server-side only:

- `FVM_WAN_WORKER_URL`
- `FVM_WAN_WORKER_TOKEN`
- `FVM_PYTHON_BIN` (optional; defaults to `python` on Windows and `python3` elsewhere)\n- `STUDIO_GITHUB_TOKEN` and `STUDIO_GITHUB_BRANCH` (needed only when publishing approved PNG/JSON packages to GitHub; default branch is `studio/assets`).

The video worker must implement `POST /v1/generate` and `GET /v1/jobs/{providerJobId}`, and serve completed MP4/WebM files from same-origin `downloadPath` values. Do not point this setting at the SAM 2 worker.

## Video extraction dependencies

Install FFmpeg/FFprobe and Pillow in the machine running the Studio app:

```bash
python -m pip install -r game/studio/autoRig/videoPipeline/requirements.txt
```

The extractor reads actual source dimensions and duration, samples the requested number of frames, applies a blue chroma key, normalizes the character into a 150×150 transparent frame by default, and writes:

- individual transparent PNG frames;
- a packed Sprite Sheet PNG;
- Phaser Atlas JSON;
- `validation.json` with source and structural checks.

Structural validation is not artistic approval. Inspect identity consistency and motion quality manually.

## Important current boundary

This first integrated workflow persists jobs, enforces per-motion video approval, processes uploaded/generated video, and provides sprite review. It does not yet publish the seven separate motion atlases as a single runtime character definition. The existing runtime asset profile currently models the primary `idle`, `move`, and `attack` clips; extending the battle runtime to consume all seven independent clips and adding an atomic multi-file asset publish operation is a separate integration step. Do not copy experimental outputs into approved game assets until that runtime contract is implemented and tested.
