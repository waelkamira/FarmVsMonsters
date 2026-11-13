"use client";

import { useEffect, useRef } from "react";
import Phaser from "phaser";
import BattleScene from "./scenes/BattleScene";

export default function PhaserGame() {
  const hostRef = useRef(null);

  useEffect(() => {
    if (!hostRef.current) return undefined;

    const game = new Phaser.Game({
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
      scene: [BattleScene]
    });

    return () => game.destroy(true);
  }, []);

  return <div className="phaser-host" ref={hostRef} aria-label="Farm Vs Monsters playable battle" />;
}
