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
        with self.assertRaises(ValueError): worker.decode_image("https://example.com/a.png", 10, 10)
    def test_polygon_is_bounded(self):
        import numpy as np, cv2
        mask=np.zeros((32,32),dtype=bool); mask[5:20,7:25]=True
        points=worker.polygon_for_mask(mask,cv2)
        self.assertGreaterEqual(len(points),3); self.assertLessEqual(len(points),512)
        self.assertTrue(all(0<=p["x"]<32 and 0<=p["y"]<32 for p in points))

if __name__ == "__main__": unittest.main()
