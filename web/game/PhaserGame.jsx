"use client";

import { useEffect, useRef } from "react";

export default function PhaserGame() {
  const hostRef = useRef(null);

  useEffect(() => {
    let game = null;
    let cancelled = false;

    Promise.all([
      import("phaser"),
      import("./scenes/BattleScene"),\n      import("./scenes/PauseScene")
    ]).then(([phaserModule, sceneModule]) => {
      if (cancelled || !hostRef.current) return;
      const { Game, AUTO, Scale } = phaserModule;
      game = new Game({
        type: AUTO,
        parent: hostRef.current,
        width: 1120,
        height: 680,
        backgroundColor: "#a8c978",
        scale: {
          mode: Scale.FIT,
          autoCenter: Scale.CENTER_BOTH
        },
        render: {
          antialias: true,
          pixelArt: false
        },
        scene: [sceneModule.default, pauseModule.default]
      });
    });

    return () => {
      cancelled = true;
      if (game) game.destroy(true);
    };
  }, []);

  return <div className="phaser-host" ref={hostRef} aria-label="Farm Vs Monsters playable battle" />;
}
