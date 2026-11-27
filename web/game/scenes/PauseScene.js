import { Scene } from "phaser";
import { translate } from "../../app/LocaleProvider";

const AUDIO_CHANNELS = [
  { key: "musicVolume", label: "Background music", initial: 70 },
  { key: "effectsVolume", label: "Sound effects", initial: 80 },
  { key: "projectileVolume", label: "Projectile sounds", initial: 65 }
];

const GLASS = {
  panel: 0x286b43,
  panelGlow: 0x9fe0a2,
  green: 0x79c98c,
  blue: 0x4f9d68,
  violet: 0x3e8758,
  coral: 0x2d754b,
  gold: 0xa9e5b0,
  white: 0xf2fff1
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
    // Layered translucent green surfaces create a frosted-glass menu.
    this.add.rectangle(560, 340, 1120, 680, 0x102b1c, 0.58).setDepth(-1);
    this.add.rectangle(560, 340, 548, height + 30, 0x123d29, 0.28)
      .setStrokeStyle(1, 0xeaffeb, 0.28);
    this.add.rectangle(560, 340, 528, height + 10, 0x286b43, 0.78)
      .setStrokeStyle(1.5, 0xf2fff1, 0.78);
    this.add.rectangle(560, 340, 506, height - 12, 0x8dcc96, 0.2)
      .setStrokeStyle(1, 0xffffff, 0.32);
    this.add.rectangle(560, 340, 488, height - 30, 0xb6edbc, 0.12)
      .setStrokeStyle(1, 0xeaffeb, 0.22);
    this.add.rectangle(560, 340 - height / 2 + 12, 474, 6, 0xd7f8d9, 0.38);
    this.add.text(560, 340 - height / 2 + 58, this.tr(title), {
      fontFamily: "Arial", fontSize: "32px", color: "#f2fff1",
      fontStyle: "bold", stroke: "#17442d", strokeThickness: 2, resolution: 2
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
    const raw = window.localStorage.getItem("farmVsMonsters.audio." + key);
    const value = Number(raw);
    return raw !== null && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : initial;
  }

  drawSettingsMenu() {
    this.drawPanel("GAME PREFERENCES", 500);
    AUDIO_CHANNELS.forEach((channel, index) => {
      const y = 270 + index * 92;
      const value = this.readVolume(channel.key, channel.initial);
      this.add.rectangle(560, y + 10, 390, 66, 0x8dcc96, 0.2)
        .setStrokeStyle(1, 0xf2fff1, 0.52);
      this.add.text(560, y - 23, this.tr(channel.label), {
        fontFamily: "Arial", fontSize: "19px", color: "#f2fff1",
        fontStyle: "bold", stroke: "#17442d", strokeThickness: 1, resolution: 2
      }).setOrigin(0.5);
      this.addVolumeButton(420, y + 14, "−", () => this.changeVolume(channel, -5), GLASS.blue);
      this.add.text(560, y + 14, value + "%", {
        fontFamily: "Arial", fontSize: "22px", color: "#f2fff1",
        fontStyle: "bold", stroke: "#17442d", strokeThickness: 1, resolution: 2
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
    window.localStorage.setItem("farmVsMonsters.audio." + channel.key, String(next));
    this.drawCurrentMenu();
  }

  addVolumeButton(x, y, label, action, color) {
    const bg = this.add.rectangle(x, y, 54, 42, 0x17442d, 0.22)
      .setStrokeStyle(1, 0xf2fff1, 0.66).setInteractive({ useHandCursor: true });
    this.add.rectangle(x, y, 48, 36, color, 0.76)
      .setStrokeStyle(1, 0xffffff, 0.82);
    this.add.rectangle(x, y - 8, 40, 10, 0xffffff, 0.12);
    this.add.text(x, y - 1, label, {
      fontFamily: "Arial", fontSize: "28px", color: "#f2fff1",
      fontStyle: "bold", stroke: "#17442d", strokeThickness: 1, resolution: 2
    }).setOrigin(0.5);
    bg.on("pointerover", () => bg.setScale(1.06));
    bg.on("pointerout", () => bg.setScale(1));
    bg.on("pointerdown", action);
  }

  addMenuButton(y, label, color, action) {
    const bg = this.add.rectangle(560, y, 250, 52, 0x17442d, 0.22)
      .setStrokeStyle(1, 0xf2fff1, 0.72).setInteractive({ useHandCursor: true });
    this.add.rectangle(560, y, 242, 44, color, 0.78)
      .setStrokeStyle(1, 0xffffff, 0.86);
    this.add.rectangle(560, y - 13, 226, 10, 0xffffff, 0.12);
    this.add.text(560, y, this.tr(label), {
      fontFamily: "Arial", fontSize: "18px", color: "#f2fff1",
      fontStyle: "bold", stroke: "#17442d", strokeThickness: 1, resolution: 2
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
