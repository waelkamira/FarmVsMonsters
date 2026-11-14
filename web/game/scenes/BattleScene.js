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
const CAVEMAN_RETURN_SPEED = 2000;
const SPAWN_LOCAL_X = GRID_WIDTH / 2 + 28;
const RADISH = { label: "Radish", cost: 35, hp: 110, cooldown: 1450, range: 360 };
const MUSHROOM = { label: "Energy Mushroom", cost: 50, hp: 85, energy: 25, productionInterval: 8000 };

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
    this.selectedPlant = null;
    this.plants = [];
    this.monsters = [];
    this.projectiles = [];
    this.collectingEnergyToken = false;
    this.laneYs = Array.from({ length: LANES }, (_, row) => this.gridCellCenter(0, row).y);
    this.emergencyMode = false;
    this.hasPlantedDefender = false;
    this.facing = 1;
    this.plantingTarget = null;
    this.returnTarget = null;
    this.gameOver = false;
    const legacySoundSetting = this.registry.get("soundEnabled");
    const defaultSoundSetting = legacySoundSetting === undefined ? true : legacySoundSetting;
    if (this.registry.get("projectileSoundEnabled") === undefined) {
      this.registry.set("projectileSoundEnabled", this.readAudioPreference("projectileSoundEnabled", defaultSoundSetting));
    }
    if (this.registry.get("effectsSoundEnabled") === undefined) {
      this.registry.set("effectsSoundEnabled", this.readAudioPreference("effectsSoundEnabled", defaultSoundSetting));
    }
    if (this.registry.get("musicEnabled") === undefined) {
      this.registry.set("musicEnabled", this.readAudioPreference("musicEnabled", true));
    }
    this.projectileSoundEnabled = this.registry.get("projectileSoundEnabled");
    this.effectsSoundEnabled = this.registry.get("effectsSoundEnabled");
    this.musicEnabled = this.registry.get("musicEnabled");
    this.musicVolume = this.readAudioVolume("musicVolume", this.musicEnabled ? 70 : 0);
    this.effectsVolume = this.readAudioVolume("effectsVolume", this.effectsSoundEnabled ? 80 : 0);
    this.projectileVolume = this.readAudioVolume("projectileVolume", this.projectileSoundEnabled ? 65 : 0);
    this.musicEnabled = this.musicVolume > 0;
    this.effectsSoundEnabled = this.effectsVolume > 0;
    this.projectileSoundEnabled = this.projectileVolume > 0;
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
    // A monster lane must pass through the CENTERS of the soil cells,
    // not along either horizontal grid edge. Use the same polygon-area
    // centroids used for planting, then interpolate between adjacent cells.
    // localX remains a normalized board coordinate so plants, monsters and
    // projectiles continue to share one perspective lane system.
    const safeRow = PhaserMath.Clamp(Math.floor(row), 0, LANES - 1);
    const u = (localX + GRID_WIDTH / 2) / GRID_WIDTH;
    const centerIndex = u * COLUMNS - 0.5;
    const leftCol = Math.floor(centerIndex);
    const blend = centerIndex - leftCol;
    const aCol = PhaserMath.Clamp(leftCol, 0, COLUMNS - 1);
    const bCol = PhaserMath.Clamp(leftCol + 1, 0, COLUMNS - 1);
    const a = this.gridCellCenter(aCol, safeRow);
    const b = this.gridCellCenter(bCol, safeRow);
    return {
      x: PhaserMath.Linear(a.x, b.x, blend),
      y: PhaserMath.Linear(a.y, b.y, blend),
    };
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
    this.waveText = this.add.text(925, 18, "", { fontFamily: "Arial", fontSize: "17px", color: "#fff7df", fontStyle: "bold" }).setOrigin(1, 0);
    this.messageText = this.add.text(560, 645, "", {
      fontFamily: "Arial", fontSize: "16px", color: "#fff7df",
      backgroundColor: "#263c2b", padding: { x: 14, y: 7 }, align: "center"
    }).setOrigin(0.5, 1);

    this.radishCard = this.createPlantCard(92, "RADISH", "35 energy", "radish", (g) => {
      g.fillStyle(0xc83e45, 1); g.fillEllipse(-43, 0, 22, 28);
      g.fillStyle(0x4b8c45, 1); g.fillTriangle(-48, -12, -40, -28, -34, -12);
      g.fillTriangle(-43, -13, -27, -23, -34, -8);
    });
    this.mushroomCard = this.createPlantCard(242, "MUSHROOM", "50 energy", "mushroom", (g) => {
      g.fillStyle(0x8b5bba, 1); g.fillEllipse(-43, -5, 28, 23);
      g.fillStyle(0xf2d9a4, 1); g.fillRoundedRect(-49, 4, 12, 16, 4);
      g.fillRoundedRect(-39, 4, 12, 16, 4);
      g.fillStyle(0xfff1d1, 1); g.fillCircle(-49, -8, 3); g.fillCircle(-38, -8, 3);
    });
  }

  createPlantCard(x, title, costLabel, type, drawIcon) {
    const card = this.add.container(x, 78).setDepth(40);
    const panel = this.add.rectangle(0, 0, 138, 58, 0xf4dfb3, 1)
      .setStrokeStyle(3, 0x65452f).setInteractive({ useHandCursor: true });
    const icon = this.add.graphics();
    drawIcon(icon);
    card.add([panel, icon,
      this.add.text(-25, -10, title, { fontFamily: "Arial", fontSize: "12px", color: "#563a25", fontStyle: "bold" }),
      this.add.text(-25, 9, costLabel, { fontFamily: "Arial", fontSize: "11px", color: "#72583c" })
    ]);
    panel.on("pointerdown", () => {
      if (this.gameOver) return;
      this.selectedPlant = type;
      this.radishCard.setFillStyle(type === "radish" ? 0xd9efbd : 0xf4dfb3, 1);
      this.mushroomCard.setFillStyle(type === "mushroom" ? 0xd9efbd : 0xf4dfb3, 1);
      const label = type === "radish" ? "Radish" : "Energy mushroom";
      this.setMessage(label + " selected. Click an empty soil cell to plant it.");
      this.refreshHud();
    });
    return panel;
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

  readAudioPreference(key, fallback) {
    try {
      const stored = window.localStorage.getItem("farmVsMonsters.audio." + key);
      return stored === null ? fallback : stored === "true";
    } catch (error) {
      return fallback;
    }
  }

  saveAudioPreference(key, value) {
    try {
      window.localStorage.setItem("farmVsMonsters.audio." + key, String(value));
    } catch (error) {
      // Audio preferences still remain active for the current game session.
    }
  }

  readAudioVolume(key, fallback) {
    try {
      const stored = window.localStorage.getItem("farmVsMonsters.audio." + key);
      if (stored === null) return fallback;
      const value = Number(stored);
      return Number.isFinite(value) ? PhaserMath.Clamp(value, 0, 100) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  saveAudioPreferences() {
    this.saveAudioPreference("musicVolume", this.musicVolume);
    this.saveAudioPreference("effectsVolume", this.effectsVolume);
    this.saveAudioPreference("projectileVolume", this.projectileVolume);
    this.musicEnabled = this.musicVolume > 0;
    this.effectsSoundEnabled = this.effectsVolume > 0;
    this.projectileSoundEnabled = this.projectileVolume > 0;
    this.saveAudioPreference("projectileSoundEnabled", this.projectileSoundEnabled);
    this.saveAudioPreference("effectsSoundEnabled", this.effectsSoundEnabled);
    this.saveAudioPreference("musicEnabled", this.musicEnabled);
    this.registry.set("projectileSoundEnabled", this.projectileSoundEnabled);
    this.registry.set("effectsSoundEnabled", this.effectsSoundEnabled);
    this.registry.set("musicEnabled", this.musicEnabled);
  }

  createAudioControls() {
    // A single speaker button keeps the battle HUD clean. All audio options
    // live in one compact popover anchored to this button.
    this.audioMenuBounds = { left: 860, right: 1120, top: 66, bottom: 300 };
    this.audioMenuOpen = false;
    this.audioMenuDismissedOnPointerDown = false;

    this.audioMenu = this.add.container(990, 183).setDepth(70).setVisible(false);
    // Make the menu surface consume clicks so its empty areas never behave
    // like clicks on the battlefield underneath it.
    const panel = this.add.rectangle(0, 0, 250, 220, 0xf4dfb3, 0.98)
      .setStrokeStyle(3, 0x65452f)
      .setInteractive();
    const heading = this.add.text(0, -91, "AUDIO VOLUME", {
      fontFamily: "Arial", fontSize: "14px", color: "#563a25", fontStyle: "bold"
    }).setOrigin(0.5);
    this.audioMenu.add([panel, heading]);

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

    this.audioButton = this.add.container(1040, 34).setDepth(72);
    const buttonBackground = this.add.circle(0, 0, 21, 0xf4dfb3, 1).setStrokeStyle(2, 0x65452f);
    const speaker = this.add.graphics();
    speaker.fillStyle(0x563a25, 1);
    speaker.fillRoundedRect(-11, -6, 7, 12, 2);
    speaker.fillTriangle(-5, -7, 5, -14, 5, 14);
    speaker.fillTriangle(-5, 7, 5, 14, 5, -14);
    speaker.lineStyle(2, 0x563a25, 1);
    speaker.beginPath();
    speaker.arc(3, 0, 10, -0.85, 0.85, false);
    speaker.strokePath();
    this.audioButton.add([buttonBackground, speaker]);
    buttonBackground.setInteractive({ useHandCursor: true });
    buttonBackground.on("pointerover", () => buttonBackground.setFillStyle(0xd9efbd, 1));
    buttonBackground.on("pointerout", () => buttonBackground.setFillStyle(0xf4dfb3, 1));
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
      const inButton = pointer.x >= 1015 && pointer.x <= 1065 &&
        pointer.y >= 9 && pointer.y <= 59;
      if (!inMenu && !inButton) {
        // The same outside click must only dismiss the menu; it must not
        // also trigger planting or another battlefield action.
        this.audioMenuDismissedOnPointerDown = true;
        this.closeAudioMenu();
      }
    });

    if (this.musicEnabled) this.startBackgroundMusic();
  }

  createAudioVolumeSlider(y, title, initialValue, onChange) {
    const container = this.add.container(0, y);
    const label = this.add.text(-101, -10, title, {
      fontFamily: "Arial", fontSize: "11px", color: "#563a25", fontStyle: "bold"
    }).setOrigin(0, 0.5);
    const track = this.add.rectangle(5, 12, 132, 7, 0xb69b72, 1).setInteractive({ useHandCursor: true });
    const fill = this.add.rectangle(-61, 12, 0, 5, 0x6c9a4d, 1).setOrigin(0, 0.5);
    const knob = this.add.circle(-61, 12, 7, 0x6c9a4d, 1)
      .setStrokeStyle(2, 0x563a25).setInteractive({ useHandCursor: true });
    const valueText = this.add.text(96, -10, Math.round(initialValue) + "%", {
      fontFamily: "Arial", fontSize: "11px", color: "#563a25", fontStyle: "bold"
    }).setOrigin(1, 0.5);
    container.add([label, track, fill, knob, valueText]);

    const setValue = (rawValue, persist = true) => {
      const value = Math.round(PhaserMath.Clamp(rawValue, 0, 100));
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
    const setFromPointer = (pointer) => setValue(pointer.x - (990 - 61));
    track.on("pointerdown", setFromPointer);
    knob.on("pointerdown", (pointer) => {
      this.activeAudioSlider = setFromPointer;
      setFromPointer(pointer);
    });
    track.on("pointerover", () => track.setFillStyle(0xc7ad83, 1));
    this.input.on("pointermove", (pointer) => {
      if (pointer.isDown && this.activeAudioSlider) this.activeAudioSlider(pointer);
    });
    this.input.on("pointerup", () => { this.activeAudioSlider = null; });
    setValue(initialValue, false);
    return { container };
  }

  openAudioMenu() {
    this.audioMenuOpen = true;
    this.audioMenu.setVisible(true);
    this.audioMenu.setScale(0.96);
    this.tweens.add({ targets: this.audioMenu, scale: 1, duration: 100, ease: "Back.Out" });
  }

  closeAudioMenu() {
    if (!this.audioMenuOpen) return;
    this.saveAudioPreferences();
    this.audioMenuOpen = false;
    this.audioMenu.setVisible(false);
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
    if (this.musicVolume <= 0) return;
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
      bassGain.gain.linearRampToValueAtTime(0.045 * this.musicVolume / 100, start + 0.08);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.49);
      padGain.gain.setValueAtTime(0.0001, start);
      padGain.gain.linearRampToValueAtTime(0.018 * this.musicVolume / 100, start + 0.12);
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
    if (this.effectsVolume <= 0) return;
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
      gain.gain.exponentialRampToValueAtTime(0.18 * this.effectsVolume / 100, start + 0.025);
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
    if (this.effectsVolume <= 0) return;
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
      gain.gain.exponentialRampToValueAtTime(0.16 * this.effectsVolume / 100, start + 0.012);
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

  playMonsterBiteSound() {
    if (this.effectsVolume <= 0) return;
    const audioContext = this.sound && this.sound.context;
    if (!audioContext || typeof audioContext.createBuffer !== "function" ||
        typeof audioContext.createBufferSource !== "function") return;
    try {
      if (audioContext.state === "suspended") audioContext.resume();
      const duration = 0.19;
      const sampleRate = audioContext.sampleRate;
      const buffer = audioContext.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i += 1) {
        const fade = 1 - i / samples.length;
        samples[i] = (Math.random() * 2 - 1) * fade * (i % 5 < 2 ? 0.95 : 0.48);
      }
      const source = audioContext.createBufferSource();
      const filter = audioContext.createBiquadFilter();
      const gain = audioContext.createGain();
      const start = audioContext.currentTime;
      source.buffer = buffer;
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(780, start);
      filter.frequency.exponentialRampToValueAtTime(260, start + duration);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.105 * this.effectsVolume / 100, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(audioContext.destination);
      source.start(start);
      source.stop(start + duration);
    } catch (error) {
      // Creature audio is optional; combat and plant damage must continue.
    }
  }

  playThornSound() {
    if (this.projectileVolume <= 0) return;
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
      gain.gain.exponentialRampToValueAtTime(0.12 * this.projectileVolume / 100, start + 0.008);
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
      this.resumeGameAudio();
      if (this.collectingEnergyToken) {
        this.collectingEnergyToken = false;
        return;
      }
      if (this.audioMenuOpen || this.audioMenuDismissedOnPointerDown) {
        this.audioMenuDismissedOnPointerDown = false;
        return;
      }
      if (this.gameOver) return;
      const { col, row } = this.worldToGrid(pointer.x, pointer.y);
      if (row >= 0 && row < LANES && col >= 0 && col < COLUMNS) this.requestPlant(col, row);
    });
  }

  update(_time, delta) {
    if (this.gameOver) return;
    const dt = delta / 1000;
    this.handleControls(dt);
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
    if (!this.selectedPlant) { this.setMessage("Choose a plant card first."); return; }
    const plantConfig = this.selectedPlant === "mushroom" ? MUSHROOM : RADISH;
    if (this.energy < plantConfig.cost) { this.setMessage("Not enough mushrooms energy to plant this."); return; }
    const { x, y } = this.plantingCellCenter(col, row);
    this.plantingTarget = { col, row, x, y, type: this.selectedPlant };
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
      const step = Math.min(distance, 900 * dt);
      this.caveman.x += dx / distance * step;
      this.caveman.y += dy / distance * step;
      if (dx !== 0) { this.facing = Math.sign(dx); this.caveman.scaleX = this.facing; }
      return;
    }
    this.caveman.setPosition(target.x, target.y);
    this.plantingTarget = null;
    this.plantSelected(target.col, target.row, target.type);
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
    const step = Math.min(distance, CAVEMAN_RETURN_SPEED * dt);
    this.caveman.x += (dx / distance) * step;
    this.caveman.y += (dy / distance) * step;
    if (dx !== 0) {
      this.facing = Math.sign(dx);
      this.caveman.scaleX = this.facing;
    }
  }

  plantSelected(col, row, type) {
    const config = type === "mushroom" ? MUSHROOM : RADISH;
    if (this.energy < config.cost || this.plants.some((p) => p.alive && p.col === col && p.row === row)) {
      this.setMessage("Planting cancelled: this cell is no longer available."); return;
    }
    this.energy -= config.cost;
    const { x, y } = this.plantingCellCenter(col, row);
    const plant = {
      type, col, row, x, y, hp: config.hp, alive: true,
      cooldown: type === "radish" ? PhaserMath.Between(250, 650) : 0,
      productionTimer: type === "mushroom" ? MUSHROOM.productionInterval : 0,
      view: type === "mushroom" ? this.drawEnergyMushroom(x, y) : this.drawRadish(x, y)
    };
    this.plants.push(plant);
    if (type === "mushroom") {
      plant.energyCounter = this.add.text(x, y + 19, "0", {
        fontFamily: "Arial", fontSize: "12px", color: "#fff7df", fontStyle: "bold",
        stroke: "#563a25", strokeThickness: 3
      }).setOrigin(0.5).setDepth(13);
    }
    if (type === "radish") this.hasPlantedDefender = true;
    this.playPlantSound();
    this.updateEmergencyMode();
    this.tweens.add({ targets: this.caveman, scaleY: 0.82, duration: 120, yoyo: true });
    const safePosition = this.lanePoint(HOME_LOCAL_X - 38, row);
    this.returnTarget = { x: safePosition.x, y: safePosition.y };
    this.setMessage(type === "mushroom"
      ? "Energy mushroom planted! It will produce mushrooms for planting more defenders."
      : "Radish planted! The caveman is sprinting back behind the final line.");
  }

  drawEnergyMushroom(x, y) {
    const plant = this.add.container(x, y).setDepth(11);
    const g = this.add.graphics();
    g.fillStyle(0xf0d7a2, 1);
    g.fillRoundedRect(-9, -28, 18, 29, 7);
    g.fillStyle(0x8a58b6, 1);
    g.fillEllipse(0, -31, 43, 31);
    g.fillStyle(0xb887d6, 1);
    g.fillEllipse(-8, -36, 16, 9);
    g.fillStyle(0xfff0d2, 1);
    g.fillEllipse(-7, -22, 5, 7);
    g.fillEllipse(7, -22, 5, 7);
    g.fillStyle(0x382b35, 1);
    g.fillCircle(-7, -22, 2);
    g.fillCircle(7, -22, 2);
    g.lineStyle(2, 0x65406f, 1);
    g.beginPath(); g.arc(0, -15, 5, 0.2, Math.PI - 0.2); g.strokePath();
    plant.add(g);
    this.tweens.add({ targets: plant, scaleY: 1.04, duration: 1250, ease: "Sine.easeInOut", yoyo: true, repeat: -1 });
    return plant;
  }

  drawRadish(x, y) {
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
      if (plant.type === "mushroom") {
        plant.productionTimer -= delta;
        if (plant.productionTimer <= 0) {
          plant.productionTimer += MUSHROOM.productionInterval;
          this.spawnMushroomEnergy(plant);
        }
        continue;
      }
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

  spawnMushroomEnergy(plant) {
    const amount = Math.min(MUSHROOM.energy, 300 - this.energy);
    if (amount <= 0) return;
    const token = this.add.container(plant.x, plant.y - 62).setDepth(35);
    const cap = this.add.ellipse(0, -4, 34, 25, 0x9b6ac4, 1).setStrokeStyle(2, 0x563a72);
    const stem = this.add.rectangle(0, 8, 10, 15, 0xf4dfb3, 1);
    const sparkle = this.add.text(0, -5, "+", {
      fontFamily: "Arial", fontSize: "17px", color: "#fff7df", fontStyle: "bold"
    }).setOrigin(0.5);
    token.add([stem, cap, sparkle]);
    cap.setInteractive({ useHandCursor: true });
    cap.on("pointerdown", () => {
      if (!token.active || this.gameOver) return;
      this.collectingEnergyToken = true;
      this.energy = Math.min(300, this.energy + amount);
      plant.energyCollected = (plant.energyCollected || 0) + amount;
      if (plant.energyCounter && plant.energyCounter.active) {
        plant.energyCounter.setText(String(plant.energyCollected));
      }
      this.playPlantSound();
      this.refreshHud();
      if (token.expiryTimer) token.expiryTimer.remove(false);
      this.tweens.add({
        targets: token, y: token.y - 30, alpha: 0, scale: 1.35, duration: 220,
        onComplete: () => token.destroy()
      });
      this.setMessage("Collected " + amount + " mushroom energy!");
    });
    this.tweens.add({
      targets: token, y: token.y - 9, duration: 700, ease: "Sine.easeInOut",
      yoyo: true, repeat: -1
    });
    token.expiryTimer = this.time.delayedCall(12000, () => {
      if (token.active) {
        this.tweens.add({ targets: token, alpha: 0, duration: 350, onComplete: () => token.destroy() });
      }
    });
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
    // Perspective lanes are closer together near the horizon. Scale each
    // monster to its lane spacing so feet from one lane never cover the
    // head of a monster in the lane behind it.
    const laneGap = row < LANES - 1
      ? this.laneYs[row + 1] - this.laneYs[row]
      : this.laneYs[row] - this.laneYs[row - 1];
    const monsterScale = PhaserMath.Clamp(laneGap / 108, 0.28, 0.62);
    view.setScale(monsterScale);
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
          this.playMonsterBiteSound();
          this.tweens.add({ targets: monster.view, x: monster.view.x - 4, scaleY: monster.view.scaleY * 0.94, duration: 85, yoyo: true });
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
    if (plant.energyCounter) plant.energyCounter.destroy();
    this.playUprootSound();
    this.setMessage("Plant uprooted. Select a plant card and choose an empty soil cell.");
    this.updateEmergencyMode();
    this.refreshHud();
  }

  destroyPlant(plant) {
    if (!plant.alive) return;
    plant.alive = false; plant.view.destroy();
    if (plant.energyCounter) plant.energyCounter.destroy();
    this.setMessage(plant.type === "mushroom" ? "An energy mushroom has been eaten!" : "A radish defender has fallen!");
    this.updateEmergencyMode();
  }

  livingPlantCount() { return this.plants.filter((p) => p.alive && p.type === "radish").length; }

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
    if (this.effectsVolume <= 0) return;
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
    this.hudText.setText("MUSHROOMS  " + this.energy + "     HOUSE  " + this.houseHealth + "%     RADISHES  " + this.livingPlantCount());
    this.waveText.setText("WAVE " + this.wave + (this.emergencyMode ? "  ·  EMERGENCY" : ""));
  }
}
