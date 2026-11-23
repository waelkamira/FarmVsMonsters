/**
 * Battle HUD button layout.
 *
 * Keep every in-battle action shortcut in this one registry so the right-side
 * column can be reordered or resized without hunting through BattleScene.
 * Coordinates are in the fixed 1120 × 680 Phaser game-space.
 */
export const BATTLE_HUD_BUTTONS = Object.freeze([
  { key: "pauseControl", label: "pause", y: 82 },
  { key: "settingsControl", label: "settings", y: 130 },
  { key: "speedControl", label: "speed", y: 178 },
  { key: "audioButton", label: "audio", y: 226 },
  { key: "collectionMenuControl", label: "farm-journal", y: 274 },
  { key: "inventoryControl", label: "inventory", y: 322 },
  { key: "quickPlantsButton", label: "plants", y: 370 },
  { key: "quickAdventuresButton", label: "adventures", y: 418 },
  { key: "quickMonstersButton", label: "monsters", y: 466 }
]);

export const BATTLE_HUD_BUTTON_X = 1080;

export function layoutBattleHudButtons(scene) {
  if (!scene) return [];

  const positioned = [];
  for (const definition of BATTLE_HUD_BUTTONS) {
    const button = scene[definition.key];
    if (!button?.active) continue;
    button.setPosition(BATTLE_HUD_BUTTON_X, definition.y);
    button.setDepth?.(72);
    positioned.push(definition.key);
  }

  // The audio popover opens inward, left of the button column. Keep its
  // dismissal hit area aligned with the relocated speaker button.
  if (scene.audioMenu?.active) {
    scene.audioMenu.setPosition(930, 350);
  }
  scene.audioMenuBounds = { left: 800, right: 1060, top: 230, bottom: 470 };
  scene.audioButtonBounds = { left: 1056, right: 1120, top: 202, bottom: 250 };

  return positioned;
}

function createAudioControls() {
    // A single speaker button keeps the battle HUD clean. All audio options
    // live in one compact popover anchored to this button.
    this.audioMenuBounds = { left: 860, right: 1120, top: 66, bottom: 300 };
    this.audioMenuOpen = false;
    this.audioMenuDismissedOnPointerDown = false;

    this.audioMenu = this.add.container(990, 183).setDepth(70).setVisible(false);
    // Make the menu surface consume clicks so its empty areas never behave
    // like clicks on the battlefield underneath it.
    const panelGlow = this.add.rectangle(0, 0, 258, 228, 0x8b65e8, 0.16)
      .setStrokeStyle(1, 0xffffff, 0.42);
    const panel = this.add.rectangle(0, 0, 250, 220, 0x315b91, 0.64)
      .setStrokeStyle(1, 0xffffff, 0.76)
      .setInteractive();
    const inset = this.add.rectangle(0, 0, 236, 206, 0x35bceb, 0.12)
      .setStrokeStyle(1, 0xa7e84f, 0.42);
    const heading = this.add.text(0, -91, this.translate("TRIBE SOUND", window.localStorage.getItem("farmVsMonsters.language") || "ar"), {
      fontFamily: "Arial", fontSize: "15px", color: "#ffffff", fontStyle: "bold",
      stroke: "#17213d", strokeThickness: 3
    }).setOrigin(0.5).setData("localeKey", "TRIBE SOUND");
    this.audioMenu.add([panelGlow, panel, inset, heading]);

    this.musicAudioOption = this.createAudioVolumeSlider(-49, "Music", this.musicVolume, (value) => {
      this.musicVolume = value;
      this.musicEnabled = value > 0;
      if (this.musicEnabled) {
        this.startBackgroundMusic();
        this.resumeGameAudio();
      } else {
        this.stopBackgroundMusic();
      }
    });
    this.effectsAudioOption = this.createAudioVolumeSlider(17, "Effects", this.effectsVolume, (value) => {
      this.effectsVolume = value;
      this.effectsSoundEnabled = value > 0;
    });
    this.projectileAudioOption = this.createAudioVolumeSlider(83, "Projectiles", this.projectileVolume, (value) => {
      this.projectileVolume = value;
      this.projectileSoundEnabled = value > 0;
    });
    this.audioMenu.add([
      this.musicAudioOption.container,
      this.effectsAudioOption.container,
      this.projectileAudioOption.container
    ]);
    this.input.on("pointermove", (pointer) => {
      if (pointer.isDown && this.activeAudioSlider) this.activeAudioSlider(pointer);
    });
    this.input.on("pointerup", () => { this.activeAudioSlider = null; });

    this.audioButton = this.add.container(1100, 27).setDepth(52);
    const buttonHalo = this.add.circle(0, 1, 18, 0x1b1008, 0.32);
    const buttonBackground = this.add.circle(0, 0, 16, 0x9b6b39, 1).setStrokeStyle(2.5, 0xe6c58c, 1);
    const speaker = this.add.graphics();
    speaker.fillStyle(0x4b2e16, 1);
    speaker.fillRoundedRect(-11, -6, 7, 12, 2);
    speaker.fillTriangle(-5, -7, 5, -14, 5, 14);
    speaker.fillTriangle(-5, 7, 5, 14, 5, -14);
    speaker.lineStyle(2, 0x4b2e16, 1);
    speaker.beginPath();
    speaker.arc(3, 0, 10, -0.85, 0.85, false);
    speaker.strokePath();
    this.audioButton.add([buttonHalo, buttonBackground, speaker]);
    buttonBackground.setInteractive({ useHandCursor: true });
    buttonBackground.on("pointerover", () => buttonBackground.setFillStyle(0xffdf8a, 1));
    buttonBackground.on("pointerout", () => buttonBackground.setFillStyle(0xe6c58c, 1));
    buttonBackground.on("pointerdown", () => {
      if (this.audioMenuOpen) this.closeAudioMenu();
      else this.openAudioMenu();
    });

    this.input.on("pointerdown", (pointer) => {
      if (!this.audioMenuOpen) return;
      const inMenu = pointer.x >= this.audioMenuBounds.left &&
        pointer.x <= this.audioMenuBounds.right &&
        pointer.y >= this.audioMenuBounds.top &&
        pointer.y <= this.audioMenuBounds.bottom;
      const buttonBounds = this.audioButtonBounds;
      const inButton = buttonBounds && pointer.x >= buttonBounds.left &&
        pointer.x <= buttonBounds.right && pointer.y >= buttonBounds.top &&
        pointer.y <= buttonBounds.bottom;
      if (!inMenu && !inButton) {
        // The same outside click must only dismiss the menu; it must not
        // also trigger planting or another battlefield action.
        this.audioMenuDismissedOnPointerDown = true;
        this.closeAudioMenu();
      }
    });

    if (this.musicEnabled) this.startBackgroundMusic();
  }

