#!/usr/bin/env python3
"""Build the reusable 2D plant template scene for FarmVsMonsters.

Run:
  blender --background --python build_plant_template.py -- \
    --output web/.autorig-workspace/templates/plants/plant-master.blend \
    --source web/public/assets/plants/hazelnut-level-1.png

The script creates a clean, transparent, orthographic 2D scene. It deliberately
does not invent anatomy or split the source sheet into parts.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector

DEFAULT_WIDTH = 150
DEFAULT_HEIGHT = 150
DEFAULT_PIXELS_PER_UNIT = 100
DEFAULT_BASELINE_MARGIN_PX = 8


def parse_args():
    argv = sys.argv
    argv = argv[argv.index("--") + 1:] if "--" in argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, help="Destination .blend path")
    parser.add_argument("--source", help="Optional source PNG to inspect (not split)")
    parser.add_argument("--width", type=int, default=DEFAULT_WIDTH)
    parser.add_argument("--height", type=int, default=DEFAULT_HEIGHT)
    parser.add_argument("--pixels-per-unit", type=int, default=DEFAULT_PIXELS_PER_UNIT)
    parser.add_argument("--baseline-margin-px", type=int, default=DEFAULT_BASELINE_MARGIN_PX)
    return parser.parse_args(argv)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        if collection.name != "Collection":
            bpy.data.collections.remove(collection)
    scene = bpy.context.scene
    for child in list(scene.collection.children):
        scene.collection.children.unlink(child)


def make_collection(name):
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    return collection


def move_to_collection(obj, collection):
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    collection.objects.link(obj)


def add_guide_line(name, points, collection, bevel=0.0015):
    curve = bpy.data.curves.new(name, type="CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = bevel
    curve.bevel_resolution = 0
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, co in zip(spline.points, points):
        point.co = (co[0], co[1], co[2], 1.0)
    obj = bpy.data.objects.new(name, curve)
    collection.objects.link(obj)
    obj.hide_render = True
    obj.display_type = "WIRE"
    return obj


def inspect_source(path):
    if not path:
        return None
    source_path = Path(path).expanduser().resolve()
    if not source_path.is_file():
        raise FileNotFoundError(f"Source image does not exist: {source_path}")
    image = bpy.data.images.load(str(source_path), check_existing=False)
    width, height = map(int, image.size)
    has_alpha = image.channels == 4
    alpha_bounds = None
    if has_alpha:
        pixels = image.pixels
        min_x, min_y = width, height
        max_x, max_y = -1, -1
        # Scan alpha only. This records the visible bounds of the whole source,
        # not per-frame bounds and not a segmentation result.
        for y in range(height):
            row = y * width * 4
            for x in range(width):
                if pixels[row + x * 4 + 3] > 0.01:
                    min_x = min(min_x, x)
                    min_y = min(min_y, y)
                    max_x = max(max_x, x)
                    max_y = max(max_y, y)
        if max_x >= min_x and max_y >= min_y:
            alpha_bounds = {
                "left": min_x, "top": min_y,
                "right": max_x, "bottom": max_y,
                "width": max_x - min_x + 1,
                "height": max_y - min_y + 1,
            }
    result = {
        "path": str(source_path),
        "width": width,
        "height": height,
        "channels": int(image.channels),
        "hasAlphaChannel": bool(has_alpha),
        "wholeImageAlphaBounds": alpha_bounds,
        "note": "Whole-image alpha bounds only; no frame grid or anatomy is inferred.",
    }
    bpy.data.images.remove(image)
    return result


def configure_scene(width, height, pixels_per_unit, baseline_margin_px):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in {
        item.identifier for item in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items
    } else "BLENDER_EEVEE"

    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 15
    scene.render.filepath = "//renders/plant-template-preview.png"

    scene.render.image_settings.color_management = "FOLLOW_SCENE"
    scene.view_settings.view_transform = "Standard"
    try:
        scene.view_settings.look = "None"
    except Exception:
        pass
    scene.view_settings.exposure = 0.0
    scene.view_settings.gamma = 1.0

    scene.render.fps = 12
    scene.frame_start = 1
    scene.frame_end = 1
    scene.frame_set(1)

    # Blender front-view convention: X right, Z up, Y depth.
    # Phaser output convention: X right, Y down. The exporter performs the
    # vertical-axis conversion when it writes atlas metadata.
    ortho_height = height / float(pixels_per_unit)
    ortho_width = width / float(pixels_per_unit)
    baseline_z = baseline_margin_px / float(pixels_per_unit)
    camera_target_z = (ortho_height / 2.0) - baseline_z

    camera_data = bpy.data.cameras.new("PLANT_TEMPLATE_CAMERA")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = ortho_height
    camera = bpy.data.objects.new("PLANT_TEMPLATE_CAMERA", camera_data)
    scene.collection.objects.link(camera)
    camera.location = (0.0, -10.0, camera_target_z)
    direction = Vector((0.0, 1.0, 0.0))
    camera.rotation_euler = direction.to_track_quat("-Z", "Z").to_euler()
    scene.camera = camera

    # Orthographic camera width follows render aspect; record it explicitly.
    camera["ortho_width_world_units"] = ortho_width
    camera["ortho_height_world_units"] = ortho_height
    camera["pixels_per_unit"] = pixels_per_unit

    world = bpy.data.worlds.new("PLANT_TEMPLATE_WORLD") if not bpy.data.worlds else bpy.data.worlds[0]
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.0, 0.0, 0.0, 1.0)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.0

    scene.render.resolution_percentage = 100
    scene["template_id"] = "plant-master"
    scene["template_version"] = 1
    scene["canvas_width_px"] = width
    scene["canvas_height_px"] = height
    scene["pixels_per_unit"] = pixels_per_unit
    scene["baseline_margin_px"] = baseline_margin_px
    scene["coordinate_contract"] = "Blender X-right/Z-up/Y-depth; Phaser X-right/Y-down"


def build_scene(args, source_info):
    clear_scene()
    character_collection = make_collection("CHARACTER_PARTS")
    rig_collection = make_collection("RIG_AND_PIVOTS")
    guide_collection = make_collection("NON_RENDER_GUIDES")

    configure_scene(args.width, args.height, args.pixels_per_unit, args.baseline_margin_px)

    root = bpy.data.objects.new("PLANT_ROOT", None)
    root.empty_display_type = "CIRCLE"
    root.empty_display_size = 0.10
    root.location = (0.0, 0.0, 0.0)
    rig_collection.objects.link(root)
    root["role"] = "Ground/root pivot; do not assume it is the center of the sprite."

    muzzle = bpy.data.objects.new("ATTACK_ORIGIN_PLACEHOLDER", None)
    muzzle.empty_display_type = "SPHERE"
    muzzle.empty_display_size = 0.035
    muzzle.location = (0.25, -0.02, 0.85)
    rig_collection.objects.link(muzzle)
    muzzle.parent = root
    muzzle["role"] = "Unverified placeholder only; set after inspecting the real attack pose."

    half_w = args.width / float(args.pixels_per_unit) / 2.0
    add_guide_line("GUIDE_GROUNDLINE", [(-half_w, 0.02, 0.0), (half_w, 0.02, 0.0)], guide_collection)
    add_guide_line("GUIDE_CENTERLINE", [(0.0, 0.02, 0.0), (0.0, 0.02, args.height / float(args.pixels_per_unit))], guide_collection)

    # Keep the scene intentionally empty until real cutout parts and pivots
    # have been identified. The source image is inspected but not imported as
    # a guessed body/head assembly.
    scene = bpy.context.scene
    scene["source_inspection"] = json.dumps(source_info or {}, ensure_ascii=False)

    for obj in guide_collection.objects:
        obj.hide_set(False)
        obj.hide_render = True
    for obj in rig_collection.objects:
        obj.hide_render = True

    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    bpy.context.view_layer.objects.active = root


def main():
    args = parse_args()
    if args.width < 1 or args.height < 1 or args.pixels_per_unit < 1:
        raise ValueError("Canvas dimensions and pixels-per-unit must be positive integers.")
    if args.baseline_margin_px < 0 or args.baseline_margin_px >= args.height:
        raise ValueError("Baseline margin must be within the canvas height.")

    source_info = inspect_source(args.source)
    build_scene(args, source_info)

    output_path = Path(args.output).expanduser().resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(output_path))

    report_path = output_path.with_suffix(".inspection.json")
    report = {
        "templateId": "plant-master",
        "templateVersion": 1,
        "canvas": {"width": args.width, "height": args.height},
        "pixelsPerUnit": args.pixels_per_unit,
        "baselineMarginPx": args.baseline_margin_px,
        "camera": "orthographic",
        "transparentBackground": True,
        "sourceInspection": source_info,
        "anatomyPartsCreated": [],
        "warning": "No anatomy, part segmentation, pivots, or animation has been inferred or approved.",
    }
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"blend": str(output_path), "inspection": str(report_path), "source": source_info}, indent=2))


if __name__ == "__main__":
    main()
