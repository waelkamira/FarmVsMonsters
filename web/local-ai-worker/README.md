# Local Studio AI Worker (SAM 2)

The optional inference process runs on loopback only. It makes no hosted inference calls and never downloads model weights.

## Requirements
- Python 3.10+
- PyTorch installed for the local CPU/CUDA environment
- Official Meta SAM 2 package installed
- A SAM 2 config YAML and checkpoint already present locally

Install image dependencies:
\`\`\`powershell
python -m pip install -r requirements.txt
\`\`\`

Set local paths and start:
\`\`\`powershell
$env:SAM2_CONFIG="configs/sam2.1/sam2.1_hiera_t.yaml"
$env:SAM2_CHECKPOINT="C:\models\sam2.1_hiera_tiny.pt"
$env:FVM_AI_WORKER_PORT="8765"
python worker.py
\`\`\`

Set in the Studio web app environment:
\`\`\`env
STUDIO_LOCAL_AI_WORKER_URL=http://127.0.0.1:8765
\`\`\`

Restart the web app, open Auto-Rig Builder and select "فحص محرك AI المحلي". The worker advertises part-detection only after the SAM 2 model loads. It emits automatic masks as editable polygons. This adapter does not perform semantic body/limb/weapon classification, text-prompted segmentation, or hidden-pixel reconstruction.

## Limits
- Binds to 127.0.0.1 only.
- No telemetry, cloud API, credentials, or automatic weight downloads.
- Maximum image size 8 MB; maximum dimensions 4096 x 4096.
- SAM 2 masks can overlap or split one character into many regions; review each mask.
- Hidden-part reconstruction is not implemented by this adapter.


## Interactive point-prompt segmentation
The same local SAM 2 checkpoint also enables prompted segmentation. In Auto-Rig Builder, choose **تحديد نقاط AI**, select positive points (inside the target part) or negative points (outside the target), click the source image, then choose **تقسيم SAM 2 حسب النقاط**. SAM 2 returns up to three mask alternatives; inspect the overlays and accept only the correct region. Each accepted mask still requires a semantic role, geometry review, and explicit author approval.
