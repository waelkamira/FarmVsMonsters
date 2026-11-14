import importlib.util
import unittest
from pathlib import Path
from PIL import Image, ImageDraw

SCRIPT = Path(__file__).parents[1] / "scripts" / "extract-farmer-frames.py"
SPEC = importlib.util.spec_from_file_location("farmer_extractor", SCRIPT)
EXTRACTOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(EXTRACTOR)


class FarmerFrameExtractionTests(unittest.TestCase):
    def make_guttered_sheet(self):
        image = Image.new("RGBA", (54, 54), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        # Four separate sprites, with fully transparent 8px gutters.
        draw.rectangle((3, 3, 15, 17), fill=(220, 90, 50, 255))
        draw.rectangle((24, 5, 45, 16), fill=(50, 180, 90, 255))
        draw.rectangle((5, 27, 16, 46), fill=(70, 100, 220, 255))
        draw.rectangle((27, 29, 42, 45), fill=(220, 180, 40, 255))
        return image

    def test_merges_narrow_transparent_slits_but_keeps_real_gutters(self):
        self.assertEqual(
            EXTRACTOR.occupied_runs(
                [True, True, False, False, True, True], minimum_gutter=3
            ),
            [(0, 6)],
        )
        self.assertEqual(
            EXTRACTOR.occupied_runs(
                [True, True, False, False, False, True, True],
                minimum_gutter=3,
            ),
            [(0, 2), (5, 7)],
        )

    def test_detects_gutter_separated_two_by_two_frames(self):
        image = self.make_guttered_sheet()
        rgba, boxes, rows, columns = EXTRACTOR.detect_frames(image)
        self.assertEqual(len(rows), 2)
        self.assertEqual(len(columns), 2)
        self.assertEqual(len(boxes), 4)
        self.assertEqual(boxes[0], (3, 3, 16, 18))

    def test_normalizes_frames_to_fixed_canvas_and_baseline(self):
        image = self.make_guttered_sheet()
        rgba, boxes, _, _ = EXTRACTOR.detect_frames(image)
        frames, metadata, scale = EXTRACTOR.normalize_frames(rgba, boxes)
        self.assertEqual(len(frames), 4)
        self.assertTrue(all(frame.size == (512, 512) for frame in frames))
        self.assertTrue(all(item["foot_baseline_y"] == 496 for item in metadata))
        self.assertGreater(scale, 0)

    def test_shared_scale_keeps_different_action_sheets_consistent(self):
        image = self.make_guttered_sheet()
        rgba, boxes, _, _ = EXTRACTOR.detect_frames(image)
        frames, metadata, scale = EXTRACTOR.normalize_frames(
            rgba, boxes, shared_scale=10
        )
        self.assertEqual(scale, 10)
        self.assertEqual(metadata[0]["output_size"], [512, 512])
        self.assertEqual(frames[0].getbbox()[3], 496)

    def test_shared_scale_that_would_clip_is_rejected(self):
        image = self.make_guttered_sheet()
        rgba, boxes, _, _ = EXTRACTOR.detect_frames(image)
        with self.assertRaises(ValueError):
            EXTRACTOR.normalize_frames(rgba, boxes, shared_scale=100)

    def test_empty_image_is_rejected(self):
        image = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
        with self.assertRaises(ValueError):
            EXTRACTOR.detect_frames(image)


if __name__ == "__main__":
    unittest.main()
