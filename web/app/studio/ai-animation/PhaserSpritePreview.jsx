"use client";
import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";

export default function PhaserSpritePreview({ src, frameWidth = 150, frameHeight = 150, frameCount = 24, fps = 12, loop = true, label = "معاينة Phaser" }) {
  const host = useRef(null);
  const [scale, setScale] = useState(1);
  const [speed, setSpeed] = useState(fps);
  useEffect(() => setSpeed(fps), [fps]);
  useEffect(() => {
    if (!host.current || !src) return undefined;
    let sprite = null;
    const config = {
      type: Phaser.CANVAS,
      width: 520,
      height: 300,
      parent: host.current,
      backgroundColor: "#263523",
      render: { antialias: true, pixelArt: false, roundPixels: true },
      audio: { noAudio: true },
      scene: {
        preload() {
          this.load.spritesheet("ai-motion-preview", src, { frameWidth, frameHeight, endFrame: Math.max(0, frameCount - 1) });
        },
        create() {
          const width = this.scale.width, height = this.scale.height;
          this.add.rectangle(width / 2, height - 28, width - 30, 2, 0x91a66f, 0.8);
          this.add.ellipse(width / 2, height - 26, 110, 12, 0x0d160d, 0.25);
          sprite = this.add.sprite(width / 2, height - 30, "ai-motion-preview", 0).setOrigin(0.5, 1).setScale(scale);
          const frames = this.anims.generateFrameNumbers("ai-motion-preview", { start: 0, end: Math.max(0, frameCount - 1) });
          this.anims.create({ key: "ai-motion-loop", frames, frameRate: speed, repeat: loop ? -1 : 0 });
          sprite.play("ai-motion-loop");
          this.events.on("destroy", () => { sprite = null; });
        }
      }
    };
    const game = new Phaser.Game(config);
    return () => { game.destroy(true); sprite = null; };
  }, [src, frameWidth, frameHeight, frameCount, loop, scale, speed]);
  return <section className="ai-phaser-preview">
    <div className="ai-phaser-preview-head"><b>{label} · Phaser 3</b><span>{frameCount} إطار · {speed} FPS</span></div>
    <div ref={host} className="ai-phaser-canvas" />
    <div className="ai-phaser-controls">
      <label>حجم العرض <input type="range" min="0.4" max="2" step="0.05" value={scale} onChange={e=>setScale(Number(e.target.value))}/><span>{Math.round(scale*100)}%</span></label>
      <label>سرعة التشغيل <input type="range" min="1" max="30" value={speed} onChange={e=>setSpeed(Number(e.target.value))}/><span>{speed} FPS</span></label>
    </div>
  </section>;
}
