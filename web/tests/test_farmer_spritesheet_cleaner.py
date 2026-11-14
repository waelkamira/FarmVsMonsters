import importlib.util
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

SCRIPT = Path(__file__).parents[1] / "scripts" / "clean-farmer-spritesheet.py"
SPEC = importlib.util.spec_from_file_location("farmer_cleaner", SCRIPT)
CLEANER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CLEANER)


class FarmerSpritesheetCleanerTests(unittest.TestCase):
    def make_sheet(self):
        image = Image.new("RGBA", (20, 10), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        # Character body, deliberately away from the frame boundary.
        draw.rectangle((4, 2, 10, 8), fill=(220, 120, 70, 255))
        # Tiny detached artifact touching the left crop boundary.
        draw.point((0, 5), fill=(255, 0, 0, 255))
        # A tiny detached detail away from the boundary must be preserved.
        draw.point((15, 5), fill=(0, 255, 0, 255))
        return image

    def test_removes_only_tiny_detached_edge_component(self):
        source = self.make_sheet()
        cleaned, report, cols, rows = CLEANER.clean_sheet(
            source, frame_width=20, frame_height=10,
            max_area=2, edge_band=1, alpha_threshold=16
        )
        self.assertEqual((cols, rows), (1, 1))
        self.assertEqual(cleaned.getpixel((0, 5))[3], 0)
        self.assertEqual(cleaned.getpixel((15, 5))[3], 255)
        self.assertEqual(cleaned.getpixel((6, 5))[3], 255)
        self.assertEqual(len(report[0]["removed_components"]), 1)

    def test_preserves_large_edge_connected_component(self):
        source = Image.new("RGBA", (20, 10), (0, 0, 0, 0))
        draw = ImageDraw.Draw(source)
        draw.rectangle((0, 2, 5, 7), fill=(200, 100, 50, 255))
        cleaned, report, _, _ = CLEANER.clean_sheet(
            source, 20, 10, max_area=2, edge_band=1, alpha_threshold=16
        )
        self.assertEqual(cleaned.getpixel((0, 4))[3], 255)
        self.assertEqual(report[0]["removed_components"], [])

    def test_refuses_ambiguous_grid_dimensions(self):
        source = Image.new("RGBA", (21, 10), (0, 0, 0, 0))
        with self.assertRaises(ValueError):
            CLEANER.clean_sheet(source, 20, 10, 2, 1, 16)


    def test_components_do_not_cross_into_neighboring_frame(self):
        source = Image.new("RGBA", (40, 10), (0, 0, 0, 0))
        draw = ImageDraw.Draw(source)
        # Two tiny pixels face each other across the crop boundary.
        draw.point((19, 5), fill=(255, 0, 0, 255))
        draw.point((20, 5), fill=(0, 255, 0, 255))
        cleaned, report, cols, rows = CLEANER.clean_sheet(
            source, 20, 10, max_area=2, edge_band=1, alpha_threshold=16
        )
        self.assertEqual((cols, rows), (2, 1))
        self.assertEqual(cleaned.getpixel((19, 5))[3], 0)
        self.assertEqual(cleaned.getpixel((20, 5))[3], 0)
        self.assertEqual(sum(len(frame["removed_components"]) for frame in report), 2)


if __name__ == "__main__":
    unittest.main()
