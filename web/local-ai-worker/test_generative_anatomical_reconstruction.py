import os
import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch

import numpy as np

from generative_anatomical_reconstruction import model_status, reconstruct_anatomical_region


class GenerativeAnatomicalReconstructionTests(unittest.TestCase):
    def setUp(self):
        self.image = np.full((128, 128, 3), 180, dtype=np.uint8)
        self.base = {
            "canvas": {"width": 128, "height": 128},
            "targetPolygon": [{"x": 30, "y": 30}, {"x": 90, "y": 30}, {"x": 90, "y": 90}, {"x": 30, "y": 90}],
            "prompt": "continue the hidden leaf behind the plant body",
            "seed": 12345
        }

    def test_requires_existing_local_model_directory(self):
        with patch.dict(os.environ, {"FVM_INPAINT_MODEL_DIR": "/missing/local/model"}):
            self.assertFalse(model_status())

    def test_model_status_requires_complete_local_diffusion_checkpoint(self):
        with tempfile.TemporaryDirectory() as directory:
            model_dir = Path(directory)
            (model_dir / "model_index.json").write_text("{}", encoding="utf-8")
            unet = model_dir / "unet"
            unet.mkdir()
            (unet / "config.json").write_text("{}", encoding="utf-8")
            with patch.dict(os.environ, {"FVM_INPAINT_MODEL_DIR": directory}):
                self.assertFalse(model_status())
                (unet / "diffusion_pytorch_model.safetensors").touch()
                self.assertTrue(model_status())

    def test_rejects_missing_prompt_before_loading_model(self):
        payload = dict(self.base, prompt="")
        with self.assertRaisesRegex(ValueError, "Describe the missing anatomical part"):
            reconstruct_anatomical_region(payload, self.image)

    def test_rejects_invalid_seed_before_loading_model(self):
        payload = dict(self.base, seed=-1)
        with self.assertRaisesRegex(ValueError, "seed"):
            reconstruct_anatomical_region(payload, self.image)

    def test_rejects_tiny_targets_before_loading_model(self):
        payload = dict(self.base, targetPolygon=[
            {"x": 40, "y": 40}, {"x": 44, "y": 40}, {"x": 44, "y": 44}, {"x": 40, "y": 44}
        ])
        with self.assertRaisesRegex(ValueError, "too small"):
            reconstruct_anatomical_region(payload, self.image)


if __name__ == "__main__":
    unittest.main()
