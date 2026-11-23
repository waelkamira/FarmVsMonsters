import base64
import unittest
from io import BytesIO

from PIL import Image

from worker import Motion, decode_source, make_conditioning_frames, validate_motion, vace_frame_count


class WanWorkerContractTests(unittest.TestCase):
    def test_motion_contract_accepts_studio_defaults(self):
        motion = Motion(id="idle", prompt="gentle idle", negativePrompt="morphing")
        validate_motion(motion)
        self.assertEqual(motion.width, 832)
        self.assertEqual(motion.height, 480)

    def test_rejects_dimensions_not_supported_by_vace(self):
        motion = Motion(id="attack", prompt="attack", width=800, height=478)
        with self.assertRaises(ValueError):
            validate_motion(motion)

    def test_rejects_unknown_motion(self):
        motion = Motion(id="teleport", prompt="teleport")
        with self.assertRaises(ValueError):
            validate_motion(motion)

    def test_vace_frame_count_rounds_up_to_4n_plus_1(self):
        self.assertEqual(vace_frame_count(24), 25)
        self.assertEqual(vace_frame_count(21), 21)

    def test_decode_png_source(self):
        output = BytesIO()
        Image.new("RGB", (12, 12), (0, 0, 255)).save(output, format="PNG")
        image = decode_source({"mimeType": "image/png", "base64": base64.b64encode(output.getvalue()).decode("ascii")})
        self.assertEqual(image.size, (12, 12))

    def test_vace_conditioning_preserves_first_frame_and_generates_rest(self):
        source = Image.new("RGB", (100, 100), (0, 0, 255))
        first, video, mask = make_conditioning_frames(source, 256, 256, 5)
        self.assertEqual(len(video), 5)
        self.assertEqual(len(mask), 5)
        self.assertEqual(mask[0].getpixel((0, 0)), 0)
        self.assertEqual(mask[1].getpixel((0, 0)), 255)
        self.assertEqual(video[0].size, (256, 256))
        self.assertEqual(first.getpixel((0, 0)), (0, 0, 255))


if __name__ == "__main__":
    unittest.main()
