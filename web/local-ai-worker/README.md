# Local Studio AI Worker (SAM 2)

This optional inference process runs on the developer's machine and binds only to `127.0.0.1`. It makes no hosted inference calls and never downloads model checkpoints automatically.

## What it does today

- Automatic SAM 2 mask proposals for visible image regions.
- Positive/negative point-prompted segmentation with up to three alternative masks.
- Local CLIP zero-shot visual role suggestions for SAM 2 crops (plant and monster taxonomies). Suggestions include top-class score and top-two margin; uncertain crops remain `unknown`, and no suggestion approves a rig part.
- Optional local diffusion inpainting for author-marked hidden anatomical regions. It returns only a transparent target patch and records model, prompt, seed and review-required provenance.
- Author-guided visible-donor pixel transfer: copy a manually selected visible source polygon into a manually marked hidden target polygon, optionally mirrored, producing a transparent PNG patch with explicit reconstruction provenance.
- Local texture inpainting: apply OpenCV Telea inpainting only inside a manually marked target polygon and return a transparent patch. This fills local texture gaps from neighboring pixels; it does not infer anatomy or semantic structure.
- Source-coordinate polygon masks, confidence values, and source-pixel provenance.
- Transparent PNG input is composited onto white for inference and every predicted mask is clipped to non-transparent source pixels; the original source bytes are never changed.

**Important:** SAM 2 returns geometric regions, not semantic labels. The new CLIP classifier compares masked image crops with a fixed plant/monster role vocabulary using a local model. It is a genuine image-text visual model, but it is zero-shot rather than fine-tuned on FarmVsMonsters artwork; softmax values are not calibrated probabilities. Low-margin results remain unknown. Human review remains mandatory. The diffusion option is a general-purpose local inpainting model, not a FarmVsMonsters-fine-tuned anatomy model; it can hallucinate incorrect anatomy and every output must be inspected. Donor transfer and Telea remain deterministic pixel-copy and classical texture-fill aids only.

## Windows setup (recommended: WSL 2 + Ubuntu)

Meta's official SAM 2 installation guidance recommends WSL with Ubuntu when installing on Windows. SAM 2 requires Python 3.10+, PyTorch 2.5.1+, and a matching torchvision build. See the [official SAM 2 installation guide](https://github.com/facebookresearch/sam2/blob/main/INSTALL.md) and [PyTorch installation selector](https://pytorch.org/get-started/locally/).

1. Install WSL 2 with an Ubuntu distribution and open the Ubuntu terminal.
2. Ensure Python 3.10+, `python3-venv`, and Git are installed.
3. Navigate in WSL to this repository's `web/local-ai-worker` directory.
4. Run the setup script:

   ```bash
   bash setup-wsl.sh
   ```

   The default script installs CPU-only PyTorch, clones the official SAM 2 source into your WSL user cache, installs SAM 2 with its optional CUDA extension disabled, and installs this worker's image dependencies. This is the safest baseline for machines without a confirmed NVIDIA/CUDA setup. If you have a compatible NVIDIA GPU, follow the PyTorch selector first and set `FVM_TORCH_INDEX_URL` to the matching wheel index before running setup; do not mix CPU and CUDA builds.

5. The setup script now downloads the official **SAM 2.1 Hiera Tiny** checkpoint automatically and verifies its SHA-256 before use. It also downloads only the required PyTorch/safetensors files for **OpenAI CLIP ViT-B/32** (about 605 MB), rather than all framework variants. Both model directories remain outside Git.

   Defaults:
   - SAM 2 checkpoint: `~/models/sam2.1_hiera_tiny.pt`
   - CLIP model: `~/models/clip-vit-base-patch32`

   You do not need to download either model manually. The first setup requires an internet connection; inference itself runs locally.

