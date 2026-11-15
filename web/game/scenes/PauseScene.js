import { Scene } from "phaser";
import { translate } from "../../app/LocaleProvider";

export default class PauseScene extends Scene {
  constructor() {
    super("PauseScene");
  }

  create() {
    const locale = typeof window !== "undefined" ? window.localStorage.getItem("farmVsMonsters.language") || "ar" : "ar";
    const tr = (value) => translate(value, locale);
    this.languageChangeHandler = () => {
      const currentLocale = window.localStorage.getItem("farmVsMonsters.language") || "ar";
      this.children.list.forEach((item) => {
        const key = item?.getData?.("localeKey");
        if (key && item.setText) item.setText(translate(key, currentLocale));
      });
    };
    window.addEventListener("farm-language-change", this.languageChangeHandler);
    this.events.once("shutdown", () => window.removeEventListener("farm-language-change", this.languageChangeHandler));
    this.add.rectangle(560, 340, 1120, 680, 0x160f0a, 0.72).setDepth(-1);
    this.add.rectangle(560, 340, 450, 420, 0x79502e, 1)
      .setStrokeStyle(7, 0x3b2517);
    this.add.rectangle(560, 340, 430, 400, 0xb88950, 1)
      .setStrokeStyle(2, 0xe5c68e);
    this.add.text(560, 195, tr("BATTLE PAUSED"), {
      fontFamily: "Georgia", fontSize: "31px", color: "#fff0c8",
      fontStyle: "bold", stroke: "#392417", strokeThickness: 4
    }).setOrigin(0.5).setData("localeKey", "BATTLE PAUSED");

    this.addMenuButton(270, "RESUME", 0x9bc66e, () => this.resumeBattle());
    this.addMenuButton(345, "RESTART", 0xe5c27d, () => this.restartBattle());
    this.addMenuButton(420, "SETTINGS", 0xe5c27d, () => {
      if (typeof window !== "undefined") window.location.assign("/settings");
    });
    this.addMenuButton(495, "MAIN MENU", 0xe6a17d, () => {
      if (typeof window !== "undefined") window.location.assign("/");
    });

    this.input.keyboard.on("keydown-ESC", this.resumeBattle, this);
    this.input.keyboard.on("keydown-P", this.resumeBattle, this);
    this.events.once("shutdown", () => {
      this.input.keyboard.off("keydown-ESC", this.resumeBattle, this);
      this.input.keyboard.off("keydown-P", this.resumeBattle, this);
    });
  }

  addMenuButton(y, label, color, action) {
    const bg = this.add.rectangle(560, y, 250, 52, 0x4b301e, 1)
      .setStrokeStyle(3, 0x392417).setInteractive({ useHandCursor: true });
    this.add.rectangle(560, y, 240, 44, color, 1).setStrokeStyle(1, 0xf4dfb3);
    const locale = typeof window !== "undefined" ? window.localStorage.getItem("farmVsMonsters.language") || "ar" : "ar";
    this.add.text(560, y, translate(label, locale), {
      fontFamily: "Georgia", fontSize: "16px", color: "#392719", fontStyle: "bold"
    }).setOrigin(0.5).setData("localeKey", label);
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
