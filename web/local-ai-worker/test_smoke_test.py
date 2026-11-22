import base64
import unittest

import cv2
import numpy as np

from smoke_test import HEIGHT, WIDTH, synthetic_plant_data_url, validate_proposals


class SmokeTestHelpersTests(unittest.TestCase):
    def test_synthetic_plant_is_a_decodable_source_sized_png(self):
        data_url = synthetic_plant_data_url()
        self.assertTrue(data_url.startswith("data:image/png;base64,"))
        raw = base64.b64decode(data_url.split(",", 1)[1], validate=True)
        image = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)
        self.assertIsNotNone(image)
        self.assertEqual(image.shape[:2], (HEIGHT, WIDTH))

    def test_proposal_validator_accepts_editable_source_space_masks(self):
        result = {"proposals": [{
            "bounds": {"x": 10, "y": 20, "width": 30, "height": 40},
            "mask": {"kind": "polygon", "points": [{"x": 10, "y": 20}, {"x": 40, "y": 20}, {"x": 25, "y": 60}]}
        }]}
        self.assertEqual(validate_proposals(result, "test"), 1)

    def test_proposal_validator_rejects_missing_masks_and_out_of_canvas_bounds(self):
        with self.assertRaisesRegex(RuntimeError, "no segmentation proposals"):
            validate_proposals({"proposals": []}, "test")
        with self.assertRaisesRegex(RuntimeError, "outside the source canvas"):
            validate_proposals({"proposals": [{
                "bounds": {"x": 300, "y": 300, "width": 30, "height": 30},
                "mask": {"kind": "polygon", "points": [{"x": 300, "y": 300}, {"x": 310, "y": 300}, {"x": 310, "y": 310}]}
            }]}, "test")


if __name__ == "__main__":
    unittest.main()
