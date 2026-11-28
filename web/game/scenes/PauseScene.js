import { Scene } from "phaser";
import { translate } from "../../app/LocaleProvider";
import { readBrowserLocale, readStorageValue, writeStorageValue } from "../services/browserStorage.mjs";
import { getPauseMenuControlIndex, isPauseMenuActivationKey } from "../services/pauseMenuNavigation.mjs";
import { claimPauseSceneTransition } from "../services/pauseSceneLifecycle.mjs";

const AUDIO_CHANNELS = [
  { key: "musicVolume", label: "Background music", initial: 70 },
  { key: "effectsVolume", label: "Sound effects", initial: 80 },
  { key: "projectileVolume", label: "Projectile sounds", initial: 65 }
];

const GLASS = {
  panel: 0x315b91,
  panelGlow: 0x35bceb,
  green: 0x42c96b,
  blue: 0x35bceb,
  violet: 0x8b65e8,
  coral: 0xff7185,
  gold: 0xffca45,
  white: 0xffffff
};

export default class PauseScene extends Scene {
  constructor() {
    super("PauseScene");
  }

  create() {
    // Reset the transition lock whenever Phaser launches this scene again.
    this.pauseTransitioning = false;
    this.languageChangeHandler = () => this.drawCurrentMenu();
    window.addEventListener("farm-language-change", this.languageChangeHandler);
    this.events.once("shutdown", () => window.removeEventListener("farm-language-change", this.languageChangeHandler));

    this.input.keyboard.on("keydown-ESC", this.resumeBattle, this);
    this.input.keyboard.on("keydown-P", this.resumeBattle, this);
    this.input.keyboard.on("keydown", this.handleMenuKey, this);
    this.events.once("shutdown", () => {
      this.input.keyboard.off("keydown-ESC", this.resumeBattle, this);
      this.input.keyboard.off("keydown-P", this.resumeBattle, this);
      this.input.keyboard.off("keydown", this.handleMenuKey, this);
      this.keyboardControls = [];
      this.activeKeyboardControlIndex = -1;
    });

    this.menuMode = "pause";
    this.drawCurrentMenu();
  }

  locale() {
    return readBrowserLocale(typeof window !== "undefined" ? window : null);
  }

  tr(value) {
    return translate(value, this.locale());
  }

  drawCurrentMenu(preferredFocusId = null) {
    const previousFocusId = this.keyboardControls?.[this.activeKeyboardControlIndex]?.id;
    const focusId = preferredFocusId ?? previousFocusId;
    this.children.removeAll(true);
    this.keyboardControls = [];
    this.activeKeyboardControlIndex = -1;
    if (this.menuMode === "settings") this.drawSettingsMenu();
    else this.drawPauseMenu();

    const nextIndex = this.keyboardControls.findIndex((control) => control.id === focusId);
    this.focusKeyboardControl(nextIndex >= 0 ? nextIndex : 0);
  }

  registerKeyboardControl({ id, row, column, background, action, ringWidth, ringHeight }) {
    const focusRing = this.add.rectangle(background.x, background.y, ringWidth, ringHeight, 0x000000, 0)
      .setStrokeStyle(3, GLASS.gold, 1)
      .setVisible(false);
    const index = this.keyboardControls.length;
    this.keyboardControls.push({ id, row, column, background, focusRing, action });

    background.on("pointerover", () => {
      this.focusKeyboardControl(index);
      background.setFillStyle(GLASS.blue, 0.72);
    });
    background.on("pointerout", () => background.setFillStyle(GLASS.blue, 0.28));
    background.on("pointerdown", () => {
      this.focusKeyboardControl(index);
      action();
    });
  }

  focusKeyboardControl(index) {
    if (!this.keyboardControls?.length) {
      this.activeKeyboardControlIndex = -1;
      return;
    }
    const safeIndex = Number.isInteger(index) && index >= 0 && index < this.keyboardControls.length ? index : 0;
    this.activeKeyboardControlIndex = safeIndex;
    this.keyboardControls.forEach((control, controlIndex) => {
      control.focusRing.setVisible(controlIndex === safeIndex);
      control.background.setScale(controlIndex === safeIndex ? 1.04 : 1);
    });
  }

  handleMenuKey(event) {
    const key = event?.key;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) {
      event.preventDefault?.();
      const nextIndex = getPauseMenuControlIndex(
        this.keyboardControls,
        this.activeKeyboardControlIndex,
        key
      );
      this.focusKeyboardControl(nextIndex);
      return;
    }

