"""Loopback-only SAM 2 worker. Model weights must be installed locally."""
import base64, json, math, os, re, socket, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

HOST = "127.0.0.1"
PORT = int(os.environ.get("FVM_AI_WORKER_PORT", "8765"))
MAX_BODY = 12 * 1024 * 1024
MAX_IMAGE = 8 * 1024 * 1024
_MODEL = None
_MODEL_ERROR = None
_MODEL_LOCK = threading.Lock()
_INFERENCE_LOCK = threading.Lock()
_REQUEST_SLOT = threading.BoundedSemaphore(1)

def read_limited_body(stream, declared_length):
    if isinstance(declared_length, bool) or not isinstance(declared_length, str) or not re.fullmatch(r"[0-9]+", declared_length):
        raise ValueError("A valid Content-Length header is required.")
    length = int(declared_length)
    if length < 1 or length > MAX_BODY:
        raise ValueError("Request body exceeds limit.")
    raw = stream.read(length)
    if len(raw) != length:
        raise ValueError("Request body ended before Content-Length bytes were received.")
    return raw

def validate_task_payload(payload):
    if not isinstance(payload, dict):
        raise ValueError("Request JSON must be an object.")
    if payload.get("protocolVersion") != 1:
        raise ValueError("Unsupported protocol.")
    canvas = payload.get("canvas")
    if not isinstance(canvas, dict):
        raise ValueError("Canvas dimensions are required.")
    width, height = canvas.get("width"), canvas.get("height")
    if isinstance(width, bool) or isinstance(height, bool) or not isinstance(width, int) or not isinstance(height, int):
        raise ValueError("Canvas dimensions must be integers.")
    if not 1 <= width <= 4096 or not 1 <= height <= 4096:
        raise ValueError("Canvas dimensions must be between 1 and 4096.")
    image_data = payload.get("imageDataUrl")
    if not isinstance(image_data, str) or len(image_data) > 11 * 1024 * 1024:
        raise ValueError("Image data URL is missing or exceeds the encoded size limit.")
    return payload

def trusted_local_request(headers):
    host = str(headers.get("Host", "")).strip().lower()
    content_type = str(headers.get("Content-Type", "")).split(";", 1)[0].strip().lower()
    origin = headers.get("Origin")
    return host == (HOST + ":" + str(PORT)).lower() and content_type == "application/json" and not origin

def load_model():
    global _MODEL, _MODEL_ERROR
    with _MODEL_LOCK:
        if _MODEL is not None: return _MODEL
        if _MODEL_ERROR: raise RuntimeError(_MODEL_ERROR)
        config, checkpoint = os.environ.get("SAM2_CONFIG"), os.environ.get("SAM2_CHECKPOINT")
        if not config or not checkpoint or not Path(config).is_file() or not Path(checkpoint).is_file():
            _MODEL_ERROR = "Set SAM2_CONFIG and SAM2_CHECKPOINT to existing local SAM 2 files; weights are never downloaded."
            raise RuntimeError(_MODEL_ERROR)
        try:
            from sam2.automatic_mask_generator import SAM2AutomaticMaskGenerator
            from sam2.build_sam import build_sam2
            from sam2.sam2_image_predictor import SAM2ImagePredictor
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
            model = build_sam2(config, checkpoint, device=device)
            _MODEL = (SAM2AutomaticMaskGenerator(model, points_per_side=24, pred_iou_thresh=0.78,
                        stability_score_thresh=0.86, min_mask_region_area=64), SAM2ImagePredictor(model), device)
            return _MODEL
        except Exception as exc:
            _MODEL_ERROR = "Could not initialize SAM 2: " + str(exc)[:250]
            raise RuntimeError(_MODEL_ERROR) from exc
def capabilities():
    try:
        _, _, device = load_model()
        return {"protocolVersion":1,"status":"ready","device":device,"capabilities":["part-detection","prompted-segmentation"],
                "models":[{"id":"sam2-automatic-mask-generator","version":"local-checkpoint","license":"Apache-2.0"}],"warnings":[]}
    except Exception as exc:
        return {"protocolVersion":1,"status":"degraded","device":"unknown","capabilities":[],"models":[],"warnings":[str(exc)]}

