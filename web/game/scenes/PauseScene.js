import { Scene } from "phaser";
import { translate } from "../../app/LocaleProvider";
import { readBrowserLocale, readStorageValue, writeStorageValue } from "../services/browserStorage.mjs";

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
    this.languageChangeHandler = () => this.drawCurrentMenu();
    window.addEventListener("farm-language-change", this.languageChangeHandler);
    this.events.once("shutdown", () => window.removeEventListener("farm-language-change", this.languageChangeHandler));

    this.input.keyboard.on("keydown-ESC", this.resumeBattle, this);
    this.input.keyboard.on("keydown-P", this.resumeBattle, this);
    this.events.once("shutdown", () => {
      this.input.keyboard.off("keydown-ESC", this.resumeBattle, this);
      this.input.keyboard.off("keydown-P", this.resumeBattle, this);
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

  drawCurrentMenu() {
    this.children.removeAll(true);
    if (this.menuMode === "settings") this.drawSettingsMenu();
    else this.drawPauseMenu();
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
    this.addMenuButton(270, "RESUME", GLASS.green, () => this.resumeBattle());
    this.addMenuButton(345, "RESTART", GLASS.blue, () => this.restartBattle());
    this.addMenuButton(420, "SETTINGS", GLASS.violet, () => {
      this.menuMode = "settings";
      this.drawCurrentMenu();
    });
    this.addMenuButton(495, "MAIN MENU", GLASS.coral, () => {
      if (typeof window !== "undefined") window.location.assign("/");
    });
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
      this.addVolumeButton(420, y + 14, "−", () => this.changeVolume(channel, -5), GLASS.blue);
      this.add.text(560, y + 14, value + "%", {
        fontFamily: "Arial", fontSize: "22px", color: "#ffffff",
        fontStyle: "bold", stroke: "#24365d", strokeThickness: 3, resolution: 2
      }).setOrigin(0.5);
      this.addVolumeButton(700, y + 14, "+", () => this.changeVolume(channel, 5), GLASS.green);
    });
    this.addMenuButton(520, "BACK", GLASS.gold, () => {
      this.menuMode = "pause";
      this.drawCurrentMenu();
    });
  }

  changeVolume(channel, amount) {
    const next = Math.max(0, Math.min(100, this.readVolume(channel.key, channel.initial) + amount));
    writeStorageValue(window, "farmVsMonsters.audio." + channel.key, next);
    this.drawCurrentMenu();
  }

  addVolumeButton(x, y, label, action, color) {
    const bg = this.add.rectangle(x, y, 54, 42, GLASS.blue, 0.3)
      .setStrokeStyle(1, GLASS.white, 0.78).setInteractive({ useHandCursor: true });
    this.add.rectangle(x, y, 46, 34, color, 0.62)
      .setStrokeStyle(1, GLASS.white, 0.62);
    this.add.text(x, y - 1, label, {
      fontFamily: "Arial", fontSize: "28px", color: "#ffffff",
      fontStyle: "bold", stroke: "#24365d", strokeThickness: 3, resolution: 2
    }).setOrigin(0.5);
    bg.on("pointerover", () => bg.setScale(1.06));
    bg.on("pointerout", () => bg.setScale(1));
    bg.on("pointerdown", action);
  }

  addMenuButton(y, label, color, action) {
    const bg = this.add.rectangle(560, y, 250, 52, GLASS.blue, 0.28)
      .setStrokeStyle(1, GLASS.white, 0.82).setInteractive({ useHandCursor: true });
    this.add.rectangle(560, y, 240, 44, color, 0.72)
      .setStrokeStyle(1, GLASS.white, 0.76);
    this.add.text(560, y, this.tr(label), {
      fontFamily: "Arial", fontSize: "18px", color: "#ffffff",
      fontStyle: "bold", stroke: "#24365d", strokeThickness: 3, resolution: 2
    }).setOrigin(0.5);
    bg.on("pointerover", () => bg.setFillStyle(GLASS.blue, 0.72).setScale(1.04));
    bg.on("pointerout", () => bg.setFillStyle(GLASS.blue, 0.28).setScale(1));
    bg.on("pointerdown", action);
  }

  resumeBattle() {
    const battle = this.scene.get("BattleScene");
    if (!battle || !battle.isPaused || battle.gameOver) return;
    this.scene.stop();
    this.scene.resume("BattleScene");
    battle.resumeFromPause();
  }

  restartBattle() {
    const battle = this.scene.get("BattleScene");
    if (battle && battle.scene.isActive()) battle.scene.stop();
    this.scene.start("BattleScene");
  }
}