    if (!isPauseMenuActivationKey(key, event?.code)) return;
    const control = this.keyboardControls?.[this.activeKeyboardControlIndex];
    if (!control) return;
    event.preventDefault?.();
    control.action();
  }

  drawPanel(title, height = 420) {
    this.add.rectangle(560, 340, 1120, 680, 0x142b50, 0.58).setDepth(-1);
    this.add.rectangle(560, 340, 526, height + 22, GLASS.violet, 0.18)
      .setStrokeStyle(1, GLASS.white, 0.5);
    this.add.rectangle(560, 340, 508, height, GLASS.panel, 0.64)
      .setStrokeStyle(1, GLASS.white, 0.72);
    this.add.rectangle(560, 340, 488, height - 20, GLASS.blue, 0.12)
      .setStrokeStyle(1, GLASS.lime || 0xa7e84f, 0.38);
    this.add.rectangle(560, 340 - height / 2 + 12, 472, 5, GLASS.white, 0.28);
    this.add.text(560, 340 - height / 2 + 58, this.tr(title), {
      fontFamily: "Arial", fontSize: "32px", color: "#ffffff",
      fontStyle: "bold", stroke: "#24365d", strokeThickness: 5, resolution: 2
    }).setOrigin(0.5);
  }

  drawPauseMenu() {
    this.drawPanel("BATTLE PAUSED", 420);
    this.addMenuButton(270, "RESUME", GLASS.green, () => this.resumeBattle(), {
      id: "resume", row: 0, column: 0
    });
    this.addMenuButton(345, "RESTART", GLASS.blue, () => this.restartBattle(), {
      id: "restart", row: 1, column: 0
    });
    this.addMenuButton(420, "SETTINGS", GLASS.violet, () => {
      this.menuMode = "settings";
      this.drawCurrentMenu("musicVolume-decrease");
    }, { id: "settings", row: 2, column: 0 });
    this.addMenuButton(495, "MAIN MENU", GLASS.coral, () => {
      if (typeof window !== "undefined") window.location.assign("/");
    }, { id: "main-menu", row: 3, column: 0 });
  }

  readVolume(key, initial) {
    const raw = readStorageValue(window, "farmVsMonsters.audio." + key, null);
    const value = Number(raw);
    return raw !== null && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : initial;
  }

  drawSettingsMenu() {
    this.drawPanel("GAME PREFERENCES", 500);
    AUDIO_CHANNELS.forEach((channel, index) => {
      const y = 270 + index * 92;
      const value = this.readVolume(channel.key, channel.initial);
      this.add.rectangle(560, y + 10, 390, 66, GLASS.white, 0.09)
        .setStrokeStyle(1, GLASS.white, 0.32);
      this.add.text(560, y - 23, this.tr(channel.label), {
        fontFamily: "Arial", fontSize: "19px", color: "#ffffff",
        fontStyle: "bold", stroke: "#24365d", strokeThickness: 3, resolution: 2
      }).setOrigin(0.5);
      this.addVolumeButton(420, y + 14, "−", () => this.changeVolume(channel, -5, channel.key + "-decrease"), GLASS.blue, {
        id: channel.key + "-decrease", row: index, column: 0
      });
      this.add.text(560, y + 14, value + "%", {
        fontFamily: "Arial", fontSize: "22px", color: "#ffffff",
        fontStyle: "bold", stroke: "#24365d", strokeThickness: 3, resolution: 2
      }).setOrigin(0.5);
      this.addVolumeButton(700, y + 14, "+", () => this.changeVolume(channel, 5, channel.key + "-increase"), GLASS.green, {
        id: channel.key + "-increase", row: index, column: 1
      });
    });
    this.addMenuButton(520, "BACK", GLASS.gold, () => {
      this.menuMode = "pause";
      this.drawCurrentMenu("settings");
    }, { id: "back", row: AUDIO_CHANNELS.length, column: 0 });
  }

  changeVolume(channel, amount, focusId) {
    const next = Math.max(0, Math.min(100, this.readVolume(channel.key, channel.initial) + amount));
    writeStorageValue(window, "farmVsMonsters.audio." + channel.key, next);
    this.drawCurrentMenu(focusId);
  }

  addVolumeButton(x, y, label, action, color, position) {
    const bg = this.add.rectangle(x, y, 54, 42, GLASS.blue, 0.3)
      .setStrokeStyle(1, GLASS.white, 0.78).setInteractive({ useHandCursor: true });
    this.add.rectangle(x, y, 46, 34, color, 0.62)
      .setStrokeStyle(1, GLASS.white, 0.62);
    this.add.text(x, y - 1, label, {
      fontFamily: "Arial", fontSize: "28px", color: "#ffffff",
      fontStyle: "bold", stroke: "#24365d", strokeThickness: 3, resolution: 2
    }).setOrigin(0.5);
    this.registerKeyboardControl({
      ...position,
      background: bg,
      action,
      ringWidth: 68,
      ringHeight: 56
    });
  }

  addMenuButton(y, label, color, action, position) {
    const bg = this.add.rectangle(560, y, 250, 52, GLASS.blue, 0.28)
      .setStrokeStyle(1, GLASS.white, 0.82).setInteractive({ useHandCursor: true });
    this.add.rectangle(560, y, 240, 44, color, 0.72)
      .setStrokeStyle(1, GLASS.white, 0.76);
    this.add.text(560, y, this.tr(label), {
      fontFamily: "Arial", fontSize: "18px", color: "#ffffff",
      fontStyle: "bold", stroke: "#24365d", strokeThickness: 3, resolution: 2
    }).setOrigin(0.5);
    this.registerKeyboardControl({
      ...position,
      background: bg,
      action,
      ringWidth: 264,
      ringHeight: 66
    });
  }

  resumeBattle() {
    const battle = this.scene.get("BattleScene");
    if (!battle || !battle.isPaused || battle.gameOver || !claimPauseSceneTransition(this)) return;
    this.scene.stop();
    this.scene.resume("BattleScene");
    battle.resumeFromPause();
  }

  restartBattle() {
    if (!claimPauseSceneTransition(this)) return;
    const battle = this.scene.get("BattleScene");
    if (battle && battle.scene.isActive()) battle.scene.stop();
    this.scene.start("BattleScene");
  }
}
