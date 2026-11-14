# Farmer sprite-sheet cleanup

The cleanup utility is intentionally conservative and never overwrites its input.

## Run

From the repository root:

```powershell
python -m pip install Pillow
python web/scripts/clean-farmer-spritesheet.py
```

The default target is `web/public/assets/characters/farmer/farmer-plant.png`,
with a 6-column grid of 180×360 frames. The tool writes a separate
`.cleaned.png`, a contact-sheet preview, and a JSON report.

## Removal rule

A connected alpha component is removed only when BOTH conditions hold:

- Its area is no greater than `--max-edge-speck-area` (default 48 pixels).
- Its bounding box touches the configured edge band of its own frame.

The component scan is performed independently inside each frame. It cannot
borrow pixels from a neighboring frame. Larger components and small components
away from frame edges are preserved. If a character limb or body part is
connected to the main silhouette, it remains part of that connected component
and is not treated as a detached speck.

## Review before replacing an asset

Open the generated contact-sheet preview and inspect every frame, especially
the first and last. Check the JSON report for each removed component and its
bounding box. Do not replace the original sprite sheet unless the preview
confirms that only detached edge artifacts were removed.

## Regression tests

```powershell
python -m pip install Pillow
python -m unittest web.tests.test_farmer_spritesheet_cleaner
```

The tests cover removal of tiny detached edge artifacts, preservation of a
small detached interior detail and a larger edge-connected shape, strict
separation of neighboring frame boundaries, and refusal to guess when the
sheet dimensions do not divide evenly into the declared frame grid.

## Extracting the newly spaced sprite sheets

For the revised farmer artwork, use the gutter-aware extractor rather than the
legacy fixed-cell cleaner:

```powershell
python -m pip install Pillow
python web/scripts/extract-farmer-frames.py "path/to/farmer-sheet.png"
```

The extractor detects frame rows and columns from transparent gutters. Narrow
transparent slits smaller than 8px are merged, so internal gaps in a drawing do
not split a frame; authored separators should be at least 8px wide (the agreed
target is 16px).
It writes numbered PNGs, `contact-sheet.jpg`, and `frames.json` into a new
output folder. Each output is 512×512, with at least 16px transparent padding
and a shared scale within that source sheet. The source PNG is never changed.

The shared baseline is aligned to y=496. Inspect the contact sheet and JSON
before integrating. If any frame touches another because the source does not
have a full transparent gutter, stop and correct the source layout rather than
guessing boundaries. The legacy cleaner above remains for its original fixed
grid use only.

### Keep every animation at the same visual scale

Process the idle sheet first. Its report prints a `Shared scale` value. Pass
that exact value to every other action sheet:

```powershell
python web/scripts/extract-farmer-frames.py "farmer-idle.png"
python web/scripts/extract-farmer-frames.py "farmer-run.png" --scale 0.12345678
python web/scripts/extract-farmer-frames.py "farmer-plant.png" --scale 0.12345678
```

Replace the example number with the value printed by the idle extraction.
This keeps the same source-pixel-to-output-pixel scale across idle, walk, run,
plant, uproot, attack, collect, hurt, jump, and death. The tool refuses a scale
that would clip a frame; it never silently shrinks one action independently.
Use the same scale for all sheets created from the same-resolution art export.
