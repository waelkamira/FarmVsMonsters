# AI video to Phaser Sprite Sheet

First non-Blender path for AI-generated character animation.

## Goal
Generate a clean character image, animate it with an image-to-video service, then convert the video into transparent PNG frames, a packed Sprite Sheet, Phaser Atlas JSON, and a structural validation report. The model generates motion. This tool samples frames, optionally keys a chosen background, normalizes framing, and packages the result. It does not repair bad motion or identity drift.

## Requirements
- Python 3.10+
- FFmpeg and FFprobe on PATH
- Install Pillow: `python -m pip install -r web/game/studio/autoRig/videoPipeline/requirements.txt`

## Prepare the Hazelnut reference automatically

The current BattleScene loads Hazelnut as a 1024 × 1024 sheet with 341 × 341 cells and uses frame 0 as its displayed plant pose. Extract that exact first frame before uploading it to the video model:

```powershell
python web/game/studio/autoRig/videoPipeline/extract_reference_frame.py `
  --input "web\public\assets\plants\hazelnut-level-1.png" `
  --output "web\.autorig-workspace\ai-video\hazelnut-reference.png" `
  --frame-width 341 --frame-height 341 --columns 3 --index 0
```

This uses the existing Phaser frame contract; it does not alter the original sprite sheet.

## First Hazelnut experiment
1. Use the existing approved Hazelnut Level 1 artwork as the image reference. Do not overwrite it.
2. Generate a short clip (3–5 seconds if that is the provider's minimum): one character, locked camera, fixed framing, full character visible, no cuts or scene changes. We will extract a 2-second segment for 24 frames at 12 FPS.
3. If the provider cannot output alpha, request a flat pure green background (#00FF00). Avoid green details on the character.
4. Download the generated video locally; do not commit it.
5. From the repository root, run:

```powershell
python web/game/studio/autoRig/videoPipeline/video_to_spritesheet.py `
  --input "C:\path\to\hazelnut-idle.mp4" `
  --output-dir "web\.autorig-workspace\ai-video\hazelnut-idle" `
  --name "hazelnut-idle" `
  --start-seconds 0 --clip-duration 2 `
  --frames 24 --fps 12 --width 150 --height 150 `
  --columns 6 --background green
```

The provider may return a longer clip; use `--start-seconds` and `--clip-duration` to select a 2-second segment. 24 frames at 12 FPS represent 2 seconds. Keep the selected clip duration and playback FPS aligned so the motion is not sped up or slowed down. Use `--background alpha` for a video with a real alpha channel. Use `--background none` only when intentionally retaining the background.

## Outputs
- `hazelnut-idle.png`: 6 × 4 sheet, 150 × 150 per frame by default.
- `hazelnut-idle.json`: Phaser atlas JSON with frame names `hazelnut-idle_00` through `hazelnut-idle_23`.
- `frames/`: individual normalized PNGs.
- `validation.json`: source metadata, crop/scale, frame counts and structural warnings.

A non-zero exit code means the result needs review or extraction failed. `passed_structural_checks` is not artistic approval; inspect frames and test playback in BattleScene.

## Limitations
- Chroma key works best with a clean green background. Green character details can be damaged.
- AI video may morph the character, change proportions, move the camera, or invent details. Shared framing cannot fix model errors.
- 24 frames at 150 × 150 in a 6 × 4 grid produce a 900 × 600 PNG before compression.
- This tool does not call Kling, Hailuo, Runway, or any paid API. Provider generation remains separate until an API/provider is selected and validated.
- Keep outputs under `web/.autorig-workspace/`; never replace approved assets during experiments.
