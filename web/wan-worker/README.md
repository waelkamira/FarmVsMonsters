# FarmVsMonsters Wan 2.1 VACE Worker

This worker turns the one uploaded character image into one independent MP4 per motion selected in Studio. It uses the official Diffusers `WanVACEPipeline` with the 1.3B checkpoint and a first-frame conditioning mask:

- First video frame: the uploaded character on a flat pure-blue canvas.
- First mask frame: black (preserve/condition).
- Remaining video frames: neutral gray placeholders.
- Remaining mask frames: white (generate).
- A reference image is also passed to VACE to reinforce character identity.
- Requested frame counts are rounded up internally to Wan's 4N+1 temporal layout. Studio's frame extractor later resamples the clip to the exact requested sprite frame count.

The Studio user chooses the motions. The worker validates and processes only the motions included in the request, sequentially, to avoid competing GPU jobs.

## Google Colab T4 setup

1. Open a new Google Colab notebook.
2. Select **Runtime → Change runtime type → T4 GPU** (or another supported CUDA GPU).
3. Run the following setup cell:

```python
!git clone --depth 1 --branch feat/studio-ai-animation-pipeline https://github.com/waelkamira/FarmVsMonsters.git /content/FarmVsMonsters
%cd /content/FarmVsMonsters/web/wan-worker
!pip install -r requirements-colab.txt
```

4. Set a private shared token and start the worker/tunnel:

```python
from getpass import getpass
import os
os.environ["FVM_WAN_WORKER_TOKEN"] = getpass("Create/paste a long random worker token: ")
!python colab_start.py
```

5. The cell prints a temporary `https://….trycloudflare.com` URL. Keep the Colab cell and GPU runtime running while generating. The first run downloads the model weights and can take a while.

The quick tunnel URL changes when the Colab session restarts. Never publish the token or paste it into browser-side code.

## Configure the local Studio app

In `web/.env.local`, set the same worker token and the tunnel URL printed by Colab:

```dotenv
FVM_WAN_WORKER_URL=https://YOUR-QUICK-TUNNEL.trycloudflare.com
FVM_WAN_WORKER_TOKEN=YOUR_LONG_RANDOM_TOKEN
FVM_PYTHON_BIN=python
STUDIO_GITHUB_TOKEN=YOUR_GITHUB_TOKEN
STUDIO_GITHUB_BRANCH=studio/assets
```

Restart the local Next.js Studio server after editing `.env.local`.

Install FFmpeg and FFprobe on the machine running the Studio app and ensure both are available on PATH. Install Pillow in the app's Python environment:

```powershell
python -m pip install -r game/studio/autoRig/videoPipeline/requirements.txt
ffmpeg -version
ffprobe -version
```

The Studio downloads each completed MP4 from Colab into its own local job workspace when you press **مزامنة نتائج التوليد**. Synchronize completed motions before the Colab runtime expires.

## Model and hardware notes

- Model: `Wan-AI/Wan2.1-VACE-1.3B-diffusers`.
- The worker uses FP16 for the CUDA transformer and FP32 for the VAE, with Diffusers model CPU offload enabled.
- Default output: 832×480, 24 requested sprite frames, 12 FPS, 2 seconds, 20 inference steps.
- Wan VACE expects a 4N+1 temporal frame count; the worker pads the model request to the next supported length, then the local extractor samples the exact count selected by the user.
- T4 availability and memory vary by Colab session. If a run runs out of memory, reduce inference steps, use fewer selected motions per job, or lower the video resolution to a multiple of 16.
- AI video can still alter character details or imperfectly preserve the blue background. The user must review every video before frame extraction and every Sprite Sheet before GitHub publishing.

## Worker security and lifecycle

- The HTTP API requires `Authorization: Bearer <FVM_WAN_WORKER_TOKEN>`.
- The quick tunnel exposes the worker publicly; the bearer token is mandatory.
- Generated files stay in the Colab worker workspace until the Studio downloads them.
- The worker uses one GPU generation slot and processes selected motions sequentially.
- Disconnecting Colab stops generation and removes its temporary storage when the runtime is recycled. Keep the runtime alive until the Studio has synchronized the finished videos.
- Do not use this worker's output as a published game asset until the Studio has reviewed and approved the Sprite Sheets.

## Contract tests

```bash
python -m pip install -r requirements-test.txt
python -m unittest -v test_worker.py
python -m py_compile worker.py colab_start.py
```
