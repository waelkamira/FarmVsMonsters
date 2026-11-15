import { Scene } from "phaser";
import { translate } from "../../app/LocaleProvider";

const AUDIO_CHANNELS = [
  { key: "musicVolume", label: "Background music", initial: 70 },
  { key: "effectsVolume", label: "Sound effects", initial: 80 },
  { key: "projectileVolume", label: "Projectile sounds", initial: 65 }
];

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
    return typeof window !== "undefined"
      ? window.localStorage.getItem("farmVsMonsters.language") || "ar"
      : "ar";
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
    this.add.rectangle(560, 340, 1120, 680, 0x080503, 0.88).setDepth(-1);
    this.add.rectangle(560, 340, 500, height, 0x21150d, 1).setStrokeStyle(8, 0x100904);
    this.add.rectangle(560, 340, 480, height - 20, 0x49301d, 1).setStrokeStyle(3, 0xf0ca83);
    this.add.text(560, 340 - height / 2 + 58, this.tr(title), {
      fontFamily: "Arial", fontSize: "32px", color: "#ffffff",
      fontStyle: "bold", stroke: "#100904", strokeThickness: 6, resolution: 2
    }).setOrigin(0.5);
  }

  drawPauseMenu() {
    this.drawPanel("BATTLE PAUSED", 420);
    this.addMenuButton(270, "RESUME", 0x9bc66e, () => this.resumeBattle());
    this.addMenuButton(345, "RESTART", 0xe5c27d, () => this.restartBattle());
    this.addMenuButton(420, "SETTINGS", 0xe5c27d, () => {
      this.menuMode = "settings";
      this.drawCurrentMenu();
    });
    this.addMenuButton(495, "MAIN MENU", 0xe6a17d, () => {
      if (typeof window !== "undefined") window.location.assign("/");
    });
  }

  readVolume(key, initial) {
    const raw = window.localStorage.getItem("farmVsMonsters.audio." + key);
    const value = Number(raw);
    return raw !== null && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : initial;
  }

  drawSettingsMenu() {
    this.drawPanel("GAME PREFERENCES", 500);
    AUDIO_CHANNELS.forEach((channel, index) => {
      const y = 270 + index * 92;
      const value = this.readVolume(channel.key, channel.initial);
      this.add.text(560, y - 23, this.tr(channel.label), {
        fontFamily: "Arial", fontSize: "19px", color: "#ffffff", fontStyle: "bold", stroke: "#100904", strokeThickness: 3, resolution: 2
      }).setOrigin(0.5);
      this.addVolumeButton(420, y + 14, "−", () => this.changeVolume(channel, -5));
      this.add.text(560, y + 14, value + "%", {
        fontFamily: "Arial", fontSize: "22px", color: "#fff5dc", fontStyle: "bold", stroke: "#100904", strokeThickness: 3, resolution: 2
      }).setOrigin(0.5);
      this.addVolumeButton(700, y + 14, "+", () => this.changeVolume(channel, 5));
    });
    this.addMenuButton(520, "BACK", 0x9bc66e, () => {
      this.menuMode = "pause";
      this.drawCurrentMenu();
    });
  }

  changeVolume(channel, amount) {
    const next = Math.max(0, Math.min(100, this.readVolume(channel.key, channel.initial) + amount));
    window.localStorage.setItem("farmVsMonsters.audio." + channel.key, String(next));
    this.drawCurrentMenu();
  }

  addVolumeButton(x, y, label, action) {
    const bg = this.add.rectangle(x, y, 54, 42, 0x4b301e, 1)
      .setStrokeStyle(3, 0x392417).setInteractive({ useHandCursor: true });
    this.add.rectangle(x, y, 46, 34, 0xe5c27d, 1).setStrokeStyle(1, 0xf4dfb3);
    this.add.text(x, y - 1, label, {
      fontFamily: "Arial", fontSize: "28px", color: "#211307", fontStyle: "bold", stroke: "#fff0c8", strokeThickness: 1, resolution: 2
    }).setOrigin(0.5);
    bg.on("pointerover", () => bg.setScale(1.06));
    bg.on("pointerout", () => bg.setScale(1));
    bg.on("pointerdown", action);
  }

  addMenuButton(y, label, color, action) {
    const bg = this.add.rectangle(560, y, 250, 52, 0x4b301e, 1)
      .setStrokeStyle(3, 0x392417).setInteractive({ useHandCursor: true });
    this.add.rectangle(560, y, 240, 44, color, 1).setStrokeStyle(1, 0xf4dfb3);
    this.add.text(560, y, this.tr(label), {
      fontFamily: "Arial", fontSize: "18px", color: "#211307", fontStyle: "bold", stroke: "#fff0c8", strokeThickness: 1, resolution: 2
    }).setOrigin(0.5);
    bg.on("pointerover", () => bg.setScale(1.04));
    bg.on("pointerout", () => bg.setScale(1));
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
