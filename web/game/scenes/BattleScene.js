import { Scene, Input, Math as PhaserMath } from "phaser";
import gridCalibration from "../data/farm-grid-calibration.json";

const LANES = gridCalibration.grid.rows;
const COLUMNS = gridCalibration.grid.columns;
const GRID_NODES = gridCalibration.grid.controlPoints;
const GRID_WIDTH = GRID_NODES[0][COLUMNS].x - GRID_NODES[0][0].x;
const GRID_HEIGHT = GRID_NODES[LANES][0].y - GRID_NODES[0][0].y;
const GRID_CENTER_X = (GRID_NODES[0][0].x + GRID_NODES[LANES][COLUMNS].x) / 2;
const GRID_CENTER_Y = (GRID_NODES[0][0].y + GRID_NODES[LANES][0].y) / 2;
const CELL_W = GRID_WIDTH / COLUMNS;
const CELL_H = GRID_HEIGHT / LANES;
const HOME_LOCAL_X = -300;
const SPAWN_LOCAL_X = 330;
const RADISH = { label: "Radish", cost: 35, hp: 110, cooldown: 1450, range: 360 };

export default class BattleScene extends Scene {
  constructor() { super("BattleScene"); }

  preload() {
    this.load.image("farm-battlefield", "/assets/backgrounds/farm-battlefield.jpeg");
    this.load.on("loaderror", (file) => {
      if (file.key === "farm-battlefield") this.backgroundAssetFailed = true;
    });
  }

  create() {
    this.energy = 150;
    this.houseHealth = 100;
    this.wave = 1;
    this.spawnedThisWave = 0;
    this.waveSize = 5;
    this.spawnTimer = 1800;
    this.energyTimer = 0;
    this.selectedPlant = false;
    this.plants = [];
    this.monsters = [];
    this.projectiles = [];
    this.laneYs = Array.from({ length: LANES }, (_, row) => this.gridCellCenter(0, row).y);
    this.emergencyMode = false;
    this.hasPlantedDefender = false;
    this.facing = 1;
    this.plantingTarget = null;
    this.returnTarget = null;
    this.gameOver = false;
    const legacySoundSetting = this.registry.get("soundEnabled");
    if (this.registry.get("projectileSoundEnabled") === undefined) {
      this.registry.set("projectileSoundEnabled", legacySoundSetting === undefined ? true : legacySoundSetting);
    }
    if (this.registry.get("effectsSoundEnabled") === undefined) {
      this.registry.set("effectsSoundEnabled", legacySoundSetting === undefined ? true : legacySoundSetting);
    }
    if (this.registry.get("musicEnabled") === undefined) this.registry.set("musicEnabled", true);
    this.projectileSoundEnabled = this.registry.get("projectileSoundEnabled");
    this.effectsSoundEnabled = this.registry.get("effectsSoundEnabled");
    this.musicEnabled = this.registry.get("musicEnabled");
    this.musicStep = 0;
    this.musicTimer = null;

    this.drawField();
    this.createFarmBackground();
    this.drawPlantingGrid();
    this.createHud();
    this.createAudioControls();
    this.createCaveman();
    this.bindInput();
    this.refreshHud();
    this.setMessage(this.textures.exists("farm-battlefield")
      ? "Choose the radish icon, then click an empty soil cell."
      : "Temporary farm art active. Add farm-battlefield.jpeg when your background is ready.");
  }

