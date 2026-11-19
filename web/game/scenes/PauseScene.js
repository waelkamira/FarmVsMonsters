import { Scene } from "phaser";
import { translate } from "../../app/LocaleProvider";

const AUDIO_CHANNELS = [
  { key: "musicVolume", label: "Background music", initial: 70 },
  { key: "effectsVolume", label: "Sound effects", initial: 80 },
  { key: "projectileVolume", label: "Projectile sounds", initial: 65 }
];

const GLASS = {
  panel: 0xe8d2a6,
  panelGlow: 0xb88950,
  green: 0x6f9b43,
  blue: 0xc99a56,
  violet: 0x8b704b,
  coral: 0xa95c42,
  gold: 0xe6bd68,
  white: 0xfff1d1
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
    // Parchment notice board mounted on a carved timber frame.
    this.add.rectangle(560, 340, 1120, 680, 0x172313, 0.66).setDepth(-1);
    this.add.rectangle(560, 340, 548, height + 30, 0x382315, 0.98)
      .setStrokeStyle(5, 0x241509, 1);
    this.add.rectangle(560, 340, 528, height + 10, 0xb88950, 1)
      .setStrokeStyle(3, 0xe3c18a, 1);
    this.add.rectangle(560, 340, 506, height - 12, 0xf0dfbb, 1)
      .setStrokeStyle(3, 0x8d6538, 1);
    this.add.rectangle(560, 340, 488, height - 30, 0xe5d0a6, 1)
      .setStrokeStyle(1, 0xc3a16b, 1);
    this.add.rectangle(560, 340 - height / 2 + 12, 474, 6, 0x9a7042, 1);
    this.add.text(560, 340 - height / 2 + 58, this.tr(title), {
      fontFamily: "Arial", fontSize: "32px", color: "#59391e",
      fontStyle: "bold", stroke: "#fff0ce", strokeThickness: 2, resolution: 2
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
      this.add.rectangle(560, y + 10, 390, 66, 0xfff4dc, 0.98)
        .setStrokeStyle(2, 0x9a7042, 0.95);
      this.add.text(560, y - 23, this.tr(channel.label), {
        fontFamily: "Arial", fontSize: "19px", color: "#51351d",
        fontStyle: "bold", stroke: "#fff0ce", strokeThickness: 1, resolution: 2
      }).setOrigin(0.5);
      this.addVolumeButton(420, y + 14, "−", () => this.changeVolume(channel, -5), GLASS.blue);
      this.add.text(560, y + 14, value + "%", {
        fontFamily: "Arial", fontSize: "22px", color: "#51351d",
        fontStyle: "bold", stroke: "#fff0ce", strokeThickness: 1, resolution: 2
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
    const bg = this.add.rectangle(x, y, 54, 42, 0x4b2e18, 1)
      .setStrokeStyle(2, 0x241509, 1).setInteractive({ useHandCursor: true });
    this.add.rectangle(x, y, 46, 34, color, 1)
      .setStrokeStyle(1, 0xffe9bd, 1);
    this.add.text(x, y - 1, label, {
      fontFamily: "Arial", fontSize: "28px", color: "#51351d",
      fontStyle: "bold", stroke: "#fff0ce", strokeThickness: 1, resolution: 2
    }).setOrigin(0.5);
    bg.on("pointerover", () => bg.setScale(1.06));
    bg.on("pointerout", () => bg.setScale(1));
    bg.on("pointerdown", action);
  }

  addMenuButton(y, label, color, action) {
    const bg = this.add.rectangle(560, y, 250, 52, 0x4b2e18, 1)
      .setStrokeStyle(2, 0x241509, 1).setInteractive({ useHandCursor: true });
    this.add.rectangle(560, y, 240, 44, color, 1)
      .setStrokeStyle(2, 0xffe9bd, 1);
    this.add.text(560, y, this.tr(label), {
      fontFamily: "Arial", fontSize: "18px", color: "#51351d",
      fontStyle: "bold", stroke: "#fff0ce", strokeThickness: 1, resolution: 2
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
