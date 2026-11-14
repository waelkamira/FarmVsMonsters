"use client";

import { useEffect, useRef, useState } from "react";

export default function PhaserGame() {
  const hostRef = useRef(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let game = null;
    let cancelled = false;

    setStatus("loading");
    setErrorMessage("");

    const showError = (error) => {
      if (cancelled) return;
      const message = error instanceof Error ? error.message : String(error || "Unknown startup error");
      setErrorMessage(message.slice(0, 240));
      setStatus("error");
      if (game) {
        game.destroy(true);
        game = null;
      }
    };

    Promise.all([
      import("phaser"),
      import("./scenes/BattleScene"),
      import("./scenes/PauseScene")
    ]).then(([phaserModule, sceneModule, pauseModule]) => {
      if (cancelled || !hostRef.current) return;

      try {
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

        game.events.once("ready", () => {
          if (!cancelled) setStatus("ready");
        });
      } catch (error) {
        showError(error);
      }
    }).catch(showError);

    return () => {
      cancelled = true;
      if (game) {
        game.destroy(true);
        game = null;
      }
    };
  }, [attempt]);

  return (
    <div className="phaser-host" ref={hostRef} aria-label="Farm Vs Monsters playable battle">
      {status === "loading" && (
        <div className="game-status" role="status" aria-live="polite">
          <span className="game-status-mark" aria-hidden="true">✦</span>
          <strong>Preparing the farm...</strong>
          <span>Loading the battlefield and getting the tribe ready.</span>
        </div>
      )}
      {status === "error" && (
        <div className="game-status game-status-error" role="alert">
          <strong>The battle could not be started</strong>
          <span>{errorMessage || "The game engine failed to initialize."}</span>
          <button type="button" className="game-retry-button" onClick={() => setAttempt((value) => value + 1)}>
            Try Again
          </button>
          <a href="/" className="game-back-link">Return to Main Menu</a>
        </div>
      )}
    </div>
  );
}
