"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "../app/LocaleProvider";
import { detectBrowserVFXQuality, getGameRenderResolution } from "./vfx/core/VFXConfig.mjs";

export default function PhaserGame() {
  const { t, locale } = useLocale();
  const hostRef = useRef(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPortraitPhone, setIsPortraitPhone] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenAvailable, setFullscreenAvailable] = useState(false);

  useEffect(() => {
    const updateFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  useEffect(() => {
    const updateOrientation = () => {
      setIsPortraitPhone(
        window.matchMedia("(max-width: 700px) and (orientation: portrait)").matches
      );
    };
    updateOrientation();
    setFullscreenAvailable(typeof hostRef.current?.requestFullscreen === "function");
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
    let sceneStartupTimer = null;

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

    const handleBattleSceneError = (event) => {
      if (cancelled) return;
      if (sceneStartupTimer) window.clearTimeout(sceneStartupTimer);
      const phase = event.detail?.phase || "runtime";
      const message = event.detail?.message || "Unknown Phaser scene error";
      setErrorMessage("BattleScene " + phase + ": " + message);
      setStatus("error");
    };
    const handleBattleSceneReady = (event) => {
      if (cancelled) return;
      if (sceneStartupTimer) window.clearTimeout(sceneStartupTimer);
      console.info("[FarmVsMonsters] Battle scene ready", event.detail || {});
      setErrorMessage("");
      setStatus("ready");
    };
    window.addEventListener("farm-battle-scene-error", handleBattleSceneError);
    window.addEventListener("farm-battle-scene-ready", handleBattleSceneReady);

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
          resolution: getGameRenderResolution(
            window.devicePixelRatio || 1,
            detectBrowserVFXQuality()
          ),
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

        sceneStartupTimer = window.setTimeout(() => {
          if (cancelled) return;
          setErrorMessage("Phaser initialized, but BattleScene did not finish create() within 20 seconds. Check browser console and failed network requests.");
          setStatus("error");
        }, 20000);
      } catch (error) {
        showError(error);
      }
    }).catch(showError);

    return () => {
      cancelled = true;
      window.removeEventListener("farm-battle-scene-error", handleBattleSceneError);
      window.removeEventListener("farm-battle-scene-ready", handleBattleSceneReady);
      if (sceneStartupTimer) window.clearTimeout(sceneStartupTimer);
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
      {fullscreenAvailable && (
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
          {locale === "ar" ? (isFullscreen ? "إنهاء ملء الشاشة" : "ملء الشاشة") : (isFullscreen ? "Exit full screen" : "Full screen")}
        </button>
      )}
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