function createAudioVolumeSlider(y, title, initialValue, onChange) {
    const container = this.add.container(0, y);
    const label = this.add.text(-101, -10, this.translate(title, window.localStorage.getItem("farmVsMonsters.language") || "ar"), {
      fontFamily: "Arial", fontSize: "11px", color: "#ffffff", fontStyle: "bold", stroke: "#17213d", strokeThickness: 2
    }).setOrigin(0, 0.5).setData("localeKey", title);
    const track = this.add.rectangle(5, 12, 132, 8, 0xffffff, 0.24).setStrokeStyle(1, 0xffffff, 0.46).setInteractive({ useHandCursor: true });
    const fill = this.add.rectangle(-61, 12, 0, 5, 0xa7e84f, 1).setOrigin(0, 0.5);
    const knob = this.add.circle(-61, 12, 8, 0xffca45, 0.9)
      .setStrokeStyle(1, 0xffffff, 0.9).setInteractive({ useHandCursor: true });
    const valueText = this.add.text(96, -10, Math.round(initialValue) + "%", {
      fontFamily: "Arial", fontSize: "11px", color: "#ffffff", fontStyle: "bold", stroke: "#17213d", strokeThickness: 2
    }).setOrigin(1, 0.5);
    container.add([label, track, fill, knob, valueText]);

    const setValue = (rawValue, persist = true) => {
      const value = Math.round(Math.max(0, Math.min(100, rawValue)));
      const knobX = -61 + value * 1.32;
      knob.setX(knobX);
      fill.width = value * 1.32;
      valueText.setText(value + "%");
      onChange(value);
      if (persist) {
        this.saveAudioPreferences();
        this.resumeGameAudio();
      }
    };
    const setFromPointer = (pointer) => setValue((pointer.x - (this.audioMenu.x - 61)) / 1.32);
    track.on("pointerdown", (pointer) => {
      this.activeAudioSlider = setFromPointer;
      setFromPointer(pointer);
    });
    knob.on("pointerdown", (pointer) => {
      this.activeAudioSlider = setFromPointer;
      setFromPointer(pointer);
    });
    track.on("pointerover", () => track.setFillStyle(0x35bceb, 1));
    setValue(initialValue, false);
    return { container };
  }

