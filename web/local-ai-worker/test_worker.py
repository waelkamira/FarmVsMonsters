import unittest
from unittest.mock import patch
import worker

class WorkerTests(unittest.TestCase):
    def test_capabilities_degraded_without_weights(self):
        with patch.object(worker, "load_model", side_effect=RuntimeError("missing weights")):
            result = worker.capabilities()
        self.assertEqual(result["status"], "degraded")
        self.assertEqual(result["capabilities"], [])

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
