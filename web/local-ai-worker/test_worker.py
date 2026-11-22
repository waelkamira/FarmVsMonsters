import unittest
from unittest.mock import patch
import worker

class WorkerTests(unittest.TestCase):
    def test_worker_accepts_only_loopback_json_requests_without_browser_origin(self):
        trusted = {"Host": worker.HOST + ":" + str(worker.PORT), "Content-Type": "application/json"}
        self.assertTrue(worker.trusted_local_request(trusted))
        self.assertFalse(worker.trusted_local_request({**trusted, "Origin": "https://attacker.example"}))
        self.assertFalse(worker.trusted_local_request({**trusted, "Host": "attacker.example"}))
        self.assertFalse(worker.trusted_local_request({**trusted, "Content-Type": "text/plain"}))
    def test_capabilities_degraded_without_weights(self):
        with patch.object(worker, "load_model", side_effect=RuntimeError("missing weights")):
            result = worker.capabilities()
        self.assertEqual(result["status"], "degraded")
        self.assertEqual(result["capabilities"], [])

    def test_normalizes_positive_and_negative_sam2_point_prompts(self):
        points = worker.normalize_prompt_points([{"x": 12.5, "y": 20, "label": 1}, {"x": 40, "y": 50, "label": 0}], 100, 100)
        self.assertEqual(points, [(12.5, 20.0, 1), (40.0, 50.0, 0)])

    def test_rejects_invalid_sam2_point_prompts(self):
        with self.assertRaises(ValueError): worker.normalize_prompt_points([], 100, 100)
        with self.assertRaises(ValueError): worker.normalize_prompt_points([{"x": 20, "y": 20, "label": 0}], 100, 100)
        with self.assertRaises(ValueError): worker.normalize_prompt_points([{"x": 100, "y": 20, "label": 1}], 100, 100)
        with self.assertRaises(ValueError): worker.normalize_prompt_points([{"x": 20, "y": 20, "label": 2}], 100, 100)
        with self.assertRaises(ValueError): worker.normalize_prompt_points([{"x": float("nan"), "y": 20, "label": 1}], 100, 100)
        with self.assertRaises(ValueError): worker.normalize_prompt_points([{"x": "20", "y": 20, "label": 1}], 100, 100)
        with self.assertRaises(ValueError): worker.normalize_prompt_points([{"x": 20, "y": None, "label": 1}], 100, 100)
        with self.assertRaises(ValueError): worker.normalize_prompt_points([{"x": 20, "y": 20, "label": True}], 100, 100)

    def test_ready_capabilities_advertise_automatic_and_prompted_segmentation(self):
        with patch.object(worker, "load_model", return_value=(object(), object(), "cpu")):
            result = worker.capabilities()
        self.assertEqual(result["status"], "ready")
        self.assertIn("part-detection", result["capabilities"])
        self.assertIn("prompted-segmentation", result["capabilities"])

    def test_prompted_segmentation_returns_valid_source_space_mask_proposals(self):
        import numpy as np
        class FakePredictor:
            def set_image(self, image):
                self.shape = image.shape[:2]
            def predict(self, point_coords, point_labels, multimask_output):
                self.coords = point_coords
                self.labels = point_labels
                self.multimask = multimask_output
                mask = np.zeros((1, *self.shape), dtype=bool)
                mask[0, 20:60, 30:70] = True
                return mask, np.asarray([0.91], dtype=np.float32), None
        predictor = FakePredictor()
        payload = {
            "canvas": {"width": 100, "height": 100},
            "imageDataUrl": "data:image/png;base64,AA==",
            "points": [{"x": 40, "y": 40, "label": 1}, {"x": 10, "y": 10, "label": 0}]
        }
        with patch.object(worker, "decode_image", return_value=np.zeros((100, 100, 3), dtype=np.uint8)), \
             patch.object(worker, "load_model", return_value=(object(), predictor, "cpu")):
            result = worker.segment_from_points(payload)
        self.assertEqual(result["protocolVersion"], 1)
        self.assertEqual(len(result["proposals"]), 1)
        proposal = result["proposals"][0]
        self.assertEqual(proposal["provenance"]["segmentation"], "sam2")
        self.assertEqual(proposal["bounds"], {"x": 30, "y": 20, "width": 40, "height": 40})
        self.assertAlmostEqual(proposal["confidence"], 0.91, places=5)
        self.assertEqual(predictor.labels.tolist(), [1, 0])
        self.assertTrue(predictor.multimask)

    def test_decodes_transparent_png_without_turning_transparent_pixels_black(self):
        import base64, cv2, numpy as np
        bgra = np.zeros((2, 2, 4), dtype=np.uint8)
        bgra[0, 0] = [0, 0, 255, 255]
        bgra[0, 1] = [0, 255, 0, 128]
        bgra[1, 0] = [255, 0, 0, 0]
        ok, encoded = cv2.imencode(".png", bgra)
        self.assertTrue(ok)
        data_url = "data:image/png;base64," + base64.b64encode(encoded.tobytes()).decode("ascii")
        rgb = worker.decode_image(data_url, 2, 2)
        self.assertEqual(rgb[0, 0].tolist(), [255, 0, 0])
        self.assertTrue(all(channel >= 254 for channel in rgb[1, 0].tolist()))
        self.assertEqual(rgb[0, 1].tolist(), [127, 255, 127])

    def test_rejects_non_data_url(self):
        with self.assertRaises(ValueError):
            worker.decode_image("https://example.com/a.png", 10, 10)

    def test_polygon_is_bounded(self):
        import numpy as np, cv2
        mask = np.zeros((32, 32), dtype=bool)
        mask[5:20, 7:25] = True
        points = worker.polygon_for_mask(mask, cv2)
        self.assertGreaterEqual(len(points), 3)
        self.assertLessEqual(len(points), 512)
        self.assertTrue(all(0 <= p["x"] < 32 and 0 <= p["y"] < 32 for p in points))

    def test_mask_selection_drops_background_tiny_regions_and_near_duplicates(self):
        import numpy as np
        shape = (100, 100)
        background = np.ones(shape, dtype=bool)
        tiny = np.zeros(shape, dtype=bool); tiny[1:3, 1:3] = True
        part = np.zeros(shape, dtype=bool); part[20:60, 20:60] = True
        duplicate = part.copy()
        other = np.zeros(shape, dtype=bool); other[65:90, 65:90] = True
        masks = [
            {"segmentation": background, "area": 10000, "predicted_iou": .99, "stability_score": .99},
            {"segmentation": tiny, "area": 4, "predicted_iou": .99, "stability_score": .99},
            {"segmentation": part, "area": 1600, "predicted_iou": .92, "stability_score": .91},
            {"segmentation": duplicate, "area": 1600, "predicted_iou": .90, "stability_score": .90},
            {"segmentation": other, "area": 625, "predicted_iou": .88, "stability_score": .90},
        ]
        selected = worker.select_distinct_masks(masks, shape)
        self.assertEqual(len(selected), 2)
        self.assertEqual(selected[0]["segmentation"].sum(), 1600)

if __name__ == "__main__":
    unittest.main()
