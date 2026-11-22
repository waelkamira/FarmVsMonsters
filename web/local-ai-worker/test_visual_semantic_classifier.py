import os
import tempfile
import unittest
from unittest.mock import patch

import numpy as np

from visual_semantic_classifier import _role_prompts, classify_regions, model_status


class VisualSemanticClassifierTests(unittest.TestCase):
    def test_plant_and_monster_taxonomies_are_distinct_and_visual(self):
        plant_kind, plant_entries, plant_prompts = _role_prompts("plant")
        monster_kind, monster_entries, monster_prompts = _role_prompts("monster")
        self.assertEqual(plant_kind, "plant")
        self.assertEqual(monster_kind, "monster")
        self.assertIn("leaf", [role for role, _description in plant_entries])
        self.assertIn("mouth", [role for role, _description in monster_entries])
        self.assertTrue(all("2D game character sprite" in prompt for prompt in plant_prompts + monster_prompts))
        self.assertNotEqual(plant_prompts, monster_prompts)

    def test_classifier_requires_a_local_model_directory(self):
        with patch.dict(os.environ, {"FVM_CLIP_MODEL_DIR": "/path/that/does/not/exist"}):
            self.assertFalse(model_status())

    def test_classifier_rejects_empty_and_excessive_proposal_batches(self):
        image = np.zeros((32, 32, 3), dtype=np.uint8)
        with self.assertRaisesRegex(ValueError, "1–63"):
            classify_regions(image, [], "plant")
        proposals = [{"id": "p" + str(index)} for index in range(64)]
        with self.assertRaisesRegex(ValueError, "1–63"):
            classify_regions(image, proposals, "monster")

    def test_classifier_rejects_invalid_crop_and_mask_before_loading_model(self):
        image = np.zeros((32, 32, 3), dtype=np.uint8)
        invalid = [{
            "id": "bad",
            "bounds": {"x": 10, "y": 10, "width": 12, "height": 12},
            "mask": {"kind": "polygon", "points": [{"x": 0, "y": 0}, {"x": 10, "y": 0}, {"x": 5, "y": 10}]}
        }]
        with self.assertRaisesRegex(ValueError, "outside proposal crop"):
            classify_regions(image, invalid, "plant")


if __name__ == "__main__":
    unittest.main()