  drawField() {
    // Fallback art only. When the uploaded background loads it is rendered above this layer.
    const g = this.add.graphics().setDepth(-10);
    g.fillGradientStyle(0xb9d98a, 0xb9d98a, 0x8dbb69, 0x8dbb69, 1);
    g.fillRect(0, 0, 1120, 680);
    g.fillStyle(0x8a603b, 1); g.fillRoundedRect(185, 115, 690, 500, 24);
    g.fillStyle(0x9c7047, 1); g.fillRoundedRect(195, 125, 670, 480, 18);

    // Draw the fallback board with the same perspective corners as the real artwork.
    const point = (u, v) => this.boardPoint(u, v);
    for (let row = 0; row < LANES; row += 1) {
      for (let col = 0; col < COLUMNS; col += 1) {
        const u0 = col / COLUMNS, u1 = (col + 1) / COLUMNS;
        const v0 = row / LANES, v1 = (row + 1) / LANES;
        const cell = [point(u0, v0), point(u1, v0), point(u1, v1), point(u0, v1)];
        g.fillStyle(row % 2 === 0 ? 0xb88b5b : 0xad8050, 0.9);
        g.fillPoints(cell, true);
        g.lineStyle(2, 0xe4c18b, 0.65);
        g.strokePoints(cell, true);
      }
    }
    g.fillStyle(0xe8d5a8, 1); g.fillRoundedRect(28, 385, 132, 150, 12);
    g.fillStyle(0x9b573c, 1); g.fillTriangle(18, 390, 94, 320, 170, 390);
    g.fillStyle(0x65452f, 1); g.fillRect(78, 465, 34, 70);
    g.fillStyle(0xf3c96d, 1); g.fillCircle(145, 345, 12);
    g.fillStyle(0xf0d6a5, 1); g.fillTriangle(145, 354, 130, 380, 160, 380);
    g.fillStyle(0x9b4d58, 1); g.fillCircle(145, 342, 15);
    g.fillStyle(0xf3c96d, 1); g.fillCircle(145, 346, 9);
    this.add.text(145, 386, "PRINCESS", { fontFamily: "Arial", fontSize: "10px", color: "#fff4d4", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(94, 555, "FARMHOUSE", { fontFamily: "Arial", fontSize: "13px", color: "#fff3d4", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(1000, 95, "MONSTER GATE", { fontFamily: "Arial", fontSize: "13px", color: "#563c2c", fontStyle: "bold" }).setOrigin(0.5);
  }

  createFarmBackground() {
    if (!this.textures.exists("farm-battlefield")) return;

    // Keep environment artwork separate from interactive gameplay objects.
    // Fit the 16:9 image inside the current viewport without stretching it.
    this.farmBackground = this.add.image(560, 340, "farm-battlefield")
      .setDisplaySize(1120, 597.33).setPosition(560, 340)
      .setDepth(-5);

    // The uploaded artwork already contains the farmhouse and garden props.
    // Remove temporary vector labels so they do not float over the real art.
    this.children.list
      .filter((child) => child.type === "Text" && ["PRINCESS", "FARMHOUSE", "MONSTER GATE"].includes(child.text))
      .forEach((child) => child.destroy());
  }

  // Piecewise-bilinear mapping over the 9 × 6 artwork control-node mesh.
  // Every cell is mapped independently, so measured intersections need not form
  // one mathematically perfect quadrilateral.
  boardPoint(u, v) {
    // Keep the mesh exact inside the board, but extrapolate beyond its outer
    // perimeter so monsters can enter from the right and approach the house.
    if (u < 0 || u > 1 || v < 0 || v > 1) {
      const tl = GRID_NODES[0][0];
      const tr = GRID_NODES[0][COLUMNS];
      const br = GRID_NODES[LANES][COLUMNS];
      const bl = GRID_NODES[LANES][0];
      return {
        x: (1-u)*(1-v)*tl.x + u*(1-v)*tr.x + u*v*br.x + (1-u)*v*bl.x,
        y: (1-u)*(1-v)*tl.y + u*(1-v)*tr.y + u*v*br.y + (1-u)*v*bl.y,
      };
    }
    const safeU = Math.min(u, 1 - Number.EPSILON);
    const safeV = Math.min(v, 1 - Number.EPSILON);
    const col = Math.min(COLUMNS - 1, Math.floor(safeU * COLUMNS));
    const row = Math.min(LANES - 1, Math.floor(safeV * LANES));
    const localU = safeU * COLUMNS - col;
    const localV = safeV * LANES - row;
    return this.interpolateCell(col, row, localU, localV);
  }

  interpolateCell(col, row, u, v) {
    const tl = GRID_NODES[row][col];
    const tr = GRID_NODES[row][col + 1];
    const br = GRID_NODES[row + 1][col + 1];
    const bl = GRID_NODES[row + 1][col];
    return {
      x: (1-u)*(1-v)*tl.x + u*(1-v)*tr.x + u*v*br.x + (1-u)*v*bl.x,
      y: (1-u)*(1-v)*tl.y + u*(1-v)*tr.y + u*v*br.y + (1-u)*v*bl.y,
    };
  }

  cellPolygon(col, row) {
    return [
      GRID_NODES[row][col],
      GRID_NODES[row][col + 1],
      GRID_NODES[row + 1][col + 1],
      GRID_NODES[row + 1][col],
    ];
  }

  pointInPolygon(x, y, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
      const a = polygon[i];
      const b = polygon[j];
      const crosses = ((a.y > y) !== (b.y > y)) &&
        (x < ((b.x - a.x) * (y - a.y)) / ((b.y - a.y) || 0.000001) + a.x);
      if (crosses) inside = !inside;
    }
    return inside;
  }

  boardCoordinates(x, y) {
    // Find the actual cell first, then invert only that cell's bilinear transform.
    for (let row = 0; row < LANES; row += 1) {
      for (let col = 0; col < COLUMNS; col += 1) {
        const polygon = this.cellPolygon(col, row);
        if (!this.pointInPolygon(x, y, polygon)) continue;
        let u = 0.5;
        let v = 0.5;
        for (let i = 0; i < 10; i += 1) {
          const p = this.interpolateCell(col, row, u, v);
          const pu = this.interpolateCell(col, row, u + 0.001, v);
          const pv = this.interpolateCell(col, row, u, v + 0.001);
          const ax = (pu.x - p.x) / 0.001;
          const ay = (pu.y - p.y) / 0.001;
          const bx = (pv.x - p.x) / 0.001;
          const by = (pv.y - p.y) / 0.001;
          const ex = x - p.x;
          const ey = y - p.y;
          const det = ax * by - bx * ay;
          if (Math.abs(det) < 0.0001) break;
          u += (ex * by - ey * bx) / det;
          v += (ey * ax - ex * ay) / det;
        }
        return { u: (col + u) / COLUMNS, v: (row + v) / LANES, inside: true };
      }
    }

    // Outside-board coordinates are still needed for monster approach/departure.
    // Use the outer mesh boundary as a stable extrapolation for lane movement only.
    const tl = GRID_NODES[0][0];
    const tr = GRID_NODES[0][COLUMNS];
    const br = GRID_NODES[LANES][COLUMNS];
    const bl = GRID_NODES[LANES][0];
    let u = (x - bl.x) / (br.x - bl.x || 1);
    let v = (y - tl.y) / (bl.y - tl.y || 1);
    for (let i = 0; i < 10; i += 1) {
      const p = {
        x: (1-u)*(1-v)*tl.x + u*(1-v)*tr.x + u*v*br.x + (1-u)*v*bl.x,
        y: (1-u)*(1-v)*tl.y + u*(1-v)*tr.y + u*v*br.y + (1-u)*v*bl.y,
      };
      const pu = {
        x: (1-(u+0.001))*(1-v)*tl.x + (u+0.001)*(1-v)*tr.x + (u+0.001)*v*br.x + (1-(u+0.001))*v*bl.x,
        y: (1-(u+0.001))*(1-v)*tl.y + (u+0.001)*(1-v)*tr.y + (u+0.001)*v*br.y + (1-(u+0.001))*v*bl.y,
      };
      const pv = {
        x: (1-u)*(1-(v+0.001))*tl.x + u*(1-(v+0.001))*tr.x + u*(v+0.001)*br.x + (1-u)*(v+0.001)*bl.x,
        y: (1-u)*(1-(v+0.001))*tl.y + u*(1-(v+0.001))*tr.y + u*(v+0.001)*br.y + (1-u)*(v+0.001)*bl.y,
      };
      const ax = (pu.x - p.x) / 0.001, ay = (pu.y - p.y) / 0.001;
      const bx = (pv.x - p.x) / 0.001, by = (pv.y - p.y) / 0.001;
      const ex = x - p.x, ey = y - p.y;
      const det = ax * by - bx * ay;
      if (Math.abs(det) < 0.0001) break;
      u += (ex * by - ey * bx) / det;
      v += (ey * ax - ex * ay) / det;
    }
    return { u, v, inside: false };
  }

  gridToWorld(col, row, offsetX = 0, offsetY = 0) {
    return this.interpolateCell(
      col,
      row,
      PhaserMath.Clamp(offsetX / CELL_W, 0, 1),
      PhaserMath.Clamp(offsetY / CELL_H, 0, 1),
    );
  }

  gridCellCenter(col, row) {
    const polygon = this.cellPolygon(col, row);
    let twiceArea = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < polygon.length; i += 1) {
      const current = polygon[i];
      const next = polygon[(i + 1) % polygon.length];
      const cross = current.x * next.y - next.x * current.y;
      twiceArea += cross;
      cx += (current.x + next.x) * cross;
      cy += (current.y + next.y) * cross;
    }
    if (Math.abs(twiceArea) < 0.0001) {
      return this.interpolateCell(col, row, 0.5, 0.5);
    }
    const areaFactor = 1 / (3 * twiceArea);
    return { x: cx * areaFactor, y: cy * areaFactor };
  }

  plantingCellCenter(col, row) {
    const center = this.gridCellCenter(col, row);
    // Raise only planting anchors in the top three rows; keep lane geometry
    // and monster movement on the original calibrated polygon centers.
    return { x: center.x, y: center.y - (row < 3 ? 5 : 0) };
  }

  worldToGrid(x, y) {
    for (let row = 0; row < LANES; row += 1) {
      for (let col = 0; col < COLUMNS; col += 1) {
        if (this.pointInPolygon(x, y, this.cellPolygon(col, row))) return { col, row };
      }
    }
    return { col: -1, row: -1 };
  }

  lanePoint(localX, row) {
    const u = (localX + GRID_WIDTH / 2) / GRID_WIDTH;
    const v = (row + 0.5) / LANES;
    return this.boardPoint(u, v);
  }

  worldToLane(point) {
    const { u, v } = this.boardCoordinates(point.x, point.y);
    return {
      localX: u * GRID_WIDTH - GRID_WIDTH / 2,
      localY: v * GRID_HEIGHT - GRID_HEIGHT / 2,
    };
  }

  drawPlantingGrid() {
    // The planting mesh is a logical interaction surface only.
    // The background artwork already contains the visible soil grid,
    // so never draw a second grid, tint, debug node, or centroid marker.
    this.plantingGrid = null;
  }

  createHud() {
    this.add.rectangle(560, 34, 1080, 56, 0x263c2b, 0.92).setStrokeStyle(2, 0xe4d5a5);
    this.hudText = this.add.text(28, 18, "", { fontFamily: "Arial", fontSize: "17px", color: "#fff7df", fontStyle: "bold" });
    this.waveText = this.add.text(1090, 18, "", { fontFamily: "Arial", fontSize: "17px", color: "#fff7df", fontStyle: "bold" }).setOrigin(1, 0);
    this.messageText = this.add.text(560, 645, "", {
      fontFamily: "Arial", fontSize: "16px", color: "#fff7df",
      backgroundColor: "#263c2b", padding: { x: 14, y: 7 }, align: "center"
    }).setOrigin(0.5, 1);

    const card = this.add.container(92, 78).setDepth(40);
    const panel = this.add.rectangle(0, 0, 132, 58, 0xf4dfb3, 1).setStrokeStyle(3, 0x65452f).setInteractive({ useHandCursor: true });
    const icon = this.add.graphics();
    icon.fillStyle(0xc83e45, 1); icon.fillEllipse(-35, 0, 24, 29);
    icon.fillStyle(0x4b8c45, 1); icon.fillTriangle(-39, -14, -31, -29, -25, -13);
    icon.fillTriangle(-36, -15, -18, -24, -26, -9);
    card.add([panel, icon,
      this.add.text(-13, -10, "RADISH", { fontFamily: "Arial", fontSize: "14px", color: "#563a25", fontStyle: "bold" }),
      this.add.text(-13, 9, "35 energy", { fontFamily: "Arial", fontSize: "11px", color: "#72583c" })
    ]);
    panel.on("pointerdown", () => {
      if (this.gameOver) return;
      this.selectedPlant = true;
      panel.setFillStyle(0xd9efbd, 1);
      this.setMessage("Radish selected. Click an empty soil cell; the caveman will walk there and plant it.");
      this.refreshHud();
    });
    this.radishCard = panel;
  }

  createCaveman() {
    this.caveman = this.add.container(220, this.laneYs[2]);
    const body = this.add.graphics();
    body.fillStyle(0x7a4c2c, 1); body.fillEllipse(0, 16, 38, 52);
    body.fillStyle(0xe7ad75, 1); body.fillCircle(0, -17, 21);
    body.fillStyle(0x382b22, 1); body.fillRoundedRect(-20, -38, 40, 13, 6);
    body.fillStyle(0xffffff, 1); body.fillCircle(-7, -20, 5); body.fillCircle(7, -20, 5);
    body.fillStyle(0x2b211c, 1); body.fillCircle(-7, -20, 2); body.fillCircle(7, -20, 2);
    body.lineStyle(7, 0x80512e, 1); body.lineBetween(15, 0, 35, -25);
    body.lineStyle(10, 0x68452a, 1); body.lineBetween(32, -29, 48, -40);
    this.caveman.add(body); this.caveman.setDepth(20);
    this.cavemanLabel = this.add.text(220, this.laneYs[2] + 32, "CAVEMAN", {
      fontFamily: "Arial", fontSize: "10px", color: "#fff4d4", fontStyle: "bold"
    }).setOrigin(0.5);
  }

  createAudioControls() {
    this.projectileSoundButton = this.createAudioToggle(710, "SHOTS", this.projectileSoundEnabled, (enabled) => {
      this.projectileSoundEnabled = enabled;
      this.registry.set("projectileSoundEnabled", enabled);
    });
    this.effectsSoundButton = this.createAudioToggle(825, "EFFECTS", this.effectsSoundEnabled, (enabled) => {
      this.effectsSoundEnabled = enabled;
      this.registry.set("effectsSoundEnabled", enabled);
    });
    this.musicButton = this.createAudioToggle(940, "MUSIC", this.musicEnabled, (enabled) => {
      this.musicEnabled = enabled;
      this.registry.set("musicEnabled", enabled);
      if (enabled) {
        this.startBackgroundMusic();
        this.resumeGameAudio();
      } else {
        this.stopBackgroundMusic();
      }
    });
    if (this.musicEnabled) this.startBackgroundMusic();
  }

  createAudioToggle(x, title, initialValue, onChange) {
    const button = this.add.container(x, 34).setDepth(45);
    const background = this.add.rectangle(0, 0, 104, 34, initialValue ? 0xd9efbd : 0xe7c6bd, 1)
      .setStrokeStyle(2, 0x65452f)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(0, 0, title + (initialValue ? ": ON" : ": OFF"), {
      fontFamily: "Arial", fontSize: "11px", color: "#563a25", fontStyle: "bold"
    }).setOrigin(0.5);
    button.add([background, label]);
    background.on("pointerover", () => background.setScale(1.04));
    background.on("pointerout", () => background.setScale(1));
    background.on("pointerdown", () => {
      const enabled = label.text.endsWith("OFF");
      onChange(enabled);
      label.setText(title + (enabled ? ": ON" : ": OFF"));
      background.setFillStyle(enabled ? 0xd9efbd : 0xe7c6bd, 1);
      this.resumeGameAudio();
    });
    return button;
  }

  resumeGameAudio() {
    const audioContext = this.sound && this.sound.context;
    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
  }

  startBackgroundMusic() {
    if (!this.musicEnabled || this.musicTimer) return;
    this.musicTimer = this.time.addEvent({
      delay: 520,
      loop: true,
      callback: () => this.playBackgroundMusicStep()
    });
    this.playBackgroundMusicStep();
  }

  stopBackgroundMusic() {
    if (this.musicTimer) {
      this.musicTimer.remove(false);
      this.musicTimer = null;
    }
  }

  playBackgroundMusicStep() {
    if (!this.musicEnabled) return;
    const audioContext = this.sound && this.sound.context;
    if (!audioContext || typeof audioContext.createOscillator !== "function") return;
    try {
      if (audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
        return;
      }
      const progression = [
        [130.81, 164.81, 196.00],
        [110.00, 146.83, 174.61],
        [87.31, 130.81, 164.81],
        [98.00, 146.83, 196.00],
      ];
      const chord = progression[Math.floor(this.musicStep / 4) % progression.length];
      const note = chord[this.musicStep % chord.length];
      const start = audioContext.currentTime;
      const bass = audioContext.createOscillator();
      const pad = audioContext.createOscillator();
      const bassGain = audioContext.createGain();
      const padGain = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      bass.type = "triangle";
      bass.frequency.setValueAtTime(note / 2, start);
      pad.type = "sine";
      pad.frequency.setValueAtTime(note, start);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(520, start);
      bassGain.gain.setValueAtTime(0.0001, start);
      bassGain.gain.linearRampToValueAtTime(0.045, start + 0.08);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.49);
      padGain.gain.setValueAtTime(0.0001, start);
      padGain.gain.linearRampToValueAtTime(0.018, start + 0.12);
      padGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
      bass.connect(bassGain);
      bassGain.connect(audioContext.destination);
      pad.connect(filter);
      filter.connect(padGain);
      padGain.connect(audioContext.destination);
      bass.start(start);
      pad.start(start);
      bass.stop(start + 0.51);
      pad.stop(start + 0.51);
      this.musicStep = (this.musicStep + 1) % 16;
    } catch (error) {
      // Music is optional and must never interrupt the game loop.
    }
  }

  playPlantSound() {
    if (!this.effectsSoundEnabled) return;
    const audioContext = this.sound && this.sound.context;
    if (!audioContext || typeof audioContext.createOscillator !== "function") return;
    try {
      if (audioContext.state === "suspended") audioContext.resume();
      const start = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(185, start);
      oscillator.frequency.exponentialRampToValueAtTime(420, start + 0.09);
      oscillator.frequency.exponentialRampToValueAtTime(285, start + 0.24);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(950, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.29);
    } catch (error) {
      // Planting sound is optional; planting itself must always succeed.
    }
  }

  playUprootSound() {
    if (!this.soundEnabled) return;
    const audioContext = this.sound && this.sound.context;
    if (!audioContext || typeof audioContext.createOscillator !== "function") return;
    try {
      if (audioContext.state === "suspended") audioContext.resume();
      const start = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(520, start);
      oscillator.frequency.exponentialRampToValueAtTime(115, start + 0.19);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1250, start);
      filter.frequency.exponentialRampToValueAtTime(360, start + 0.2);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.23);
    } catch (error) {
      // Uprooting sound is optional; removal must always work.
    }
  }

  playThornSound() {
    if (!this.projectileSoundEnabled) return;
    const audioContext = this.sound && this.sound.context;
    if (!audioContext || typeof audioContext.createOscillator !== "function") return;
    try {
      if (audioContext.state === "suspended") audioContext.resume();
      const start = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(620, start);
      oscillator.frequency.exponentialRampToValueAtTime(240, start + 0.095);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1800, start);
      filter.frequency.exponentialRampToValueAtTime(650, start + 0.11);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.13);
    } catch (error) {
      // Sound is optional; projectile gameplay must continue if audio is unavailable.
    }
  }

  bindInput() {
    this.keys = this.input.keyboard.addKeys({
      w: Input.Keyboard.KeyCodes.W, a: Input.Keyboard.KeyCodes.A,
      s: Input.Keyboard.KeyCodes.S, d: Input.Keyboard.KeyCodes.D,
      up: Input.Keyboard.KeyCodes.UP, down: Input.Keyboard.KeyCodes.DOWN,
      left: Input.Keyboard.KeyCodes.LEFT, right: Input.Keyboard.KeyCodes.RIGHT,
      space: Input.Keyboard.KeyCodes.SPACE
    });
    this.input.on("pointerdown", (pointer) => {
      if (this.gameOver) return;
      const { col, row } = this.worldToGrid(pointer.x, pointer.y);
      if (row >= 0 && row < LANES && col >= 0 && col < COLUMNS) this.requestPlant(col, row);
    });
  }

  update(_time, delta) {
    if (this.gameOver) return;
    const dt = delta / 1000;
    this.handleControls(dt);
    this.energyTimer += delta;
    if (this.energyTimer >= 1000) { this.energyTimer -= 1000; this.energy = Math.min(300, this.energy + 2); }
    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0 && this.spawnedThisWave < this.waveSize) {
      this.spawnMonster(); this.spawnedThisWave += 1;
      this.spawnTimer = Math.max(2300, 5200 - this.wave * 120);
    }
    this.updatePlants(delta);
    this.updateMonsters(dt, delta);
    this.updateProjectiles(dt);
    this.checkWaveProgress();
    this.cavemanLabel.setPosition(this.caveman.x, this.caveman.y + 32);
    this.refreshHud();
  }

  handleControls(dt) {
    let dx = 0; let dy = 0;
    if (this.keys.a.isDown || this.keys.left.isDown) dx -= 1;
    if (this.keys.d.isDown || this.keys.right.isDown) dx += 1;
    if (this.keys.w.isDown || this.keys.up.isDown) dy -= 1;
    if (this.keys.s.isDown || this.keys.down.isDown) dy += 1;
    if (!this.plantingTarget && !this.returnTarget && (dx !== 0 || dy !== 0)) {
      this.caveman.x = PhaserMath.Clamp(this.caveman.x + dx * 170 * dt, 105, 1010);
      this.caveman.y = PhaserMath.Clamp(this.caveman.y + dy * 170 * dt, this.laneYs[0] - 22, this.laneYs[LANES - 1] + 22);
      if (dx !== 0) this.facing = Math.sign(dx);
      this.caveman.scaleX = this.facing;
    }
    this.updatePlantingMovement(dt);
    this.updateReturnMovement(dt);
    if (Input.Keyboard.JustDown(this.keys.space)) {
      if (this.livingPlantCount() > 0) this.setMessage("The radishes are alive and defending. The caveman cannot fight yet.");
      else if (this.hasPlantedDefender) this.clubAttack();
      else this.setMessage("Plant a radish first. The caveman's club is an emergency defense only.");
    }
  }

  requestPlant(col, row) {
    if (this.plantingTarget) { this.setMessage("The caveman is already on his way to a planting spot."); return; }
    const existingPlant = this.plants.find((plant) => plant.alive && plant.col === col && plant.row === row);
    if (existingPlant) {
      this.uprootPlant(existingPlant);
      return;
    }
    if (!this.selectedPlant) { this.setMessage("Choose the radish icon first."); return; }
    if (this.energy < RADISH.cost) { this.setMessage("Not enough energy to plant a radish."); return; }
    const { x, y } = this.plantingCellCenter(col, row);
    this.plantingTarget = { col, row, x, y };
    this.facing = x >= this.caveman.x ? 1 : -1;
    this.caveman.scaleX = this.facing;
    this.setMessage("The caveman is walking to the selected soil cell...");
  }

  updatePlantingMovement(dt) {
    if (!this.plantingTarget) return;
    const target = this.plantingTarget;
    const dx = target.x - this.caveman.x;
    const dy = target.y - this.caveman.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 7) {
      const step = Math.min(distance, 190 * dt);
      this.caveman.x += dx / distance * step;
      this.caveman.y += dy / distance * step;
      if (dx !== 0) { this.facing = Math.sign(dx); this.caveman.scaleX = this.facing; }
      return;
    }
    this.caveman.setPosition(target.x, target.y);
    this.plantingTarget = null;
    this.plantRadish(target.col, target.row);
  }

  updateReturnMovement(dt) {
    if (!this.returnTarget) return;
    const target = this.returnTarget;
    const dx = target.x - this.caveman.x;
    const dy = target.y - this.caveman.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 5) {
      this.caveman.setPosition(target.x, target.y);
      this.returnTarget = null;
      this.setMessage("The caveman is back behind the final defense line.");
      return;
    }
    const step = Math.min(distance, 430 * dt);
    this.caveman.x += (dx / distance) * step;
    this.caveman.y += (dy / distance) * step;
    if (dx !== 0) {
      this.facing = Math.sign(dx);
      this.caveman.scaleX = this.facing;
    }
  }

  plantRadish(col, row) {
    if (this.energy < RADISH.cost || this.plants.some((p) => p.alive && p.col === col && p.row === row)) {
      this.setMessage("Planting cancelled: this cell is no longer available."); return;
    }
    this.energy -= RADISH.cost;
    this.hasPlantedDefender = true;
    const { x, y } = this.plantingCellCenter(col, row);
    this.plants.push({
      type: "radish", col, row, x, y, hp: RADISH.hp, alive: true,
      cooldown: PhaserMath.Between(250, 650), view: this.drawRadish(x, y)
    });
    this.playPlantSound();
    this.updateEmergencyMode();
    this.tweens.add({ targets: this.caveman, scaleY: 0.82, duration: 120, yoyo: true });
    const safePosition = this.lanePoint(HOME_LOCAL_X - 38, row);
    this.returnTarget = { x: safePosition.x, y: safePosition.y };
    this.setMessage("Radish planted! The caveman is sprinting back behind the final line.");
  }

  drawRadish(x, y) {
    // The gold target is the plant's soil/root anchor. The complete radish
    // grows upward from that exact point; no gameplay coordinate is offset.
    const anchor = this.add.graphics().setPosition(x, y).setDepth(10);
    anchor.lineStyle(2, 0x172b36, 1);
    anchor.strokeCircle(0, 0, 8);
    anchor.fillStyle(0xffd54a, 1);
    anchor.fillCircle(0, 0, 4);
    anchor.lineStyle(2, 0xffd54a, 1);
    anchor.lineBetween(-11, 0, 11, 0);
    anchor.lineBetween(0, -11, 0, 11);

    const plant = this.add.container(x, y).setDepth(11);
    const g = this.add.graphics();

    // Rounded radish body: broad shoulders tapering to a root tip at y=0.
    g.fillStyle(0x9f2937, 1);
    g.fillEllipse(0, -25, 31, 34);
    g.fillStyle(0xd94b52, 1);
    g.fillTriangle(-14, -37, 14, -37, 0, -1);
    g.fillStyle(0xf4a0a0, 0.9);
    g.fillEllipse(-7, -28, 7, 15);
    g.fillStyle(0x6f2630, 1);
    g.fillTriangle(-3, -5, 3, -5, 0, 0);

    // Leaves and short stem rise from the shoulders, away from the soil.
    g.lineStyle(4, 0x477b38, 1);
    g.lineBetween(0, -38, 0, -48);
    g.fillStyle(0x4f963f, 1);
    g.fillEllipse(-10, -48, 18, 9);
    g.fillEllipse(1, -54, 12, 18);
    g.fillEllipse(11, -47, 17, 9);
    g.lineStyle(1.5, 0x2f682e, 1);
    g.lineBetween(-17, -48, -4, -48);
    g.lineBetween(0, -61, 2, -47);
    g.lineBetween(4, -47, 18, -47);

    // Simple friendly face, positioned on the upper half of the root.
    g.fillStyle(0xffeadc, 1);
    g.fillEllipse(-6, -25, 5, 8);
    g.fillEllipse(6, -25, 5, 8);
    g.fillStyle(0x302b29, 1);
    g.fillCircle(-6, -25, 2);
    g.fillCircle(6, -25, 2);
    g.lineStyle(2, 0x71333a, 1);
    g.beginPath();
    g.arc(0, -18, 5, 0.2, Math.PI - 0.2);
    g.strokePath();

    plant.add(g);
    this.tweens.add({
      targets: plant,
      scaleY: 1.025,
      duration: 1450,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1
    });
    return plant;
  }

  updatePlants(delta) {
    for (const plant of this.plants) {
      if (!plant.alive) continue;
      plant.cooldown -= delta;
      if (plant.cooldown > 0) continue;
      const plantLaneX = this.worldToLane(plant).localX;
      const target = this.monsters.filter((m) => m.alive && m.row === plant.row && m.localX > plantLaneX && m.localX - plantLaneX <= RADISH.range)
        .sort((a, b) => a.localX - b.localX)[0];
      if (!target) continue;
      this.fireThorn(plant, target);
      plant.cooldown = RADISH.cooldown;
    }
  }

  fireThorn(plant, _target) {
    // Monsters and thorns share the exact same perspective lane.
    // Thorns travel forward along localX and never home in on a moving target.
    const lane = this.worldToLane(plant);
    const localX = lane.localX + 22;
    const row = plant.row;
    const position = this.lanePoint(localX, row);
    const view = this.add.triangle(position.x, position.y - 22, -7, 5, 7, 0, -7, -5, 0xf0e2ad);
    view.setStrokeStyle(2, 0x456b35);
    this.projectiles.push({
      view, localX, row, speed: 320, damage: 25, alive: true
    });
    this.playThornSound();
  }

  spawnMonster() {
    const row = PhaserMath.Between(0, LANES - 1);
    const hp = 65 + Math.floor(this.wave * 4);
    const spawn = this.lanePoint(SPAWN_LOCAL_X, row);
    const view = this.add.container(spawn.x, spawn.y);
    const g = this.add.graphics();
    g.fillStyle(0x7b9872, 1); g.fillEllipse(0, 16, 42, 58);
    g.fillStyle(0x9cae88, 1); g.fillCircle(0, -22, 25);
    g.fillStyle(0xeee7c9, 1); g.fillCircle(-9, -25, 8); g.fillCircle(9, -25, 8);
    g.fillStyle(0x29362a, 1); g.fillCircle(-8, -24, 3); g.fillCircle(10, -24, 3);
    g.lineStyle(7, 0x7b9872, 1); g.lineBetween(-18, 0, -33, 15); g.lineBetween(18, 0, 33, 15);
    g.lineStyle(8, 0x51422e, 1); g.lineBetween(-10, 39, -18, 55); g.lineBetween(10, 39, 18, 55);
    view.add(g); view.setDepth(8);
    this.tweens.add({ targets: view, angle: { from: -2.5, to: 2.5 }, duration: 520, ease: "Sine.easeInOut", yoyo: true, repeat: -1 });
    this.monsters.push({ row, x: spawn.x, y: spawn.y, localX: SPAWN_LOCAL_X, hp, speed: Math.min(45, 14 + (this.wave - 1) * 1.8), attackCooldown: 0, alive: true, view });
  }

  updateMonsters(dt, delta) {
    for (const monster of this.monsters) {
      if (!monster.alive) continue;
      monster.attackCooldown -= delta;
      const blocker = this.plants.filter((p) => p.alive && p.row === monster.row && this.worldToLane(p).localX < monster.localX)
        .sort((a, b) => this.worldToLane(b).localX - this.worldToLane(a).localX)[0];
      const blockerLocalX = blocker ? this.worldToLane(blocker).localX : -Infinity;
      if (blocker && monster.localX - blockerLocalX <= 43) {
        if (monster.attackCooldown <= 0) {
          blocker.hp -= 16; monster.attackCooldown = 1150;
          this.tweens.add({ targets: monster.view, x: monster.view.x - 4, duration: 90, yoyo: true });
          if (blocker.hp <= 0) this.destroyPlant(blocker);
        }
        continue;
      }
      if (!blocker && monster.localX <= HOME_LOCAL_X + 34) {
        this.endGame(false);
        return;
      }
      monster.localX -= monster.speed * dt;
      const position = this.lanePoint(monster.localX, monster.row);
      monster.x = position.x; monster.y = position.y;
      monster.view.setPosition(position.x, position.y);
    }
    this.monsters = this.monsters.filter((m) => m.alive);
  }

  updateProjectiles(dt) {
    for (const shot of this.projectiles) {
      if (!shot.alive) continue;
      shot.localX += shot.speed * dt;
      const position = this.lanePoint(shot.localX, shot.row);
      shot.view.setPosition(position.x, position.y - 22);

      // Collision is checked only against monsters occupying this same lane.
      const hit = this.monsters.find((monster) =>
        monster.alive &&
        monster.row === shot.row &&
        Math.abs(monster.localX - shot.localX) <= 24
      );
      if (hit) {
        hit.hp -= shot.damage;
        this.damageMonsterIfNeeded(hit);
        shot.alive = false;
        shot.view.destroy();
        continue;
      }

      if (shot.localX > SPAWN_LOCAL_X + 80) {
        shot.alive = false;
        shot.view.destroy();
      }
    }
    this.projectiles = this.projectiles.filter((shot) => shot.alive);
  }

  damageMonsterIfNeeded(monster) {
    if (monster.hp > 0 || !monster.alive) return;
    monster.alive = false; monster.view.destroy(); this.energy = Math.min(300, this.energy + 8);
  }

  uprootPlant(plant) {
    if (!plant || !plant.alive || this.gameOver) return;
    plant.alive = false;
    plant.view.destroy();
    this.playUprootSound();
    this.setMessage("Radish uprooted. Select the radish card and plant it in any empty soil cell.");
    this.updateEmergencyMode();
    this.refreshHud();
  }

  destroyPlant(plant) {
    if (!plant.alive) return;
    plant.alive = false; plant.view.destroy();
    this.setMessage("A radish defender has fallen!");
    this.updateEmergencyMode();
  }

  livingPlantCount() { return this.plants.filter((p) => p.alive).length; }

  updateEmergencyMode() {
    const active = this.hasPlantedDefender && this.livingPlantCount() === 0;
    if (active && !this.emergencyMode) {
      this.emergencyMode = true;
      this.setMessage("EMERGENCY! The last radish has fallen. Move close and press SPACE to swing the club.");
    } else if (!active && this.emergencyMode) {
      this.emergencyMode = false;
      this.setMessage("A new radish is planted. The caveman stops fighting; the plant defends again.");
    }
  }

  clubAttack() {
    if (!this.emergencyMode || this.livingPlantCount() > 0) return;
    const target = this.monsters.filter((m) => m.alive && m.row === this.nearestLane(this.caveman.y) && Math.abs(m.x - this.caveman.x) <= 112)
      .sort((a, b) => Math.abs(a.x - this.caveman.x) - Math.abs(b.x - this.caveman.x))[0];
    this.tweens.add({ targets: this.caveman, angle: this.facing * 22, duration: 100, yoyo: true });
    if (target) { target.hp -= 42; this.damageMonsterIfNeeded(target); this.setMessage("Club hit!"); }
    else this.setMessage("No monster is close enough for the club.");
  }

  nearestLane(y) {
    const local = this.boardCoordinates(this.caveman.x, y);
    return PhaserMath.Clamp(Math.floor(local.v * LANES), 0, LANES - 1);
  }

  checkWaveProgress() {
    if (this.spawnedThisWave >= this.waveSize && this.monsters.length === 0) {
      this.wave += 1; this.spawnedThisWave = 0; this.spawnTimer = 3200;
      this.waveSize = Math.min(12, 5 + this.wave);
      this.setMessage("Wave " + (this.wave - 1) + " cleared. More monsters are approaching.");
    }
  }

  playDefeatMusic() {
    // A short original three-note descending defeat fanfare synthesized with Web Audio.
    if (!this.effectsSoundEnabled) return;
    const audioContext = this.sound && this.sound.context;
    if (!audioContext || typeof audioContext.createOscillator !== "function") return;
    try {
      const start = audioContext.currentTime + 0.05;
      const notes = [196, 164.81, 130.81, 98];
      notes.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const noteStart = start + index * 0.42;
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(frequency, noteStart);
        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.16, noteStart + 0.035);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.38);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(noteStart);
        oscillator.stop(noteStart + 0.4);
      });
    } catch (error) {
      // The defeat overlay must still work if browser audio is unavailable.
    }
  }

  endGame(won) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.plantingTarget = null;
    this.returnTarget = null;
    this.setMessage(won ? "VICTORY! The farm is safe." : "GAME OVER — The monsters reached the final line.");
    this.add.rectangle(560, 340, 1120, 680, 0x10170f, 0.72).setDepth(60);
    if (won) {
      this.stopBackgroundMusic();
      this.add.rectangle(560, 340, 520, 150, 0x263c2b, 0.96).setStrokeStyle(3, 0xe4d5a5).setDepth(61);
      this.add.text(560, 340, "VICTORY", {
        fontFamily: "Arial", fontSize: "48px", color: "#fff2c8", fontStyle: "bold"
      }).setOrigin(0.5).setDepth(62);
      return;
    }
    const title = this.add.text(560, 300, "GAME OVER", {
      fontFamily: "Arial", fontSize: "68px", color: "#ffdf72", fontStyle: "bold",
      stroke: "#54221f", strokeThickness: 10, shadow: { offsetX: 0, offsetY: 5, color: "#000000", blur: 12, fill: true }
    }).setOrigin(0.5).setScale(0.18).setDepth(62);
    this.tweens.add({
      targets: title,
      scale: 1.18,
      duration: 420,
      ease: "Back.easeOut",
      yoyo: true,
      repeat: 2,
      hold: 130,
      onComplete: () => title.setScale(1.18)
    });

    this.stopBackgroundMusic();
    this.createGameOverButton(455, 405, "PLAY AGAIN", 0x9bc66e, () => this.scene.restart());
    this.createGameOverButton(665, 405, "HOME", 0xe5c27d, () => {
      if (typeof window !== "undefined") window.location.assign("/");
    });
    this.playDefeatMusic();
  }

  createGameOverButton(x, y, label, color, action) {
    const button = this.add.container(x, y).setDepth(63);
    const background = this.add.rectangle(0, 0, 184, 54, color, 1)
      .setStrokeStyle(3, 0x563a25)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(0, 0, label, {
      fontFamily: "Arial", fontSize: "17px", color: "#34271d", fontStyle: "bold"
    }).setOrigin(0.5);
    button.add([background, text]);
    background.on("pointerover", () => background.setScale(1.05));
    background.on("pointerout", () => background.setScale(1));
    background.on("pointerdown", action);
    return button;
  }

  setMessage(message) { this.messageText.setText(message); }

  refreshHud() {
    this.hudText.setText("ENERGY  " + this.energy + "     HOUSE  " + this.houseHealth + "%     RADISHES  " + this.livingPlantCount());
    this.waveText.setText("WAVE " + this.wave + (this.emergencyMode ? "  ·  EMERGENCY" : ""));
  }
}
