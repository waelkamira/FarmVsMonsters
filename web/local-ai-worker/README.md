# Local Studio AI Worker (SAM 2)

This optional inference process runs on the developer's machine and binds only to `127.0.0.1`. It makes no hosted inference calls and never downloads model checkpoints automatically. The Studio web app talks to it through the authenticated Next.js worker bridge.

## What it does today

- Automatic SAM 2 mask proposals for visible image regions.
- Positive/negative point-prompted segmentation with up to three alternative masks.
- Author-guided visible-donor pixel transfer: copy a manually selected visible source polygon into a manually marked hidden target polygon, optionally mirrored, producing a transparent PNG patch with explicit reconstruction provenance.\n- Local texture inpainting: apply OpenCV Telea inpainting only inside a manually marked target polygon and return a transparent patch. This fills local texture gaps from neighboring pixels; it does not infer anatomy or semantic structure.
- Source-coordinate polygon masks, confidence values, and source-pixel provenance.
- Transparent PNG input is composited onto white for inference and every predicted mask is clipped to non-transparent source pixels; the original source bytes are never changed.

**Important:** SAM 2 returns geometric regions, not semantic labels. It does not know whether a mask is a leaf, arm, head, weapon, or body. Assign each proposal a role in Studio and review its shape. Generative hidden-part completion is not implemented. Donor transfer is a deterministic symmetry/texture-copy aid, while Telea is classical local inpainting; neither invents missing anatomy or semantic structure. Either can be unsuitable for large or structurally complex missing regions. Every patch requires human inspection and approval.

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

5. Download the official **SAM 2.1 Hiera Tiny** checkpoint from the [SAM 2 model/checkpoint section](https://github.com/facebookresearch/sam2#download-checkpoints) and place it at:

   ```text
   ~/models/sam2.1_hiera_tiny.pt
   ```

   Model weights are deliberately not committed to this repository.

6. Start the worker:

   ```bash
   bash start-worker-wsl.sh
   ```

7. With the worker running, execute the local synthetic-image inference check:

   ```bash
   python smoke_test.py
   ```

   This verifies both automatic and point-prompted SAM 2 inference against a generated test plant image. It does not replace validation with the actual FarmVsMonsters plant and monster artwork.

8. In the Windows environment running the Studio Next.js app, set:

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
| Visible donor transfer into a manually marked hidden polygon | Implemented as an author-guided pixel-copy aid; requires review |\n| OpenCV Telea local texture inpainting | Implemented for small surrounding-texture gaps; requires review |
| Editable polygon proposals in Studio | Implemented |
| Semantic part-role classification | Not implemented; author assigns roles |
| Hidden-part detection and pixel reconstruction | Not implemented |
| Rig generation, pivots, starter clips, muzzle authoring | Implemented in Studio deterministic core |
| Publish-time quality gate | Implemented; requires all author review checks |
