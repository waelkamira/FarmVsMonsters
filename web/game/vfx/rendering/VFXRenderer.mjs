/**
 * Phaser display-object adapter for cosmetic VFX.
 * Owns visual construction and visual-state reset; it never changes gameplay state.
 */
export class VFXRenderer {
  constructor(scene) {
    if (!scene?.add) throw new TypeError("VFXRenderer requires a Phaser scene");
    this.scene = scene;
    this.destroyed = false;
  }

  createTextureVisual(x, y, texture, config = {}) {
    if (this.destroyed || !this.scene?.add?.image) return null;
    const image = this.scene.add.image(x, y, texture);
    this.resetTextureVisual(image, x, y, config);
    return image;
  }

  resetTextureVisual(image, x, y, config = {}) {
    if (!image || this.destroyed) return false;
    image.setPosition?.(x, y);
    image.setActive?.(true);
    image.setVisible?.(true);
    image.setAlpha?.(1);
    image.setScale?.(config.scale ?? 0.25);
    image.clearTint?.();
    if (config.tint != null) image.setTint?.(config.tint);
    if (config.depth != null) image.setDepth?.(config.depth);
    return true;
  }

  createProceduralVisual(x, y, config = {}, count = 7, kind = "burst") {
    if (this.destroyed || !this.scene?.add?.container || !this.scene?.add?.circle) return null;
    const color = config.tint ?? 0xffffff;
    const burst = this.scene.add.container(x, y);
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count;
      const radius = kind === "trail" ? 2 : 5;
      const dot = this.scene.add.circle(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        kind === "trail" ? 2 : 3,
        color,
        0.9
      );
      burst.add(dot);
    }
    this.resetProceduralVisual(burst, x, y, config);
    return burst;
  }

  resetProceduralVisual(burst, x, y, config = {}) {
    if (!burst || this.destroyed) return false;
    const color = config.tint ?? 0xffffff;
    burst.setPosition?.(x, y);
    burst.setActive?.(true);
    burst.setVisible?.(true);
    burst.setAlpha?.(1);
    burst.setScale?.(1);
    burst.setDepth?.(config.depth ?? 30);
    for (const dot of burst.list || []) {
      dot.setActive?.(true);
      dot.setVisible?.(true);
      dot.setAlpha?.(0.9);
      dot.setScale?.(1);
      dot.setFillStyle?.(color, 0.9);
    }
    return true;
  }

  deactivate(visual) {
    if (!visual) return false;
    visual.setAlpha?.(1);
    visual.setScale?.(1);
    visual.setVisible?.(false);
    visual.setActive?.(false);
    visual.clearTint?.();
    for (const child of visual.list || []) {
      child.setAlpha?.(1);
      child.setScale?.(1);
      child.setVisible?.(false);
      child.setActive?.(false);
    }
    return true;
  }

  destroyVisual(visual) {
    if (!visual) return false;
    try {
      if (visual.active) visual.destroy?.();
      return true;
    } catch {
      return false;
    }
  }

  destroy() {
    this.destroyed = true;
    this.scene = null;
  }
}

export default VFXRenderer;
