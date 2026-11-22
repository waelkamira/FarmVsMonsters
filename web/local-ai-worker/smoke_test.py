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
    proposals = result.get("proposals") if isinstance(result, dict) else None
    if not isinstance(proposals, list) or not proposals:
        raise RuntimeError(label + " returned no segmentation proposals.")
    if len(proposals) > 63:
        raise RuntimeError(label + " returned more than 63 segmentation proposals.")
    seen_ids = set()
    for index, proposal in enumerate(proposals):
        if not isinstance(proposal, dict):
            raise RuntimeError(label + " proposal " + str(index) + " is not an object.")
        proposal_id = proposal.get("id")
        if not isinstance(proposal_id, str) or not proposal_id or len(proposal_id) > 59:
            raise RuntimeError(label + " returned a proposal with an invalid ID.")
        if proposal_id in seen_ids:
            raise RuntimeError(label + " returned duplicate proposal ID: " + proposal_id)
        seen_ids.add(proposal_id)
        role = proposal.get("role")
        if not isinstance(role, str) or not role or len(role) > 80:
            raise RuntimeError(label + " returned a proposal with an invalid semantic role.")
        confidence = proposal.get("confidence")
        if confidence is not None and (isinstance(confidence, bool) or not isinstance(confidence, (int, float)) or not np.isfinite(confidence) or not 0 <= confidence <= 1):
            raise RuntimeError(label + " returned an invalid confidence score.")
        bounds = proposal.get("bounds")
        if not isinstance(bounds, dict):
            raise RuntimeError(label + " returned a proposal without source bounds.")
        x, y, width, height = (bounds.get(key) for key in ("x", "y", "width", "height"))
        if any(isinstance(value, bool) or not isinstance(value, int) for value in (x, y, width, height)):
            raise RuntimeError(label + " returned non-integer source bounds.")
        if width < 1 or height < 1 or not (0 <= x < WIDTH and 0 <= y < HEIGHT):
            raise RuntimeError(label + " returned bounds outside the source canvas.")
        if x + width > WIDTH or y + height > HEIGHT:
            raise RuntimeError(label + " returned bounds outside the source canvas.")
        mask = proposal.get("mask")
        points = mask.get("points") if isinstance(mask, dict) and mask.get("kind") == "polygon" else None
        if not isinstance(points, list) or not 3 <= len(points) <= 512:
            raise RuntimeError(label + " returned a proposal without an editable polygon.")
        area_twice = 0.0
        for point_index, point in enumerate(points):
            if not isinstance(point, dict):
                raise RuntimeError(label + " returned a malformed polygon point.")
            px, py = point.get("x"), point.get("y")
            if isinstance(px, bool) or isinstance(py, bool) or not isinstance(px, (int, float)) or not isinstance(py, (int, float)) or not np.isfinite(px) or not np.isfinite(py):
                raise RuntimeError(label + " returned non-finite polygon coordinates.")
            if not (0 <= px <= WIDTH and 0 <= py <= HEIGHT):
                raise RuntimeError(label + " returned polygon points outside the source canvas.")
            if not (x <= px <= x + width and y <= py <= y + height):
                raise RuntimeError(label + " returned polygon points outside proposal crop bounds.")
            next_point = points[(point_index + 1) % len(points)]
            if not isinstance(next_point, dict) or not isinstance(next_point.get("x"), (int, float)) or not isinstance(next_point.get("y"), (int, float)):
                raise RuntimeError(label + " returned a malformed polygon point.")
            area_twice += px * next_point["y"] - next_point["x"] * py
        if abs(area_twice) < 2:
            raise RuntimeError(label + " returned a degenerate polygon mask.")
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
