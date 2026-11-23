# Wan video worker contract for FarmVsMonsters Studio

This document defines the authenticated HTTP adapter expected by the AI Animation Studio. It deliberately does not pretend that the existing SAM 2 worker generates video: that worker only provides segmentation/mask proposals.

## Studio configuration

Set these server-side environment variables in the Next.js app:

- `FVM_WAN_WORKER_URL`: base URL of the Wan worker (HTTPS recommended; local loopback is suitable for local development).
- `FVM_WAN_WORKER_TOKEN`: shared secret. Never expose it to browser code or commit it.

## Generate request

The Studio sends an authenticated JSON POST to `/v1/generate`:

```json
{
  "protocolVersion": 1,
  "jobId": "Studio job UUID",
  "sourceImage": {
    "mimeType": "image/png",
    "base64": "base64 image bytes",
    "background": "#0000FF"
  },
  "motions": [
    {
      "id": "idle",
      "prompt": "user-approved prompt",
      "negativePrompt": "user-approved negative prompt",
      "frames": 24,
      "fps": 12,
      "width": 832,
      "height": 480,
      "durationSeconds": 2,
      "seed": null
    }
  ]
}
```

Only user-selected motions are sent. The worker must not silently add unselected motions.

Successful response:

```json
{ "providerJobId": "worker-generated-id", "status": "queued" }
```

## Status and result retrieval

The Studio polls `GET /v1/jobs/{providerJobId}` using the same bearer token.

In-progress response:

```json
{ "status": "queued" }
```

Completed response:

```json
{
  "status": "completed",
  "videos": [
    { "motionId": "idle", "downloadPath": "/v1/jobs/worker-generated-id/videos/idle" }
  ]
}
```

Each `downloadPath` must be a relative path on the same worker origin and must return an MP4 or WebM response. The Studio validates the video signature and enforces a 100 MB maximum before saving it to the local job workspace.

Failure response:

```json
{ "status": "failed", "error": "clear actionable error" }
```

## Required behavior

- Validate bearer authentication and protocol version.
- Validate image and all motion parameters.
- Preserve the input character identity as much as the model permits.
- Keep the chroma background pure blue (#0000FF), with no blue spill on the character.
- Treat each selected motion as a separate output.
- Return real queue status; do not fabricate percentage progress.
- Retain generated files until Studio has downloaded them.
- Never execute arbitrary prompts as shell commands.
- Do not write generated output directly into the game's approved asset directory.

The existing `web/local-ai-worker/worker.py` is a SAM 2 segmentation worker on port 8765; it is not a Wan video-generation server and must not be configured as this provider.
