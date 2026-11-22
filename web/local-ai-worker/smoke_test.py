"""Local SAM 2 smoke test using a synthetic plant image; no game assets are uploaded."""
import base64
import json
import os
import sys
import urllib.error
import urllib.request

import cv2
import numpy as np

BASE_URL = os.environ.get("FVM_AI_WORKER_URL", "http://127.0.0.1:8765").rstrip("/")
WIDTH = 320
HEIGHT = 320


def request_json(path, payload=None, timeout=90):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        BASE_URL + path,
        data=data,
        headers={"Accept": "application/json", **({"Content-Type": "application/json"} if data is not None else {})},
        method="GET" if data is None else "POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def synthetic_plant_data_url():
    image = np.full((HEIGHT, WIDTH, 3), 248, dtype=np.uint8)
    green = (65, 150, 55)
    cv2.rectangle(image, (151, 115), (169, 292), green, -1)
    cv2.ellipse(image, (111, 155), (72, 25), -25, 0, 360, green, -1)
    cv2.ellipse(image, (210, 112), (68, 24), 25, 0, 360, green, -1)
    cv2.circle(image, (160, 72), 35, (40, 175, 225), -1)
    ok, encoded = cv2.imencode(".png", image)
    if not ok:
        raise RuntimeError("Could not encode the synthetic SAM 2 test image.")
    return "data:image/png;base64," + base64.b64encode(encoded.tobytes()).decode("ascii")


def validate_proposals(result, label):
    proposals = result.get("proposals")
    if not isinstance(proposals, list) or not proposals:
        raise RuntimeError(label + " returned no segmentation proposals.")
    for proposal in proposals:
        bounds = proposal.get("bounds") or {}
        if not isinstance(proposal.get("mask", {}).get("points"), list):
            raise RuntimeError(label + " returned a proposal without an editable polygon.")
        if not (0 <= bounds.get("x", -1) < WIDTH and 0 <= bounds.get("y", -1) < HEIGHT):
            raise RuntimeError(label + " returned out-of-canvas bounds.")
        if bounds.get("x", 0) + bounds.get("width", 0) > WIDTH or bounds.get("y", 0) + bounds.get("height", 0) > HEIGHT:
            raise RuntimeError(label + " returned bounds outside the source canvas.")
    return len(proposals)


def main():
    try:
        capabilities = request_json("/v1/capabilities")
        if capabilities.get("status") != "ready":
            raise RuntimeError("Worker is degraded: " + "; ".join(capabilities.get("warnings", [])))
        required = {"part-detection", "prompted-segmentation"}
        missing = required.difference(capabilities.get("capabilities", []))
        if missing:
            raise RuntimeError("Worker is missing capabilities: " + ", ".join(sorted(missing)))

        image_data_url = synthetic_plant_data_url()
        common = {"protocolVersion": 1, "canvas": {"width": WIDTH, "height": HEIGHT}, "imageDataUrl": image_data_url}
        automatic = request_json("/v1/auto-rig/part-detection", common)
        automatic_count = validate_proposals(automatic, "Automatic part detection")

        prompted = request_json("/v1/auto-rig/prompted-segmentation", {
            **common,
            "points": [
                {"x": 110, "y": 155, "label": 1},
                {"x": 20, "y": 20, "label": 0},
            ],
        })
        prompted_count = validate_proposals(prompted, "Prompted segmentation")
        print("SAM 2 local smoke test passed")
        print("Device: " + str(capabilities.get("device", "unknown")))
        print("Automatic proposals: " + str(automatic_count))
        print("Prompted alternatives: " + str(prompted_count))
        print("Synthetic test only; validate real plant and monster artwork separately.")
        return 0
    except (urllib.error.URLError, TimeoutError, RuntimeError, ValueError, KeyError) as error:
        print("SAM 2 local smoke test failed: " + str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