def decode_image_data(data_url, width, height):
    match = re.fullmatch(r"data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/]+=*)", data_url or "")
    if not match: raise ValueError("Expected PNG, JPEG, or WebP base64 data URL.")
    raw = base64.b64decode(match.group(2), validate=True)
    if len(raw) > MAX_IMAGE: raise ValueError("Image exceeds 8 MB.")
    import cv2, numpy as np
    decoded = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_UNCHANGED)
    if decoded is None: raise ValueError("Image decoding failed.")
    h, w = decoded.shape[:2]
    if w != width or h != height or max(w,h) > 4096: raise ValueError("Decoded dimensions do not match source canvas.")
    if decoded.ndim == 2:
        rgb = cv2.cvtColor(decoded, cv2.COLOR_GRAY2RGB)
        visible = np.ones((h, w), dtype=bool)
    elif decoded.shape[2] == 4:
        rgb = cv2.cvtColor(decoded[:, :, :3], cv2.COLOR_BGR2RGB).astype(np.float32)
        alpha = decoded[:, :, 3].astype(np.float32) / 255.0
        visible = alpha > (8.0 / 255.0)
        rgb = np.clip(rgb * alpha[:, :, None] + 255.0 * (1.0 - alpha[:, :, None]), 0, 255).astype(np.uint8)
    elif decoded.shape[2] == 2:
        gray = cv2.cvtColor(decoded[:, :, :1], cv2.COLOR_GRAY2RGB).astype(np.float32)
        alpha = decoded[:, :, 1].astype(np.float32) / 255.0
        visible = alpha > (8.0 / 255.0)
        rgb = np.clip(gray * alpha[:, :, None] + 255.0 * (1.0 - alpha[:, :, None]), 0, 255).astype(np.uint8)
    elif decoded.shape[2] == 3:
        rgb = cv2.cvtColor(decoded, cv2.COLOR_BGR2RGB)
        visible = np.ones((h, w), dtype=bool)
    else:
        raise ValueError("Unsupported decoded image channel layout.")
    return rgb, visible

def decode_image(data_url, width, height):
    return decode_image_data(data_url, width, height)[0]