7. Optional: download a compatible Stable Diffusion inpainting checkpoint into a local directory (the worker never downloads weights). For example:

   ```bash
   hf download runwayml/stable-diffusion-inpainting --local-dir "$HOME/models/stable-diffusion-inpainting"
   export FVM_INPAINT_MODEL_DIR="$HOME/models/stable-diffusion-inpainting"
   ```

   This checkpoint is governed by its own model card and CreativeML OpenRAIL terms. Review those terms before use or redistribution. The model is loaded with `local_files_only=True`; missing files produce an explicit unavailable capability. CPU inference is supported but may be slow. The output is a proposal, not a guaranteed anatomically correct reconstruction.

8. Start the worker:

   ```bash
   bash start-worker-wsl.sh
   ```

9. With the worker running, execute the local synthetic-image inference check:

   ```bash
   python smoke_test.py
   ```

   This verifies both automatic and point-prompted SAM 2 inference against a generated test plant image. It does not replace validation with the actual FarmVsMonsters plant and monster artwork.

10. Run the real-asset smoke test from the same directory after both SAM 2 and CLIP checkpoints are configured:

   ```bash
   python real_asset_smoke_test.py
   ```

   By default this tests the first 3×3 Hazelnut Level 1 frame and the Hyena idle asset from the checked-out repository. It runs SAM 2 segmentation followed by local CLIP role suggestions on both assets and prints the masks/suggestion counts plus per-region roles. A successful command proves model execution on real repository pixels, but the output still requires visual inspection in Studio; it does not prove pivots, clips, save/version behavior or Phaser gameplay.


11. In the Windows environment running the Studio Next.js app, set:

   ```env
   STUDIO_LOCAL_AI_WORKER_URL=http://127.0.0.1:8765
   ```

   Restart the web app, open Auto-Rig Builder, and select **فحص محرك AI المحلي**. WSL 2 localhost forwarding should make the worker reachable from Windows on port 8765. If your WSL networking configuration disables localhost forwarding, enable it in WSL settings before retrying.

## Native Windows alternative

A native Windows Python environment may work if PyTorch, torchvision, the official SAM 2 package, and OpenCV are all compatible with that machine. The official project recommends WSL/Ubuntu on Windows, so the PowerShell launcher is provided only as a best-effort alternative:

```powershell
python -m pip install -r requirements.txt
$env:SAM2_CONFIG="C:\models\sam2\configs\sam2.1\sam2.1_hiera_t.yaml"
$env:SAM2_CHECKPOINT="C:\models\sam2.1_hiera_tiny.pt"
$env:FVM_AI_WORKER_PORT="8765"
.\start-worker.ps1
```

## Security and resource limits

- Binds to `127.0.0.1` only; it is not a LAN service.
- Accepts POST requests only with the exact loopback Host header, JSON content type, and no browser Origin header. This blocks cross-site browser form submissions from triggering local inference.
- Admits one inference request at a time; concurrent requests receive HTTP 429 instead of building an unbounded queue.
- No telemetry, cloud API, credentials, or automatic weight downloads.
- Maximum image size 8 MB; maximum dimensions 4096 × 4096.
- Transparent PNG pixels are composited onto white for model input to avoid treating transparent pixels as black artwork.
- SAM 2 masks may overlap or split one character into many regions; inspect and edit every accepted mask.
- If the model/checkpoint is missing, health reports degraded and inference returns a clear error; no fake proposals are generated.

## Model capability boundary

| Capability | Status |
|---|---|
| Automatic visible-region mask proposals | Implemented |
| Positive/negative point-prompted masks | Implemented |
| Visible donor transfer into a manually marked hidden polygon | Implemented as an author-guided pixel-copy aid; requires review |
| OpenCV Telea local texture inpainting | Implemented for small surrounding-texture gaps; requires review |
| Editable polygon proposals in Studio | Implemented |
| Local CLIP zero-shot visual role suggestions | Implemented; must be run with local model files and reviewed; not FarmVsMonsters-fine-tuned |
| Local diffusion anatomical-region proposal | Implemented as general-purpose inpainting; not anatomy-fine-tuned; requires local checkpoint and human review |
| Rig generation, pivots, starter clips, muzzle authoring | Implemented in Studio deterministic core |
| Publish-time quality gate | Implemented; requires all author review checks |