function openAudioMenu() {
    this.audioMenuOpen = true;
    this.audioMenu.setVisible(true);
    this.audioMenu.setScale(0.96);
    this.tweens.add({ targets: this.audioMenu, scale: 1, duration: 100, ease: "Back.Out" });
  }

function closeAudioMenu() {
    if (!this.audioMenuOpen) return;
    this.saveAudioPreferences();
    this.audioMenuOpen = false;
    this.audioMenu.setVisible(false);
  }

function createQuickCollectionButtons() {
    // Three independent floating shortcuts; deliberately no enclosing card or dock.
    const makeButton = (x, kind, tint, tab) => {
      const button = this.add.container(x, 625).setDepth(51);
      const shadow = this.add.circle(0, 2, 23, 0x17100a, 0.38);
      const rim = this.add.circle(0, 0, 21, 0x80552f, 1)
        .setStrokeStyle(2.4, 0xf1d08b, 1);
      const face = this.add.circle(0, 0, 16.5, tint, 1)
        .setStrokeStyle(1, 0xfff0c8, 0.92)
        .setInteractive({ useHandCursor: true });
      const icon = this.add.graphics();
      icon.lineStyle(2.3, 0xfff8e8, 1);
      if (kind === "plants") {
        icon.lineBetween(0, 11, 0, -2);
        icon.lineBetween(0, 2, -8, -6);
        icon.lineBetween(0, -1, 8, -9);
        icon.strokeEllipse(-7, -7, 10, 7);
        icon.strokeEllipse(7, -10, 10, 7);
        icon.lineBetween(-9, 12, 9, 12);
      } else if (kind === "adventures") {
        icon.strokeRoundedRect(-10, -11, 20, 23, 3);
        icon.lineBetween(-5, -5, 5, -5);
        icon.lineBetween(-5, 0, 3, 0);
        icon.lineBetween(-5, 5, 5, 5);
        icon.fillStyle(0xffd66f, 1);
        icon.fillCircle(7, -8, 2.2);
      } else {
        icon.fillStyle(0xfff8e8, 1);
        icon.fillRoundedRect(-10, -8, 20, 17, 5);
        icon.fillCircle(-6, -9, 4);
        icon.fillCircle(0, -12, 4);
        icon.fillCircle(6, -9, 4);
        icon.fillStyle(0x56351f, 1);
        icon.fillCircle(-4, 0, 2);
        icon.fillCircle(4, 0, 2);
        icon.fillTriangle(-3, 5, 3, 5, 0, 8);
      }
      button.add([shadow, rim, face, icon]);
      face.on("pointerover", () => {
        face.setFillStyle(0xffdf8a);
        button.setScale(1.08);
      });
      face.on("pointerout", () => {
        face.setFillStyle(tint);
        button.setScale(1);
      });
      face.on("pointerdown", () => this.openCollectionMenuTab(tab));
      return button;
    };

    this.quickPlantsButton = makeButton(958, "plants", 0x328b55, "plants");
    this.quickAdventuresButton = makeButton(1028, "adventures", 0x397fb0, "phases");
    this.quickMonstersButton = makeButton(1098, "monsters", 0x7952a8, "monsters");
  }

function createCollectionMenuControl() {
    // Compact journal emblem matching the floating battle shortcuts.
    const button = this.add.container(956, 27).setDepth(52);
    const shadow = this.add.circle(0, 2, 18, 0x17100a, 0.34);
    const rim = this.add.circle(0, 0, 16, 0x80552f, 1)
      .setStrokeStyle(2.2, 0xf1d08b, 1);
    const face = this.add.circle(0, 0, 12.5, 0x477a55, 1)
      .setStrokeStyle(1, 0xfff0c8, 0.9)
      .setInteractive({ useHandCursor: true });
    const book = this.add.graphics();
    book.lineStyle(1.8, 0xfff8e8, 1);
    book.strokeRoundedRect(-8, -7, 7, 14, 1.5);
    book.strokeRoundedRect(1, -7, 7, 14, 1.5);
    book.lineBetween(0, -6, 0, 7);
    book.lineBetween(-6, -3, -3, -3);
    book.lineBetween(3, -3, 6, -3);
    button.add([shadow, rim, face, book]);
    face.on("pointerover", () => {
      face.setFillStyle(0x6ba66d);
      button.setScale(1.07);
    });
    face.on("pointerout", () => {
      face.setFillStyle(0x477a55);
      button.setScale(1);
    });
    face.on("pointerdown", () => this.toggleCollectionMenu());
    this.collectionMenuControl = button;
    this.collectionMenuOpen = false;
  }

