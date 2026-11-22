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
        self.assertIn("visible-donor-reconstruction", result["capabilities"])
        self.assertNotIn("part-detection", result["capabilities"])

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
        self.assertIn("visible-donor-reconstruction", result["capabilities"])

    def test_automatic_mask_proposals_are_clipped_to_visible_alpha(self):
        import numpy as np
        class FakeGenerator:
            def generate(self, image):
                return [{"segmentation": np.ones((10, 10), dtype=bool), "area": 100,
                         "predicted_iou": .95, "stability_score": .95}]
        visible = np.zeros((10, 10), dtype=bool)
        visible[2:8, 2:8] = True
        rgb = np.zeros((10, 10, 3), dtype=np.uint8)
        with patch.object(worker, "decode_image_data", return_value=(rgb, visible)), \
             patch.object(worker, "load_model", return_value=(FakeGenerator(), object(), "cpu")):
            result = worker.detect_parts({"canvas": {"width": 10, "height": 10}, "imageDataUrl": "data:image/png;base64,AA=="})
        self.assertEqual(len(result["proposals"]), 1)
        self.assertEqual(result["proposals"][0]["bounds"], {"x": 2, "y": 2, "width": 6, "height": 6})

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
        with patch.object(worker, "decode_image_data", return_value=(np.zeros((100, 100, 3), dtype=np.uint8), np.ones((100, 100), dtype=bool))), \
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

    def test_visible_donor_reconstruction_returns_transparent_reviewable_patch(self):
        import base64, cv2, numpy as np
        rgb = np.zeros((100, 100, 3), dtype=np.uint8)
        rgb[:, :] = [220, 40, 30]
        visible = np.ones((100, 100), dtype=bool)
        payload = {
            "canvas": {"width": 100, "height": 100},
            "imageDataUrl": "data:image/png;base64,AA==",
            "sourcePolygon": [{"x": 10, "y": 10}, {"x": 30, "y": 10}, {"x": 30, "y": 30}, {"x": 10, "y": 30}],
            "targetPolygon": [{"x": 60, "y": 10}, {"x": 80, "y": 10}, {"x": 80, "y": 30}, {"x": 60, "y": 30}],
            "flipHorizontal": True
        }
        with patch.object(worker, "decode_image_data", return_value=(rgb, visible)):
            result = worker.reconstruct_from_visible_donor(payload)
        self.assertEqual(result["protocolVersion"], 1)
        self.assertEqual(result["targetBounds"], {"x": 60, "y": 10, "width": 21, "height": 21})
        self.assertEqual(result["donorBounds"], {"x": 10, "y": 10, "width": 21, "height": 21})
        self.assertEqual(result["provenance"], {"pixels": "reconstructed", "method": "visible-donor-transfer", "reviewRequired": True})
        encoded = base64.b64decode(result["patchDataUrl"].split(",", 1)[1])
        patch_image = cv2.imdecode(np.frombuffer(encoded, dtype=np.uint8), cv2.IMREAD_UNCHANGED)
        self.assertEqual(patch_image.shape, (21, 21, 4))
        self.assertEqual(int(patch_image[10, 10, 3]), 255)
        self.assertEqual(int(patch_image[0, 0, 3]), 255)

    def test_visible_donor_reconstruction_rejects_invalid_and_invisible_donor(self):
        import numpy as np
        rgb = np.zeros((20, 20, 3), dtype=np.uint8)
        visible = np.ones((20, 20), dtype=bool)
        visible[1:6, 1:6] = False
        payload = {
            "canvas": {"width": 20, "height": 20},
            "imageDataUrl": "data:image/png;base64,AA==",
            "sourcePolygon": [{"x": -1, "y": 1}, {"x": 5, "y": 1}, {"x": 5, "y": 5}],
            "targetPolygon": [{"x": 10, "y": 10}, {"x": 15, "y": 10}, {"x": 15, "y": 15}, {"x": 10, "y": 15}]
        }
        with patch.object(worker, "decode_image_data", return_value=(rgb, visible)):
            with self.assertRaises(ValueError):
                worker.reconstruct_from_visible_donor(payload)
            payload["sourcePolygon"] = [{"x": 1, "y": 1}, {"x": 5, "y": 1}, {"x": 5, "y": 5}, {"x": 1, "y": 5}]
            with self.assertRaises(ValueError):
                worker.reconstruct_from_visible_donor(payload | {"sourcePolygon": [{"x": 1, "y": 1}, {"x": 5, "y": 1}, {"x": 5, "y": 5}, {"x": 1, "y": 5}], "targetPolygon": [{"x": 10, "y": 10}, {"x": 15, "y": 10}, {"x": 15, "y": 15}, {"x": 10, "y": 15}]})


    def test_decodes_transparent_png_without_turning_transparent_pixels_black(self):
        import base64, cv2, numpy as np
        bgra = np.zeros((2, 2, 4), dtype=np.uint8)
        bgra[0, 0] = [0, 0, 255, 255]
        bgra[0, 1] = [0, 255, 0, 128]
        bgra[1, 0] = [255, 0, 0, 0]
        ok, encoded = cv2.imencode(".png", bgra)
        self.assertTrue(ok)
        data_url = "data:image/png;base64," + base64.b64encode(encoded.tobytes()).decode("ascii")
        rgb, visible = worker.decode_image_data(data_url, 2, 2)
        self.assertEqual(visible.tolist(), [[True, True], [False, False]])
        self.assertEqual(rgb[0, 0].tolist(), [255, 0, 0])
        self.assertTrue(all(channel >= 254 for channel in rgb[1, 0].tolist()))
        self.assertEqual(rgb[0, 1, 1], 255)
        self.assertTrue(126 <= int(rgb[0, 1, 0]) <= 127)
        self.assertTrue(126 <= int(rgb[0, 1, 2]) <= 127)

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
