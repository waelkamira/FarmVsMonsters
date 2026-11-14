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

The tests cover removal of a tiny detached edge artifact, preservation of a
small detached interior detail, preservation of a larger edge-connected
shape, and refusal to guess when the sheet dimensions do not divide evenly
into the declared frame grid.