function createInventoryControl() {
    const button = this.add.container(920, 27).setDepth(52);
    const plate = this.add.circle(0, 0, 16, 0x9b6b39, 1)
      .setStrokeStyle(2.5, 0xe6c58c, 1).setInteractive({ useHandCursor: true });
    const icon = this.add.graphics();
    icon.lineStyle(2.4, 0x4b2e16, 1);
    icon.strokeRoundedRect(-9, -7, 18, 18, 4);
    icon.lineBetween(-5, -7, -3, -13);
    icon.lineBetween(-3, -13, 3, -13);
    icon.lineBetween(3, -13, 5, -7);
    icon.lineBetween(-4, 0, 4, 0);
    button.add([plate, icon]);
    plate.on("pointerover", () => plate.setFillStyle(0xffdf8a, 1).setScale(1.05));
    plate.on("pointerout", () => plate.setFillStyle(0xe6c58c, 1).setScale(1));
    plate.on("pointerdown", () => this.openInventory());
    this.inventoryControl = button;
    this.inventoryOpen = false;
  }

function createPauseControl() {
    const button = this.add.container(1028, 27).setDepth(52);
    const artwork = this.textures.exists("hud-pause-button")
      ? this.add.image(0, 0, "hud-pause-button").setDisplaySize(34, 34)
      : this.add.circle(0, 0, 16, 0x9b6b39, 1).setStrokeStyle(2.5, 0xe6c58c, 1);
    artwork.setInteractive({ useHandCursor: true });
    button.add(artwork);
    artwork.on("pointerover", () => button.setScale(1.07));
    artwork.on("pointerout", () => button.setScale(1));
    artwork.on("pointerdown", () => this.pauseGame());
    this.pauseControl = button;
  }

function createSettingsControl() {
    const button = this.add.container(1064, 27).setDepth(52);
    const artwork = this.textures.exists("hud-settings-button")
      ? this.add.image(0, 0, "hud-settings-button").setDisplaySize(34, 34)
      : this.add.circle(0, 0, 16, 0x9b6b39, 1).setStrokeStyle(2.5, 0xe6c58c, 1);
    artwork.setInteractive({ useHandCursor: true });
    button.add(artwork);
    artwork.on("pointerover", () => button.setScale(1.07));
    artwork.on("pointerout", () => button.setScale(1));
    artwork.on("pointerdown", () => this.openSettingsMenu());
    this.settingsControl = button;
  }

function createSpeedControl() {
    this.gameSpeed = 1;
    const button = this.add.container(992, 27).setDepth(52);
    const artwork = this.textures.exists("hud-speed-button")
      ? this.add.image(0, 0, "hud-speed-button").setDisplaySize(34, 34)
      : this.add.circle(0, 0, 16, 0x9b6b39, 1).setStrokeStyle(2.5, 0xe6c58c, 1);
    const speedLabel = this.add.text(0, 21, "1×", {
      fontFamily: "Arial", fontSize: "9px", color: "#fff4c8", fontStyle: "bold",
      stroke: "#392719", strokeThickness: 2
    }).setOrigin(0.5).setDepth(49);
    artwork.setInteractive({ useHandCursor: true });
    button.add([artwork, speedLabel]);
    artwork.on("pointerover", () => button.setScale(1.07));
    artwork.on("pointerout", () => button.setScale(1));
    artwork.on("pointerdown", () => {
      this.gameSpeed = this.gameSpeed === 1 ? 1.5 : 1;
      if (this.game?.loop) this.game.loop.timeScale = this.gameSpeed;
      speedLabel.setText(this.gameSpeed === 1 ? "1×" : "1.5×");
    });
    this.speedControl = button;
    this.events.once("shutdown", () => {
      if (this.game?.loop) this.game.loop.timeScale = 1;
    });
  }

/**
 * Single entry point for creating and positioning the complete battle button set.
 * Button behavior stays on the BattleScene instance; this module owns the HUD
 * assembly order and the shared right-column layout.
 */
export function createBattleHudButtons(scene, translateFn) {
  scene.translate = translateFn;
  const methods = [
    createAudioControls,
    createAudioVolumeSlider,
    openAudioMenu,
    closeAudioMenu,
    createPauseControl,
    createSettingsControl,
    createSpeedControl,
    createCollectionMenuControl,
    createInventoryControl,
    createQuickCollectionButtons
  ];
  for (const method of methods) scene[method.name] = method.bind(scene);
  scene.createAudioControls();
  scene.createPauseControl();
  scene.createSettingsControl();
  scene.createSpeedControl();
  scene.createCollectionMenuControl();
  scene.createInventoryControl();
  scene.createQuickCollectionButtons();
  return layoutBattleHudButtons(scene);
}
