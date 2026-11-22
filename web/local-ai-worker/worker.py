"""Loopback-only SAM 2 worker. Model weights must be installed locally."""
import base64, json, os, re, threading
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
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
            model = build_sam2(config, checkpoint, device=device)
            _MODEL = (SAM2AutomaticMaskGenerator(model, points_per_side=24, pred_iou_thresh=0.78,
                        stability_score_thresh=0.86, min_mask_region_area=64), device)
            return _MODEL
        except Exception as exc:
            _MODEL_ERROR = "Could not initialize SAM 2: " + str(exc)[:250]
            raise RuntimeError(_MODEL_ERROR) from exc
def capabilities():
    try:
        _, device = load_model()
        return {"protocolVersion":1,"status":"ready","device":device,"capabilities":["part-detection"],
                "models":[{"id":"sam2-automatic-mask-generator","version":"local-checkpoint","license":"Apache-2.0"}],"warnings":[]}
    except Exception as exc:
        return {"protocolVersion":1,"status":"degraded","device":"unknown","capabilities":[],"models":[],"warnings":[str(exc)]}

def decode_image(data_url, width, height):
    match = re.fullmatch(r"data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/]+=*)", data_url or "")
    if not match: raise ValueError("Expected PNG, JPEG, or WebP base64 data URL.")
    raw = base64.b64decode(match.group(2), validate=True)
    if len(raw) > MAX_IMAGE: raise ValueError("Image exceeds 8 MB.")
    import cv2, numpy as np
    image = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None: raise ValueError("Image decoding failed.")
    h, w = image.shape[:2]
    if w != width or h != height or max(w,h) > 4096: raise ValueError("Decoded dimensions do not match source canvas.")
    return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

def polygon_for_mask(mask, cv2):
    contours, _ = cv2.findContours(mask.astype("uint8"), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours: return None
    contour = max(contours, key=cv2.contourArea)
    perimeter = cv2.arcLength(contour, True)
    points = cv2.approxPolyDP(contour, max(1.0, perimeter * 0.003), True).reshape(-1,2)
    if len(points) < 3: return None
    if len(points) > 512: points = points[::((len(points)+511)//512)][:512]
    return [{"x":int(p[0]),"y":int(p[1])} for p in points]

def detect_parts(payload):
    width, height = payload["canvas"]["width"], payload["canvas"]["height"]
    image = decode_image(payload["imageDataUrl"], width, height)
    generator, _ = load_model()
    import cv2
    with _INFERENCE_LOCK:
        masks = generator.generate(image)
    proposals = []
    for index, item in enumerate(sorted(masks, key=lambda value:value.get("area",0), reverse=True)):
        if len(proposals) >= 63: break
        mask = item.get("segmentation")
        if mask is None: continue
        polygon = polygon_for_mask(mask, cv2)
        if not polygon: continue
        x,y,w,h = cv2.boundingRect(mask.astype("uint8"))
        if w < 2 or h < 2: continue
        proposals.append({"id":"sam2-part-"+str(index+1),"name":"SAM 2 segment "+str(index+1),
          "role":"accessory","confidence":max(0.0,min(1.0,float(item.get("predicted_iou",0.5)))),
          "bounds":{"x":int(x),"y":int(y),"width":int(w),"height":int(h)},
          "mask":{"kind":"polygon","points":polygon},
          "provenance":{"segmentation":"sam2","pixels":"source"}})
    return {"protocolVersion":1,"proposals":proposals}

class Handler(BaseHTTPRequestHandler):
    server_version = "FVMStudioAI/1"
    def send_json(self,status,value):
        raw=json.dumps(value,separators=(",",":")).encode()
        self.send_response(status); self.send_header("Content-Type","application/json; charset=utf-8")
        self.send_header("Content-Length",str(len(raw))); self.send_header("Cache-Control","no-store")
        self.end_headers(); self.wfile.write(raw)
    def do_GET(self):
        if urlparse(self.path).path != "/v1/capabilities": return self.send_json(404,{"error":"Not found"})
        self.send_json(200,capabilities())
    def do_POST(self):
        if urlparse(self.path).path != "/v1/auto-rig/part-detection": return self.send_json(404,{"error":"Unsupported task"})
        try:
            length=int(self.headers.get("Content-Length","0"))
            if length < 1 or length > MAX_BODY: return self.send_json(413,{"error":"Request body exceeds limit"})
            payload=json.loads(self.rfile.read(length))
            if payload.get("protocolVersion") != 1: return self.send_json(400,{"error":"Unsupported protocol"})
            self.send_json(200,detect_parts(payload))
        except RuntimeError as exc: self.send_json(503,{"error":str(exc)})
        except (ValueError,KeyError,TypeError,json.JSONDecodeError) as exc: self.send_json(400,{"error":str(exc)[:300]})
        except Exception as exc: self.send_json(500,{"error":"Inference failed: "+str(exc)[:250]})
    def log_message(self,*_args): pass

if __name__ == "__main__":
    print("FarmVsMonsters Studio SAM 2 worker listening at http://127.0.0.1:"+str(PORT))
    ThreadingHTTPServer((HOST,PORT),Handler).serve_forever()
