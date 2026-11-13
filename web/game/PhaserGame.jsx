"use client";

import { useEffect, useRef } from "react";

export default function PhaserGame() {
  const hostRef = useRef(null);

  useEffect(() => {
    let game = null;
    let cancelled = false;

    Promise.all([
      import("phaser"),
      import("./scenes/BattleScene")
    ]).then(([phaserModule, sceneModule]) => {
      if (cancelled || !hostRef.current) return;
      const Phaser = phaserModule.default;
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        width: 1120,
        height: 680,
        backgroundColor: "#a8c978",
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH
        },
        render: {
          antialias: true,
          pixelArt: false
        },
        scene: [sceneModule.default]
      });
    });

    return () => {
      cancelled = true;
      if (game) game.destroy(true);
    };
  }, []);

  return <div className="phaser-host" ref={hostRef} aria-label="Farm Vs Monsters playable battle" />;
}