def polygon_for_mask(mask, cv2):
    contours, _ = cv2.findContours(mask.astype("uint8"), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours: return None
    contour = max(contours, key=cv2.contourArea)
    perimeter = cv2.arcLength(contour, True)
    points = cv2.approxPolyDP(contour, max(1.0, perimeter * 0.003), True).reshape(-1,2)
    if len(points) < 3: return None
    if len(points) > 512: points = points[::((len(points)+511)//512)][:512]
    return [{"x":int(p[0]),"y":int(p[1])} for p in points]

def select_distinct_masks(masks, image_shape, limit=63):
    height, width = image_shape[:2]
    image_area = height * width
    candidates = []
    for item in masks:
        mask = item.get("segmentation")
        if mask is None or getattr(mask, "shape", None) != (height, width):
            continue
        area = int(item.get("area", int(mask.sum())))
        ratio = area / image_area
        if ratio < 0.0015 or ratio > 0.78:
            continue
        quality = float(item.get("predicted_iou", 0.0)) * float(item.get("stability_score", 0.0))
        candidates.append((quality, area, item))
    candidates.sort(key=lambda value: (value[0], value[1]), reverse=True)
    selected = []
    selected_masks = []
    for _quality, _area, item in candidates:
        mask = item["segmentation"].astype(bool)
        duplicate = False
        for prior in selected_masks:
            intersection = int((mask & prior).sum())
            union = int((mask | prior).sum())
            if union and intersection / union >= 0.92:
                duplicate = True
                break
        if duplicate:
            continue
        selected.append(item)
        selected_masks.append(mask)
        if len(selected) >= limit:
            break
    return selected

def normalize_prompt_points(points, width, height):
    if not isinstance(points, list) or not 1 <= len(points) <= 32:
        raise ValueError("Provide between 1 and 32 SAM 2 point prompts.")
    normalized = []
    for index, point in enumerate(points):
        if not isinstance(point, dict):
            raise ValueError("Prompt point " + str(index) + " must be an object.")
        raw_x, raw_y, raw_label = point.get("x"), point.get("y"), point.get("label", 1)
        if isinstance(raw_x, bool) or isinstance(raw_y, bool) or not isinstance(raw_x, (int, float)) or not isinstance(raw_y, (int, float)):
            raise ValueError("Prompt point " + str(index) + " coordinates must be numeric.")
        if isinstance(raw_label, bool) or not isinstance(raw_label, int):
            raise ValueError("Prompt point " + str(index) + " label must be integer 0 or 1.")
        x, y, label = float(raw_x), float(raw_y), raw_label
        if not math.isfinite(x) or not math.isfinite(y) or not 0 <= x < width or not 0 <= y < height:
            raise ValueError("Prompt point " + str(index) + " is outside the source canvas.")
        if label not in (0, 1):
            raise ValueError("Prompt point labels must be 0 (negative) or 1 (positive).")
        normalized.append((x, y, label))
    if not any(point[2] == 1 for point in normalized):
        raise ValueError("At least one positive point is required for SAM 2 segmentation.")
    return normalized

def detect_parts(payload):
    width, height = payload["canvas"]["width"], payload["canvas"]["height"]
    image, visible_pixels = decode_image_data(payload["imageDataUrl"], width, height)
    generator, _, _ = load_model()
    import cv2
    with _INFERENCE_LOCK:
        masks = generator.generate(image)
    for item in masks:
        mask = item.get("segmentation")
        if mask is not None and getattr(mask, "shape", None) == visible_pixels.shape:
            clipped = mask.astype(bool) & visible_pixels
            item["segmentation"] = clipped
            item["area"] = int(clipped.sum())
    masks = select_distinct_masks(masks, image.shape, limit=63)
    proposals = []
    for index, item in enumerate(masks):
        if len(proposals) >= 63: break
        mask = item.get("segmentation")
        if mask is None: continue
        polygon = polygon_for_mask(mask, cv2)
        if not polygon: continue
        x,y,w,h = cv2.boundingRect(mask.astype("uint8"))
        if w < 2 or h < 2: continue
        proposals.append({"id":"sam2-part-"+str(index+1),"name":"SAM 2 segment "+str(index+1),
          "role":"unknown","confidence":max(0.0,min(1.0,float(item.get("predicted_iou",0.5)))),
          "bounds":{"x":int(x),"y":int(y),"width":int(w),"height":int(h)},
          "mask":{"kind":"polygon","points":polygon},
          "provenance":{"segmentation":"sam2","pixels":"source"}})
    return {"protocolVersion":1,"proposals":proposals}

def segment_from_points(payload):
    width, height = payload["canvas"]["width"], payload["canvas"]["height"]
    image, visible_pixels = decode_image_data(payload["imageDataUrl"], width, height)
    points = normalize_prompt_points(payload.get("points"), width, height)
    _, predictor, _ = load_model()
    import cv2, numpy as np
    coordinates = np.asarray([[point[0], point[1]] for point in points], dtype=np.float32)
    labels = np.asarray([point[2] for point in points], dtype=np.int32)
    with _INFERENCE_LOCK:
        predictor.set_image(image)
        masks, scores, _logits = predictor.predict(
            point_coords=coordinates,
            point_labels=labels,
            multimask_output=True
        )
    proposals = []
    for index, mask in enumerate(masks):
        mask = mask.astype(bool) & visible_pixels
        if not mask.any():
            continue
        polygon = polygon_for_mask(mask, cv2)
        if not polygon:
            continue
        x, y, w, h = cv2.boundingRect(mask.astype("uint8"))
        if w < 2 or h < 2:
            continue
        proposals.append({
            "id": "sam2-prompt-" + str(index + 1),
            "name": "SAM 2 prompted mask " + str(index + 1),
            "role": "unknown",
            "confidence": max(0.0, min(1.0, float(scores[index]))),
            "bounds": {"x": int(x), "y": int(y), "width": int(w), "height": int(h)},
            "mask": {"kind": "polygon", "points": polygon},
            "provenance": {"segmentation": "sam2", "pixels": "source"}
        })
    return {"protocolVersion": 1, "proposals": proposals}

class Handler(BaseHTTPRequestHandler):
    server_version = "FVMStudioAI/1"
    def setup(self):
        super().setup()
        self.connection.settimeout(15)
    def send_json(self,status,value):
        raw=json.dumps(value,separators=(",",":")).encode()
        self.send_response(status); self.send_header("Content-Type","application/json; charset=utf-8")
        self.send_header("Content-Length",str(len(raw))); self.send_header("Cache-Control","no-store")
        self.end_headers(); self.wfile.write(raw)
    def do_GET(self):
        if urlparse(self.path).path != "/v1/capabilities": return self.send_json(404,{"error":"Not found"})
        self.send_json(200,capabilities())
    def do_POST(self):
        task_path = urlparse(self.path).path
        if task_path not in ("/v1/auto-rig/part-detection", "/v1/auto-rig/prompted-segmentation"):
            return self.send_json(404,{"error":"Unsupported task"})
        if not trusted_local_request(self.headers):
            return self.send_json(403,{"error":"Only same-machine JSON requests without a browser Origin are accepted."})
        if not _REQUEST_SLOT.acquire(blocking=False):
            return self.send_json(429,{"error":"The local AI worker is busy; retry after the current inference finishes."})
        try:
            if self.headers.get("Transfer-Encoding"):
                return self.send_json(400,{"error":"Transfer-Encoding is not supported."})
            raw = read_limited_body(self.rfile, self.headers.get("Content-Length"))
            payload = validate_task_payload(json.loads(raw))
            result = detect_parts(payload) if task_path.endswith("/part-detection") else segment_from_points(payload)
            self.send_json(200,result)
        except RuntimeError as exc: self.send_json(503,{"error":str(exc)})
        except (ValueError,KeyError,TypeError,json.JSONDecodeError) as exc: self.send_json(400,{"error":str(exc)[:300]})
        except (TimeoutError, socket.timeout):
            self.send_json(408,{"error":"Request body timed out."})
        except Exception:
            self.send_json(500,{"error":"Inference failed."})
        finally:
            _REQUEST_SLOT.release()
    def log_message(self,*_args): pass

if __name__ == "__main__":
    print("FarmVsMonsters Studio SAM 2 worker listening at http://127.0.0.1:"+str(PORT))
    ThreadingHTTPServer((HOST,PORT),Handler).serve_forever()
