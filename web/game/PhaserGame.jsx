"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "../app/LocaleProvider";

export default function PhaserGame() {
  const { t, locale } = useLocale();
  const hostRef = useRef(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPortraitPhone, setIsPortraitPhone] = useState(false);

  useEffect(() => {
    const updateOrientation = () => {
      setIsPortraitPhone(
        window.matchMedia("(max-width: 700px) and (orientation: portrait)").matches
      );
    };
    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);
    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  useEffect(() => {
    let game = null;
    let cancelled = false;

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
          resolution: Math.min(window.devicePixelRatio || 1, 2),
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

        const markReady = () => {
          if (!cancelled) setStatus("ready");
        };
        if (game.isBooted) markReady();
        else game.events.once("ready", markReady);
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
    <div className="phaser-host" ref={hostRef} aria-label={t("Farm Vs Monsters playable battle")}>
      {isPortraitPhone && (
        <div className="game-orientation-prompt" role="status" aria-live="polite">
          <span className="game-orientation-icon" aria-hidden="true">↻</span>
          <strong>{locale === "ar" ? "أدر جهازك إلى الوضع الأفقي" : "Rotate your device to landscape"}</strong>
          <span>{locale === "ar" ? "اللعبة مصممة للعب الأفقي حتى تبقى ساحة المعركة والأزرار واضحة." : "The battlefield is designed for landscape play so the arena and controls remain clear."}</span>
        </div>
      )}
      <button
        type="button"
        className="game-fullscreen-button"
        onClick={async () => {
          try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else await hostRef.current?.requestFullscreen?.();
          } catch {
            // Fullscreen is optional; the responsive game remains playable without it.
          }
        }}
      >
        {locale === "ar" ? "ملء الشاشة" : "Full screen"}
      </button>
      {status === "loading" && (
        <div className="game-status" role="status" aria-live="polite">
          <span className="game-status-mark" aria-hidden="true">✦</span>
          <strong>{t("Preparing the farm...")}</strong>
          <span>{t("Loading the battlefield and getting the tribe ready.")}</span>
        </div>
      )}
      {status === "error" && (
        <div className="game-status game-status-error" role="alert">
          <strong>{t("The battle could not be started")}</strong>
          <span>{errorMessage || t("The game engine failed to initialize.")}</span>
          <button type="button" className="game-retry-button" onClick={() => {
            setErrorMessage("");
            setStatus("loading");
            setAttempt((value) => value + 1);
          }}>
            {t("Try Again")}
          </button>
          <Link href="/" className="game-back-link">{t("Return to Main Menu")}</Link>
        </div>
      )}
    </div>
  );
}
