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
const CAVEMAN_RETURN_SPEED = 420;
const SPAWN_LOCAL_X = GRID_WIDTH / 2 + 28;
const RADISH = { label: "Radish", cost: 35, hp: 110, cooldown: 1450, range: 360 };
const MUSHROOM = { label: "Energy Mushroom", cost: 50, hp: 85, energy: 25, productionInterval: 8000 };
const PHASE_ONE_WAVE_SIZES = [10, 15, 20, 25, 30];
const PHASE_ONE_TOTAL_MONSTERS = PHASE_ONE_WAVE_SIZES.reduce((total, count) => total + count, 0);

// Central combat balance table. Monster durability is expressed in standard radish hits when possible.
const COMBAT_BALANCE = {
  plants: { radish: { projectileDamage: 25 } },
  monsters: {
    "cave-brute": { hitsToDefeat: 7 },
    "dust-skitter": { hpMultiplier: 0.72 },
    "stonehide": { hpMultiplier: 2.2 }
  }
};

export default class BattleScene extends Scene {
  constructor() { super("BattleScene"); }

  preload() {
    this.load.image("farm-battlefield", "/assets/backgrounds/farm-battlefield.jpeg");
    this.load.image("radish-character", "/assets/plants/radish.png");
    this.load.image("mushroom-character", "/assets/plants/mushroom.png");
    this.load.spritesheet("farmer-run", "/assets/characters/farmer/farmer-run.png", { frameWidth: 180, frameHeight: 720 });
    this.load.spritesheet("farmer-walk", "/assets/characters/farmer/farmer-walk.png", { frameWidth: 270, frameHeight: 360 });
    this.load.spritesheet("farmer-jump", "/assets/characters/farmer/farmer-jump.png", { frameWidth: 216, frameHeight: 720 });
    this.load.spritesheet("farmer-idle", "/assets/characters/farmer/farmer-idle.png", { frameWidth: 540, frameHeight: 360 });
    this.load.spritesheet("farmer-plant", "/assets/characters/farmer/farmer-plant.png", { frameWidth: 180, frameHeight: 360 });
    this.load.spritesheet("farmer-collect", "/assets/characters/farmer/farmer-collect.png", { frameWidth: 180, frameHeight: 360 });
    this.load.spritesheet("farmer-uproot", "/assets/characters/farmer/farmer-uproot.png", { frameWidth: 180, frameHeight: 360 });
    this.load.spritesheet("farmer-attack", "/assets/characters/farmer/farmer-attack.png", { frameWidth: 180, frameHeight: 360 });
    this.load.spritesheet("farmer-hit", "/assets/characters/farmer/farmer-hit.png", { frameWidth: 152, frameHeight: 430 });
    this.load.spritesheet("farmer-death", "/assets/characters/farmer/farmer-death.png", { frameWidth: 152, frameHeight: 430 });
    this.load.on("loaderror", (file) => {
      if (file.key === "farm-battlefield") this.backgroundAssetFailed = true;
      if (file.key === "radish-character") this.radishAssetFailed = true;
      if (file.key === "mushroom-character") this.mushroomAssetFailed = true;
      if (file.key.startsWith("farmer-")) this.farmerAssetFailed = true;
    });
  }

  create() {
    this.isPaused = false;
    this.energy = 150;
    this.houseHealth = 100;
    this.wave = 1;
    this.totalWaves = PHASE_ONE_WAVE_SIZES.length;
    this.spawnedThisWave = 0;
    this.waveDefeatedMonsters = 0;
    this.waveSize = PHASE_ONE_WAVE_SIZES[0];
    this.totalSpawnedMonsters = 0;
    this.totalDefeatedMonsters = 0;
    this.totalPlantsPlanted = 0;
    this.elapsedBattleMs = 0;
    this.spawnTimer = 1800;
    this.selectedPlant = null;
    this.plants = [];
    this.monsters = [];
    this.projectiles = [];
    this.nextProjectileAim = "head";
    this.collectingEnergyToken = false;
    this.laneYs = Array.from({ length: LANES }, (_, row) => this.gridCellCenter(0, row).y);
    this.emergencyMode = false;
    this.hasPlantedDefender = false;
    this.facing = 1;
    this.plantingTarget = null;
    this.returnTarget = null;
    this.farmerPlanting = false;
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
    this.audioSceneShuttingDown = false;

    this.drawField();
    this.createFarmBackground();
    this.drawPlantingGrid();
    this.createHud();
    this.createAudioControls();
    this.createPauseControl();
    this.createCaveman();
    this.bindInput();
    this.events.once("shutdown", () => {
      this.audioSceneShuttingDown = true;
      this.stopBackgroundMusic();
    });
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
    // Keep a valid adjacent-cell segment, but allow the interpolation
    // factor to extend beyond either edge. This is essential for positions
    // outside the board (the caveman's safe return point and monster entry).
    const leftCol = Math.floor(centerIndex);
    const aCol = PhaserMath.Clamp(leftCol, 0, COLUMNS - 2);
    const bCol = aCol + 1;
    const blend = centerIndex - aCol;
    const a = this.gridCellCenter(aCol, safeRow);
    const b = this.gridCellCenter(bCol, safeRow);
    return {
      x: PhaserMath.Linear(a.x, b.x, blend),
      y: PhaserMath.Linear(a.y, b.y, blend),
    };
  }

  monsterLanePoint(localX, row) {
    const position = this.lanePoint(localX, row);
    const safeRow = PhaserMath.Clamp(Math.floor(row), 0, LANES - 1);
    const u = (localX + GRID_WIDTH / 2) / GRID_WIDTH;
    const cellPosition = u * COLUMNS;
    const col = PhaserMath.Clamp(Math.floor(cellPosition), 0, COLUMNS - 1);
    const cellU = cellPosition - col;
    const topLeft = GRID_NODES[safeRow][col];
    const topRight = GRID_NODES[safeRow][col + 1];
    const bottomLeft = GRID_NODES[safeRow + 1][col];
    const bottomRight = GRID_NODES[safeRow + 1][col + 1];
    const topY = PhaserMath.Linear(topLeft.y, topRight.y, cellU);
    const bottomY = PhaserMath.Linear(bottomLeft.y, bottomRight.y, cellU);
    // Raise the complete monster/projectile lane by half the local cell
    // height, following the perspective of the specific cell.
    position.y -= (bottomY - topY) / 2;
    return position;
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
    // Slim timber status strip: keep the battlefield and all planting lanes visible.
    const wood = this.add.graphics().setDepth(38);
    wood.fillStyle(0x21170f, 0.36); wood.fillRoundedRect(24, 11, 1072, 43, 8);
    wood.fillStyle(0x694329, 0.96); wood.fillRoundedRect(20, 6, 1072, 42, 8);
    wood.lineStyle(2, 0x382317, 1); wood.strokeRoundedRect(20, 6, 1072, 42, 8);
    wood.lineStyle(1, 0xb17b45, 0.9); wood.strokeRoundedRect(24, 10, 1064, 34, 6);
    wood.fillStyle(0xd2a66a, 0.85);
    for (const x of [34, 1078]) { wood.fillCircle(x, 13, 2); wood.fillCircle(x, 41, 2); }

    this.hudText = this.add.text(38, 27, "", {
      fontFamily: "Georgia", fontSize: "13px", color: "#fff0c8", fontStyle: "bold",
      stroke: "#382317", strokeThickness: 2
    }).setOrigin(0, 0.5).setDepth(41);
    this.waveText = this.add.text(950, 27, "", {
      fontFamily: "Georgia", fontSize: "14px", color: "#ffe2a0", fontStyle: "bold",
      stroke: "#382317", strokeThickness: 2
    }).setOrigin(1, 0.5).setDepth(41);

    this.messageText = this.add.text(560, 660, "", {
      fontFamily: "Georgia", fontSize: "14px", color: "#fff0c8", fontStyle: "bold",
      backgroundColor: "#49301f", padding: { x: 14, y: 6 }, align: "center",
      stroke: "#24170f", strokeThickness: 2
    }).setOrigin(0.5, 1).setDepth(42);

    // Both core plants are available from the first campaign: Radish defends,
    // while Mushroom supplies collectible energy.
    this.radishCard = this.createPlantCard(112, "RADISH", "35", "radish", null, "radish-character");
    this.mushroomCard = this.createPlantCard(260, "MUSHROOM", "50", "mushroom", null, "mushroom-character");
  }

  createPlantCard(x, title, costLabel, type, drawIcon, imageKey = null) {
    const card = this.add.container(x, 80).setDepth(45);
    const shadow = this.add.rectangle(2, 3, 132, 54, 0x1c120c, 0.42);
    const frame = this.add.rectangle(0, 0, 132, 54, 0x79502e, 1).setStrokeStyle(2, 0x392417);
    const panel = this.add.rectangle(0, 0, 126, 48, 0xe0c18a, 1)
      .setStrokeStyle(1.5, 0xf7e5bd).setInteractive({ useHandCursor: true });
    const iconDivider = this.add.rectangle(-25, 0, 1.5, 36, 0x79502e, 0.55);
    let icon;
    if (imageKey && this.textures.exists(imageKey)) {
      const frameData = this.textures.getFrame(imageKey);
      const iconHeight = 36;
      const iconWidth = iconHeight * (frameData.realWidth / frameData.realHeight);
      icon = this.add.image(-48, -1, imageKey).setDisplaySize(iconWidth, iconHeight);
    } else {
      icon = this.add.graphics();
      if (drawIcon) drawIcon(icon);
    }
    const name = this.add.text(-17, -10, title, {
      fontFamily: "Georgia", fontSize: "12px", color: "#382719", fontStyle: "bold",
      resolution: 2
    }).setOrigin(0, 0.5);
    const cost = this.add.text(-17, 12, costLabel + " ENERGY", {
      fontFamily: "Georgia", fontSize: "10px", color: "#68431f", fontStyle: "bold",
      resolution: 2
    }).setOrigin(0, 0.5);
    card.add([shadow, frame, panel, icon, iconDivider, name, cost]);

    panel.on("pointerover", () => {
      if (this.selectedPlant !== type) panel.setFillStyle(0xd7b579, 1);
      card.setScale(1.035);
    });
    panel.on("pointerout", () => {
      if (this.selectedPlant !== type) panel.setFillStyle(0xc69b5e, 1);
      card.setScale(1);
    });
    panel.on("pointerdown", () => {
      if (this.gameOver) return;
      this.selectedPlant = type;
      this.radishCard.setAlpha(type === "radish" ? 1 : 0.92);
      this.mushroomCard.setAlpha(type === "mushroom" ? 1 : 0.92);
      this.setMessage(type === "radish"
        ? "Radish chosen. Select an empty soil plot to defend the lane."
        : "Mushroom chosen. Plant it, then collect its energy when it appears.");
      this.refreshHud();
    });
    return panel;
  }

  createCaveman() {
    this.farmerWantsToRun = false;
    this.caveman = this.add.container(220, this.laneYs[2]).setDepth(10 + this.laneYs[2] / 1000);

    if (this.textures.exists("farmer-idle") && this.createFarmerAnimations()) {
      // The sheets have different cell sizes and transparent padding.
      // Measure visible alpha bounds per frame so every action keeps the
      // same visible body height and the feet stay attached to the world anchor.
      this.cavemanVisual = this.add.sprite(0, 0, "farmer-idle", 0)
        .setOrigin(0.5, 1)
        .setScale(0.42);
      this.farmerFrameMetrics = new Map();
      this.farmerTargetDisplayHeight = null;
      this.cavemanVisual.on("animationstart", () => this.normalizeFarmerFrame());
      this.cavemanVisual.on("animationupdate", () => this.normalizeFarmerFrame());
      this.caveman.add(this.cavemanVisual);
      this.normalizeFarmerFrame();
      this.cavemanVisual.play("farmer-idle");
    } else {
    const body = this.add.graphics();

    // A recognizable stone-age villager: shaggy hide tunic, bone details,
    // leather belt, tousled hair and a wooden club with a chipped stone head.
    body.fillStyle(0x3b2619, 0.95);
    body.fillEllipse(0, 17, 46, 59);
    body.fillStyle(0x9b6038, 1);
    body.fillPoints([
      { x: -18, y: -7 }, { x: 17, y: -8 }, { x: 24, y: 30 },
      { x: 14, y: 42 }, { x: 6, y: 31 }, { x: -3, y: 44 },
      { x: -13, y: 30 }, { x: -24, y: 39 }
    ], true);
    body.fillStyle(0x70452a, 1);
    body.fillTriangle(-20, 22, -9, 40, -25, 37);
    body.fillTriangle(7, 28, 20, 43, 14, 24);
    body.fillStyle(0xe7ad75, 1);
    body.fillCircle(0, -18, 22);
    body.fillStyle(0x4a2d1b, 1);
    body.fillEllipse(0, -34, 38, 17);
    body.fillTriangle(-17, -35, -7, -49, -3, -31);
    body.fillTriangle(-3, -36, 8, -51, 12, -30);
    body.fillTriangle(8, -34, 22, -43, 18, -25);
    body.fillStyle(0x2b211c, 1);
    body.fillEllipse(-8, -19, 5, 7);
    body.fillEllipse(8, -19, 5, 7);
    body.fillStyle(0xf4dfb3, 1);
    body.fillCircle(-8, -20, 1.8); body.fillCircle(8, -20, 1.8);
    body.lineStyle(2, 0x754326, 1);
    body.beginPath(); body.arc(0, -10, 7, 0.2, Math.PI - 0.2); body.strokePath();
    body.lineStyle(3, 0xf0d9a7, 1);
    body.lineBetween(-13, -2, -5, 5); body.lineBetween(-5, 5, 4, -1);
    body.fillStyle(0x49301d, 1);
    body.fillRoundedRect(-20, 12, 40, 7, 3);
    body.fillStyle(0xe6d3a6, 1);
    body.fillTriangle(-13, 9, -8, 17, -3, 9);
    body.fillTriangle(3, 9, 8, 17, 13, 9);
    body.lineStyle(8, 0x9b6038, 1);
    body.lineBetween(15, 0, 30, -17);
    body.lineStyle(9, 0x704321, 1);
    body.lineBetween(27, -20, 43, -34);
    body.fillStyle(0x8b8b75, 1);
    body.fillPoints([{x:37,y:-41},{x:48,y:-38},{x:52,y:-28},{x:43,y:-23},{x:34,y:-30}], true);
    body.lineStyle(2, 0x4a493d, 1);
    body.lineBetween(40, -35, 49, -31);
    this.caveman.add(body);
    }

  }

  normalizeFarmerFrame() {
    const sprite = this.cavemanVisual;
    if (!sprite || !sprite.active || !sprite.frame) return;

    const frame = sprite.frame;
    const textureKey = sprite.texture.key;
    const cacheKey = textureKey + ":" + frame.name;
    let bounds = this.farmerFrameMetrics?.get(cacheKey);

    if (!bounds) {
      try {
        const sourceImage = sprite.texture.getSourceImage();
        const canvas = document.createElement("canvas");
        canvas.width = frame.width;
        canvas.height = frame.height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context || !sourceImage) throw new Error("Canvas alpha sampling is unavailable.");

        context.clearRect(0, 0, canvas.width, canvas.height);
        const sourceX = Number.isFinite(frame.cutX) ? frame.cutX : frame.x;
        const sourceY = Number.isFinite(frame.cutY) ? frame.cutY : frame.y;
        context.drawImage(
          sourceImage,
          sourceX, sourceY, frame.width, frame.height,
          0, 0, frame.width, frame.height
        );
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let minX = canvas.width;
        let minY = canvas.height;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < canvas.height; y += 1) {
          for (let x = 0; x < canvas.width; x += 1) {
            if (pixels[(y * canvas.width + x) * 4 + 3] <= 16) continue;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }

        if (maxX < minX || maxY < minY) throw new Error("The current farmer frame is empty.");
        bounds = {
          minX, minY, maxX, maxY,
          width: maxX - minX + 1,
          height: maxY - minY + 1
        };
        this.farmerFrameMetrics.set(cacheKey, bounds);

        // The first standing frame defines the target visible size for every action.
        if (textureKey === "farmer-idle" && this.farmerTargetDisplayHeight === null) {
          this.farmerTargetDisplayHeight = bounds.height * 0.42;
        }
      } catch (error) {
        // Keep the game playable on browsers that block canvas pixel reads.
        sprite.setOrigin(0.5, 1).setScale(0.42);
        return;
      }
    }

    if (this.farmerTargetDisplayHeight === null) {
      this.farmerTargetDisplayHeight = bounds.height * 0.42;
    }

    // Phaser's origin is the stable world anchor: center of the visible feet,
    // not the bottom edge of a sheet cell full of transparent pixels.
    sprite.setOrigin(
      (bounds.minX + bounds.maxX + 1) / (2 * frame.width),
      (bounds.maxY + 1) / frame.height
    );
    sprite.setScale(this.farmerTargetDisplayHeight / bounds.height);
  }

  createFarmerAnimations() {
    const definitions = [
      ["farmer-idle", "farmer-idle", 4, 1.5, -1],
      ["farmer-run", "farmer-run", 6, 8, -1],
      // The 1080×720 walk sheet is a 2×2 grid of 270×360 cells: four frames.
      ["farmer-walk", "farmer-walk", 4, 6, -1],
      ["farmer-jump", "farmer-jump", 5, 6, 0],
      ["farmer-plant", "farmer-plant", 6, 8, 0],
      ["farmer-uproot", "farmer-uproot", 6, 8, 0],
      ["farmer-collect", "farmer-collect", 6, 8, 0],
      ["farmer-attack", "farmer-attack", 6, 8, 0],
      ["farmer-hit", "farmer-hit", 6, 8, 0],
      ["farmer-death", "farmer-death", 6, 6, 0]
    ];

    try {
      for (const [key, texture, frameCount, frameRate, repeat] of definitions) {
        if (!this.textures.exists(texture)) {
          throw new Error("Missing farmer animation texture: " + texture);
        }

        // Validate the real Phaser texture frames before building an animation.
        // This catches a changed/mis-sliced PNG instead of silently requesting
        // frame indices that do not exist and leaving the farmer stuck.
        const textureData = this.textures.get(texture);
        const availableFrameNames = Object.keys(textureData.frames)
          .filter((frameName) => frameName !== "__BASE");
        const missingFrames = Array.from(
          { length: frameCount },
          (_, index) => String(index)
        ).filter((frameName) => !textureData.frames[frameName]);

        if (missingFrames.length > 0 || availableFrameNames.length < frameCount) {
          throw new Error(
            "Invalid farmer sheet " + texture +
            ": expected " + frameCount + " frames, found " + availableFrameNames.length +
            (missingFrames.length ? "; missing frame IDs " + missingFrames.join(", ") : "")
          );
        }

        if (this.anims.exists(key)) this.anims.remove(key);
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(texture, { start: 0, end: frameCount - 1 }),
          frameRate,
          repeat
        });
      }
      return true;
    } catch (error) {
      console.warn("Farmer animation assets unavailable; using fallback artwork.", error);
      this.farmerAssetFailed = true;
      return false;
    }
  }

  setFarmerAnimation(key) {
    if (!this.cavemanVisual || !this.cavemanVisual.active) return;
    if (key === "farmer-idle" && this.farmerForceIdleFrame) {
      this.cavemanVisual.stop();
      this.cavemanVisual.setTexture("farmer-idle", 0);
      this.normalizeFarmerFrame();
      return;
    }
    const currentKey = this.cavemanVisual.anims.currentAnim?.key;
    const actionAnimations = [
      "farmer-plant", "farmer-uproot", "farmer-attack",
      "farmer-hit", "farmer-death", "farmer-collect"
    ];
    if (actionAnimations.includes(currentKey) && this.cavemanVisual.anims.isPlaying && key !== currentKey) return;
    if (currentKey === key && this.cavemanVisual.anims.isPlaying) return;
    this.cavemanVisual.play(key);
  }

  playFarmerAction(key) {
    if (!this.cavemanVisual || !this.cavemanVisual.active) return;
    this.farmerForceIdleFrame = false;
    this.setFarmerAnimation(key);
    this.cavemanVisual.once("animationcomplete", () => {
      if (!this.cavemanVisual || !this.cavemanVisual.active) return;
      // Resume the correct locomotion state after an action. Planting and
      // uprooting can finish while the farmer is already sprinting home.
      this.setFarmerAnimation(
        this.plantingTarget
          ? "farmer-walk"
          : (this.farmerWantsToRun ? "farmer-run" : "farmer-idle")
      );
    });
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
    const panel = this.add.rectangle(0, 0, 250, 220, 0x79502e, 0.99)
      .setStrokeStyle(5, 0x3a2416)
      .setInteractive();
    const inset = this.add.rectangle(0, 0, 236, 206, 0xb88950, 1)
      .setStrokeStyle(2, 0xe5c68e);
    const heading = this.add.text(0, -91, "TRIBE SOUND", {
      fontFamily: "Georgia", fontSize: "15px", color: "#fff0c8", fontStyle: "bold",
      stroke: "#49301d", strokeThickness: 2
    }).setOrigin(0.5);
    this.audioMenu.add([panel, inset, heading]);

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

    this.audioButton = this.add.container(1040, 34).setDepth(72);
    const buttonBackground = this.add.circle(0, 0, 23, 0xb88950, 1).setStrokeStyle(4, 0x392417);
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
    buttonBackground.on("pointerover", () => buttonBackground.setFillStyle(0xe0c889, 1));
    buttonBackground.on("pointerout", () => buttonBackground.setFillStyle(0xb88950, 1));
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
      fontFamily: "Georgia", fontSize: "11px", color: "#3d291a", fontStyle: "bold"
    }).setOrigin(0, 0.5);
    const track = this.add.rectangle(5, 12, 132, 8, 0x65452f, 1).setInteractive({ useHandCursor: true });
    const fill = this.add.rectangle(-61, 12, 0, 5, 0xe2c078, 1).setOrigin(0, 0.5);
    const knob = this.add.circle(-61, 12, 8, 0xe2c078, 1)
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
    const setFromPointer = (pointer) => setValue((pointer.x - (990 - 61)) / 1.32);
    track.on("pointerdown", (pointer) => {
      this.activeAudioSlider = setFromPointer;
      setFromPointer(pointer);
    });
    knob.on("pointerdown", (pointer) => {
      this.activeAudioSlider = setFromPointer;
      setFromPointer(pointer);
    });
    track.on("pointerover", () => track.setFillStyle(0x9a7044, 1));
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
    if (!audioContext) return;

    // Browsers block Web Audio until a real user gesture. The first click
    // unlocks the context; start the soundtrack only after resume succeeds.
    if (audioContext.state === "suspended") {
      audioContext.resume().then(() => {
        if (audioContext.state !== "running" || this.audioSceneShuttingDown) return;
        if (this.musicEnabled && !this.gameOver) {
          // startBackgroundMusic emits the first note itself. Calling the
          // step again here would stack two notes on every pause/resume.
          this.startBackgroundMusic();
        }
      }).catch(() => {});
      return;
    }

    if (audioContext.state === "running" && this.musicEnabled && !this.musicTimer && !this.gameOver) {
      this.startBackgroundMusic();
    }
  }

  startBackgroundMusic() {
    if (!this.musicEnabled || this.musicVolume <= 0 || this.musicTimer || this.gameOver) return;
    this.musicTimer = this.time.addEvent({
      delay: 720,
      loop: true,
      callback: () => this.playBackgroundMusicStep()
    });
    // This may be called before the browser unlocks audio. The first real
    // user gesture calls resumeGameAudio(), which plays the opening note.
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
      bassGain.gain.linearRampToValueAtTime(0.13 * this.musicVolume / 100, start + 0.12);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.88);
      padGain.gain.setValueAtTime(0.0001, start);
      padGain.gain.linearRampToValueAtTime(0.085 * this.musicVolume / 100, start + 0.18);
      padGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);
      bass.connect(bassGain);
      bassGain.connect(audioContext.destination);
      pad.connect(filter);
      filter.connect(padGain);
      padGain.connect(audioContext.destination);
      bass.start(start);
      pad.start(start);
      bass.stop(start + 0.91);
      pad.stop(start + 0.91);
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
      const start = audioContext.currentTime;
      const volume = this.effectsVolume / 100;

      // A fuller, deliberately messy chomping sound: several wet crunches,
      // a low bite thump and a short crunchy tail on every attack.
      const duration = 0.58;
      const sampleRate = audioContext.sampleRate;
      const buffer = audioContext.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i += 1) {
        const t = i / sampleRate;
        const pulse = Math.max(
          Math.exp(-Math.pow((t - 0.055) / 0.052, 2)),
          Math.exp(-Math.pow((t - 0.235) / 0.065, 2)),
          Math.exp(-Math.pow((t - 0.405) / 0.075, 2))
        );
        const texture = (Math.random() * 2 - 1) * 0.72 +
          Math.sin(2 * Math.PI * (72 + 24 * Math.sin(t * 31)) * t) * 0.28;
        samples[i] = texture * pulse * (1 - t / duration);
      }

      const source = audioContext.createBufferSource();
      const crunchFilter = audioContext.createBiquadFilter();
      const crunchGain = audioContext.createGain();
      source.buffer = buffer;
      crunchFilter.type = "lowpass";
      crunchFilter.frequency.setValueAtTime(1450, start);
      crunchFilter.frequency.exponentialRampToValueAtTime(420, start + duration);
      crunchGain.gain.setValueAtTime(0.0001, start);
      crunchGain.gain.linearRampToValueAtTime(0.34 * volume, start + 0.025);
      crunchGain.gain.setValueAtTime(0.22 * volume, start + 0.19);
      crunchGain.gain.setValueAtTime(0.31 * volume, start + 0.22);
      crunchGain.gain.setValueAtTime(0.19 * volume, start + 0.38);
      crunchGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      source.connect(crunchFilter);
      crunchFilter.connect(crunchGain);
      crunchGain.connect(audioContext.destination);
      source.start(start);
      source.stop(start + duration);

      const thump = audioContext.createOscillator();
      const thumpGain = audioContext.createGain();
      thump.type = "sine";
      thump.frequency.setValueAtTime(105, start);
      thump.frequency.exponentialRampToValueAtTime(48, start + 0.2);
      thumpGain.gain.setValueAtTime(0.0001, start);
      thumpGain.gain.linearRampToValueAtTime(0.2 * volume, start + 0.018);
      thumpGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);
      thump.connect(thumpGain);
      thumpGain.connect(audioContext.destination);
      thump.start(start);
      thump.stop(start + 0.25);
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

  createPauseControl() {
    const button = this.add.container(1044, 27).setDepth(46);
    const background = this.add.rectangle(0, 0, 54, 30, 0x4a2e1d, 0.98)
      .setStrokeStyle(2, 0xd8b477).setInteractive({ useHandCursor: true });
    const label = this.add.text(0, 0, "Ⅱ", {
      fontFamily: "Arial", fontSize: "19px", color: "#fff0c8", fontStyle: "bold"
    }).setOrigin(0.5);
    button.add([background, label]);
    background.on("pointerover", () => background.setFillStyle(0x79502e, 1));
    background.on("pointerout", () => background.setFillStyle(0x4a2e1d, 0.98));
    background.on("pointerdown", () => this.pauseGame());
    this.pauseControl = button;
  }

  pauseGame() {
    if (this.gameOver || this.isPaused || !this.scene.isActive()) return;
    if (this.scene.isActive("PauseScene")) return;

    this.isPaused = true;
    this.stopBackgroundMusic();
    this.pauseGameAudio();
    this.scene.launch("PauseScene");
    this.scene.pause();
  }

  pauseGameAudio() {
    const audioContext = this.sound && this.sound.context;
    if (!audioContext || audioContext.state !== "running" || typeof audioContext.suspend !== "function") return;
    audioContext.suspend().catch(() => {});
  }

  resumeFromPause() {
    if (!this.isPaused || this.gameOver) return;
    this.isPaused = false;
    this.resumeGameAudio();
  }

  bindInput() {
    this.keys = this.input.keyboard.addKeys({
      w: Input.Keyboard.KeyCodes.W, a: Input.Keyboard.KeyCodes.A,
      s: Input.Keyboard.KeyCodes.S, d: Input.Keyboard.KeyCodes.D,
      up: Input.Keyboard.KeyCodes.UP, down: Input.Keyboard.KeyCodes.DOWN,
      left: Input.Keyboard.KeyCodes.LEFT, right: Input.Keyboard.KeyCodes.RIGHT,
      space: Input.Keyboard.KeyCodes.SPACE, p: Input.Keyboard.KeyCodes.P
    });
    this.input.keyboard.on("keydown-P", this.pauseGame, this);
    this.events.once("shutdown", () => this.input.keyboard.off("keydown-P", this.pauseGame, this));
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
    if (this.gameOver || this.isPaused) return;
    const dt = delta / 1000;
    this.elapsedBattleMs += delta;
    this.handleControls(dt);
    if (this.wave <= this.totalWaves && this.spawnedThisWave < this.waveSize) {
      this.spawnTimer -= delta;
      if (this.spawnTimer <= 0) {
        this.spawnMonster();
        this.spawnedThisWave += 1;
        this.totalSpawnedMonsters += 1;
        this.spawnTimer = Math.max(2300, 5200 - this.wave * 120);
      }
    }
    this.updatePlants(delta);
    this.updateMonsters(dt, delta);
    this.updateDepthSorting();
    this.updateProjectiles(dt);
    this.checkWaveProgress();
    this.refreshHud();
  }

  // Sort world characters by their ground position: lower screen Y is
  // farther away, while larger screen Y must render in front.
  updateDepthSorting() {
    const depthForY = (y) => 10 + y / 1000;
    for (const plant of this.plants) {
      if (plant.alive && plant.view && plant.view.active) {
        plant.view.setDepth(depthForY(plant.y + 2));
      }
    }
    for (const monster of this.monsters) {
      if (!monster.alive || !monster.view || !monster.view.active) continue;
      monster.view.setDepth(depthForY(monster.y));
    }
    if (this.caveman && this.caveman.active) {
      // Keep the farmer behind plants in the same lane. Plant bases sort at
      // y + 2, so sorting the farmer at y - 40 places his whole character
      // behind the planted object instead of covering it.
      this.caveman.setDepth(depthForY(this.caveman.y - 40));
    }
  }

  handleControls(dt) {
    let dx = 0; let dy = 0;
    if (this.keys.a.isDown || this.keys.left.isDown) dx -= 1;
    if (this.keys.d.isDown || this.keys.right.isDown) dx += 1;
    if (this.keys.w.isDown || this.keys.up.isDown) dy -= 1;
    if (this.keys.s.isDown || this.keys.down.isDown) dy += 1;
    if (!this.plantingTarget && !this.returnTarget && !this.farmerPlanting && (dx !== 0 || dy !== 0)) {
      this.caveman.x = PhaserMath.Clamp(this.caveman.x + dx * 115 * dt, 105, 1010);
      this.caveman.y = PhaserMath.Clamp(this.caveman.y + dy * 115 * dt, this.laneYs[0] - 22, this.laneYs[LANES - 1] + 22);
      this.farmerForceIdleFrame = false;
      if (dx !== 0) this.facing = Math.sign(dx);
      this.caveman.scaleX = this.facing;
    }
    this.updatePlantingMovement(dt);
    this.updateReturnMovement(dt);
    this.farmerWantsToRun = Boolean(
      this.plantingTarget || this.returnTarget || dx !== 0 || dy !== 0
    );
    this.setFarmerAnimation(
      this.plantingTarget
        ? "farmer-walk"
        : (this.farmerWantsToRun ? "farmer-run" : "farmer-idle")
    );
    if (Input.Keyboard.JustDown(this.keys.space)) {
      if (this.farmerPlanting || this.plantingTarget || this.returnTarget) return;
      if (this.livingPlantCount() > 0) this.setMessage("The radishes are alive and defending. The caveman cannot fight yet.");
      else if (this.hasPlantedDefender) this.clubAttack();
      else this.setMessage("Plant a radish first. The caveman's club is an emergency defense only.");
    }
  }

  requestPlant(col, row) {
    if (this.gameOver) return;
    this.farmerForceIdleFrame = false;
    if (this.plantingTarget || this.returnTarget || this.farmerPlanting) {
      this.setMessage("The caveman must finish his current action before moving again.");
      return;
    }
    const existingPlant = this.plants.find((plant) => plant.alive && plant.col === col && plant.row === row);
    if (existingPlant) {
      this.uprootPlant(existingPlant);
      return;
    }
    if (!this.selectedPlant) { this.setMessage("Choose a plant card first."); return; }
    const plantConfig = this.selectedPlant === "mushroom" ? MUSHROOM : RADISH;
    if (this.energy < plantConfig.cost) {
      this.setMessage("Not enough energy to plant " + (this.selectedPlant === "mushroom" ? "a Mushroom." : "a Radish."));
      return;
    }
    const { x, y } = this.plantingCellCenter(col, row);
    // Store the route in board coordinates, not as a straight screen-space
    // diagonal. The board is perspective-warped, so screen-space lerping makes
    // the farmer appear to float above the soil while changing rows.
    const startBoard = this.boardCoordinates(this.caveman.x, this.caveman.y);
    const targetBoard = this.boardCoordinates(x, y);
    const routeLength = Math.hypot(
      (targetBoard.u - startBoard.u) * GRID_WIDTH,
      (targetBoard.v - startBoard.v) * GRID_HEIGHT
    );
    this.plantingTarget = {
      col, row, x, y, type: this.selectedPlant,
      startU: startBoard.u, startV: startBoard.v,
      startX: this.caveman.x, startY: this.caveman.y, startFacing: this.facing,
      targetU: targetBoard.u, targetV: targetBoard.v,
      routeLength: Math.max(routeLength, 1), progress: 0
    };
    this.setFarmerAnimation("farmer-walk");
    this.facing = x >= this.caveman.x ? 1 : -1;
    this.caveman.scaleX = this.facing;
    this.setMessage("The caveman is walking to the selected soil cell...");
  }

  updatePlantingMovement(dt) {
    if (!this.plantingTarget) return;
    const target = this.plantingTarget;
    // Walk across the calibrated board surface. Bilinear board mapping keeps
    // the feet on the perspective soil plane instead of cutting through it
    // along a straight screen-space line.
    target.progress = Math.min(1, target.progress + (320 * dt) / target.routeLength);
    const u = PhaserMath.Linear(target.startU, target.targetU, target.progress);
    const v = PhaserMath.Linear(target.startV, target.targetV, target.progress);
    const position = this.boardPoint(u, v);
    this.caveman.setPosition(position.x, position.y);
    const horizontalDirection = target.x - this.caveman.x;
    if (Math.abs(horizontalDirection) > 0.5) {
      this.facing = Math.sign(horizontalDirection);
      this.caveman.scaleX = this.facing;
    }
    if (target.progress < 1) return;

    this.caveman.setPosition(target.x, target.y);
    this.plantingTarget = null;
    this.plantSelected(target.col, target.row, target.type, { x: target.startX, y: target.startY, facing: target.startFacing });
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
      if (Number.isFinite(target.facing)) {
        this.facing = target.facing;
        this.caveman.scaleX = this.facing;
      }
      this.farmerForceIdleFrame = true;
      // Finish on the exact original idle frame, not the final frame of the planting/run sheets.
      if (this.cavemanVisual && this.cavemanVisual.active) {
        this.cavemanVisual.stop();
        this.cavemanVisual.setTexture("farmer-idle", 0);
        this.normalizeFarmerFrame();
      }
      this.setFarmerAnimation("farmer-idle");
      this.setMessage("The caveman is back at his starting position.");
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

  plantSelected(col, row, type, returnPosition = null) {
    if (this.gameOver) return;
    if (type !== "radish" && type !== "mushroom") return;
    const config = type === "mushroom" ? MUSHROOM : RADISH;
    if (this.energy < config.cost || this.plants.some((p) => p.alive && p.col === col && p.row === row)) {
      this.setMessage("Planting cancelled: this cell is no longer available."); return;
    }
    this.energy -= config.cost;
    this.farmerPlanting = true;
    this.playFarmerAction("farmer-plant");
    const { x, y } = this.plantingCellCenter(col, row);
    const plant = {
      type, col, row, x, y, hp: config.hp, alive: true,
      cooldown: PhaserMath.Between(250, 650),
      productionTimer: type === "mushroom" ? config.productionInterval : undefined,
      view: type === "mushroom" ? this.drawEnergyMushroom(x, y, row) : this.drawRadish(x, y)
    };
    this.plants.push(plant);
    this.totalPlantsPlanted += 1;
    if (type === "radish") this.hasPlantedDefender = true;
    this.playPlantSound();
    this.updateEmergencyMode();

    // The dedicated planting sprite sheet supplies the bend and recovery.
    // Do not scale the whole character container: that changes apparent body
    // size and foot placement between animation states.

    // Do not let the return movement overlap the planting pose. Start the
    // sprint only after the planting animation has completed and the farmer
    // has returned to his normal upright posture.
    const safePosition = returnPosition || this.lanePoint(-GRID_WIDTH / 2 - 48, row);
    this.returnTarget = null;
    const beginReturnSprint = () => {
      if (!this.caveman?.active || this.gameOver) return;
      this.farmerPlanting = false;
      this.caveman.setScale(1);
      this.returnTarget = { x: safePosition.x, y: safePosition.y, facing: safePosition.facing };
      this.farmerWantsToRun = true;
      this.setFarmerAnimation("farmer-run");
    };

    // The vector fallback has no animation sprite. It must still complete
    // the planting trip instead of dereferencing a missing cavemanVisual.
    if (this.cavemanVisual?.active && this.anims.exists("farmer-plant")) {
      this.cavemanVisual.once("animationcomplete", (animation) => {
        if (animation.key !== "farmer-plant") return;
        beginReturnSprint();
      });
    } else {
      beginReturnSprint();
    }

    this.setMessage(type === "mushroom"
      ? "Energy Mushroom planted! It will produce collectible energy."
      : "Radish planted! The caveman is sprinting back behind the final line.");
  }

  drawEnergyMushroom(x, y, row = 2) {
    const plant = this.add.container(x, y).setDepth(10 + y / 1000);

    if (this.textures.exists("mushroom-character")) {
      const frame = this.textures.getFrame("mushroom-character");
      const rowIndex = PhaserMath.Clamp(row, 0, LANES - 1);
      const laneGap = rowIndex < LANES - 1
        ? this.laneYs[rowIndex + 1] - this.laneYs[rowIndex]
        : this.laneYs[rowIndex] - this.laneYs[rowIndex - 1];
      // Match the artwork scale to the perspective of the selected soil row.
      const perspectiveScale = PhaserMath.Clamp(laneGap / 54, 0.62, 1.08);
      const displayHeight = 78 * perspectiveScale;
      const displayWidth = displayHeight * (frame.realWidth / frame.realHeight);
      const character = this.add.image(
        0, -displayHeight / 2 + 2, "mushroom-character"
      ).setDisplaySize(displayWidth, displayHeight);
      plant.add(character);
    } else {
      // Keep the previous vector mushroom as a safe fallback if the asset
      // cannot be loaded by the browser or is missing from the public bundle.
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
    }

    this.tweens.add({
      targets: plant, scaleY: 1.04, duration: 1250,
      ease: "Sine.easeInOut", yoyo: true, repeat: -1
    });
    return plant;
  }

  drawRadish(x, y) {
    const plant = this.add.container(x, y).setDepth(11);

    if (this.textures.exists("radish-character")) {
      const frame = this.textures.getFrame("radish-character");
      // Reduce the planted radish artwork by one third while preserving
      // its original proportions and the cell-centred planting position.
      const displayHeight = 88 * (2 / 3);
      const displayWidth = displayHeight * (frame.realWidth / frame.realHeight);
      const character = this.add.image(0, -displayHeight / 2 + 2, "radish-character")
        .setDisplaySize(displayWidth, displayHeight);
      plant.add(character);
    } else {
      // Keep a lightweight fallback if the uploaded character image cannot load.
      const g = this.add.graphics();
      g.fillStyle(0xe8d7b4, 1);
      g.fillEllipse(0, -25, 31, 34);
      g.fillStyle(0xf6e8cf, 1);
      g.fillTriangle(-14, -37, 14, -37, 0, -1);
      g.fillStyle(0x4f963f, 1);
      g.fillEllipse(-10, -48, 18, 9);
      g.fillEllipse(1, -54, 12, 18);
      g.fillEllipse(11, -47, 17, 9);
      g.fillStyle(0x302b29, 1);
      g.fillCircle(-6, -25, 2);
      g.fillCircle(6, -25, 2);
      plant.add(g);
    }

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
    const token = this.add.container(plant.x, plant.y - 66).setDepth(35);
    // Brief production feedback: show the energy amount, then clear it quickly.
    const amountLabel = this.add.text(plant.x, plant.y - 105, `+${amount}`, {
      fontFamily: "Arial", fontSize: "17px", color: "#fff2a8",
      fontStyle: "bold", stroke: "#563a72", strokeThickness: 4
    }).setOrigin(0.5).setDepth(36);
    this.tweens.add({
      targets: amountLabel, y: amountLabel.y - 24, alpha: 0,
      duration: 650, ease: "Cubic.easeOut",
      onComplete: () => amountLabel.destroy()
    });
    // The collectible is a miniature of the exact planted mushroom artwork,
    // never a separately drawn geometric mushroom silhouette.
    const glow = this.add.ellipse(0, 1, 42, 18, 0x8d68b5, 0.24);
    let miniature;
    let sparkleX = 13;
    if (this.textures.exists("mushroom-character")) {
      const frame = this.textures.getFrame("mushroom-character");
      const miniatureHeight = 39;
      const miniatureWidth = miniatureHeight * (frame.realWidth / frame.realHeight);
      miniature = this.add.image(0, -2, "mushroom-character")
        .setDisplaySize(miniatureWidth, miniatureHeight)
        .setInteractive({ useHandCursor: true });
      sparkleX = miniatureWidth * 0.34;
    } else {
      const fallback = this.add.graphics();
      fallback.fillStyle(0xf0d7a2, 1);
      fallback.fillRoundedRect(-7, -12, 14, 19, 5);
      fallback.fillStyle(0x8a58b6, 1);
      fallback.fillEllipse(0, -14, 35, 24);
      fallback.fillStyle(0xfff0d2, 1);
      fallback.fillCircle(-6, -13, 2);
      fallback.fillCircle(6, -13, 2);
      token.add(fallback);
      miniature = this.add.zone(0, -2, 48, 48).setInteractive({ useHandCursor: true });
    }
    const sparkle = this.add.text(sparkleX, -17, "+", {
      fontFamily: "Arial", fontSize: "15px", color: "#fff7df",
      fontStyle: "bold", stroke: "#563a72", strokeThickness: 3
    }).setOrigin(0.5);
    token.add([glow, miniature, sparkle]);
    miniature.on("pointerdown", () => {
      if (!token.active || this.gameOver) return;
      this.collectingEnergyToken = true;
      this.playFarmerAction("farmer-collect");
      this.energy = Math.min(300, this.energy + amount);
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
    // The projectile keeps the original lane, speed and collision behavior,
    // but now has a layered golden glow and a short launch flash.
    const lane = this.worldToLane(plant);
    const localX = lane.localX + 22;
    const row = plant.row;
    // Launch from the same raised lane center used by the monsters themselves.
    const position = this.monsterLanePoint(localX, row);
    // Alternate successive thorns between the monster's head and torso.
    const verticalOffset = this.nextProjectileAim === "head" ? -22 : 14;
    this.nextProjectileAim = this.nextProjectileAim === "head" ? "middle" : "head";
    const launchY = position.y + verticalOffset;
    const view = this.add.container(position.x, launchY).setDepth(16);

    const halo = this.add.circle(0, 0, 17, 0xffa52f, 0.16);
    const outerGlow = this.add.circle(0, 0, 11, 0xffc247, 0.34);
    const innerGlow = this.add.circle(0, 0, 6.5, 0xfff0a0, 0.9);
    const thorn = this.add.triangle(0, 0, -10, 6, 12, 0, -10, -6, 0xfff8cf)
      .setStrokeStyle(1.5, 0xffa52f, 1);
    const highlight = this.add.triangle(-1, -1, -7, 2, 7, 0, -7, -2, 0xffffff);
    view.add([halo, outerGlow, innerGlow, thorn, highlight]);

    this.tweens.add({
      targets: [halo, outerGlow],
      alpha: { from: 0.2, to: 0.62 },
      scale: { from: 0.82, to: 1.22 },
      duration: 180,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1
    });
    this.tweens.add({
      targets: innerGlow,
      alpha: { from: 0.72, to: 1 },
      scale: { from: 0.9, to: 1.18 },
      duration: 125,
      yoyo: true,
      repeat: -1
    });

    const muzzleFlash = this.add.circle(position.x, launchY, 13, 0xffe28a, 0.8).setDepth(15);
    this.tweens.add({
      targets: muzzleFlash,
      alpha: 0,
      scale: 2.1,
      duration: 135,
      onComplete: () => muzzleFlash.destroy()
    });

    this.projectiles.push({
      view, localX, row, verticalOffset, speed: 320, damage: COMBAT_BALANCE.plants.radish.projectileDamage, alive: true, trailTimer: 0
    });
    this.playThornSound();
  }

  createProjectileImpact(x, y) {
    const burst = this.add.container(x, y).setDepth(24);
    const flash = this.add.circle(0, 0, 10, 0xfff4b0, 0.95);
    const sparks = [];
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI * 2 * i) / 6;
      const spark = this.add.circle(Math.cos(angle) * 5, Math.sin(angle) * 5, 3, 0xffc247, 1);
      sparks.push(spark);
    }
    burst.add([flash, ...sparks]);
    this.tweens.add({
      targets: burst,
      alpha: 0,
      scale: 2.15,
      duration: 190,
      ease: "Cubic.easeOut",
      onComplete: () => burst.destroy()
    });
  }

  createProjectileTrail(x, y) {
    const spark = this.add.circle(x, y, PhaserMath.Between(2, 4), 0xffc247, 0.72).setDepth(14);
    this.tweens.add({
      targets: spark,
      x: x - PhaserMath.Between(5, 12),
      y: y + PhaserMath.Between(-5, 5),
      alpha: 0,
      scale: 0.15,
      duration: 210,
      ease: "Sine.easeOut",
      onComplete: () => spark.destroy()
    });
  }

  createFootstepDust(x, y, scale = 1) {
    const puff = this.add.container(x, y).setDepth(12);
    const size = PhaserMath.Between(4, 7) * scale;
    const cloud = this.add.ellipse(0, 0, size * 2.2, size, 0xb99a70, 0.34);
    const grit = this.add.circle(PhaserMath.Between(-5, 5) * scale, -2 * scale, Math.max(1, size * 0.32), 0xe0c89c, 0.55);
    puff.add([cloud, grit]);
    this.tweens.add({
      targets: puff, x: x - PhaserMath.Between(8, 17) * scale,
      y: y - PhaserMath.Between(5, 11) * scale, alpha: 0, scale: 1.7,
      duration: 360, ease: "Sine.easeOut", onComplete: () => puff.destroy()
    });
  }

  createStoneHitDust(x, y, scale = 1) {
    const burst = this.add.container(x, y).setDepth(25);
    const colors = [0xd9c49b, 0x9e8763, 0xe7d8b8, 0x76563a];
    const bits = [];
    for (let i = 0; i < 7; i += 1) {
      const bit = this.add.circle(0, 0, PhaserMath.Between(2, 4) * scale,
        colors[i % colors.length], 0.9);
      bits.push(bit);
    }
    burst.add(bits);
    bits.forEach((bit, index) => {
      const angle = (Math.PI * 2 * index) / bits.length;
      this.tweens.add({
        targets: bit,
        x: Math.cos(angle) * PhaserMath.Between(10, 20) * scale,
        y: Math.sin(angle) * PhaserMath.Between(8, 17) * scale,
        alpha: 0, scale: 0.2, duration: 260, ease: "Cubic.easeOut"
      });
    });
    this.time.delayedCall(280, () => burst.destroy());
  }

  createMonsterDefeatBurst(x, y, scale = 1) {
    const burst = this.add.container(x, y).setDepth(26);
    const puff = this.add.ellipse(0, 8, 42 * scale, 18 * scale, 0xc4a77a, 0.48);
    const bones = [];
    for (let i = 0; i < 4; i += 1) {
      const bone = this.add.rectangle(0, 0, 12 * scale, 3 * scale, 0xe7d9b8, 0.95);
      bones.push(bone);
    }
    burst.add([puff, ...bones]);
    bones.forEach((bone, index) => {
      const angle = (Math.PI * 2 * index) / bones.length;
      this.tweens.add({
        targets: bone,
        x: Math.cos(angle) * 23 * scale,
        y: Math.sin(angle) * 18 * scale - 7 * scale,
        angle: PhaserMath.Between(-100, 100),
        alpha: 0, duration: 340, ease: "Cubic.easeOut"
      });
    });
    this.tweens.add({
      targets: puff, scale: 1.8, alpha: 0, duration: 330,
      onComplete: () => burst.destroy()
    });
  }

  monsterArchetypeFor(spawnIndex) {
    // Enemy roles arrive in measured steps: the opening raids teach the
    // player the basic threat before introducing speed and armor.
    if (this.wave >= 5 && (spawnIndex + 1) % 5 === 0) return "stonehide";
    if (this.wave >= 3 && spawnIndex % 3 === 1) return "dust-skitter";
    return "cave-brute";
  }

  spawnMonster() {
    const row = PhaserMath.Between(0, LANES - 1);
    const spawnIndex = this.spawnedThisWave;
    const archetype = this.monsterArchetypeFor(spawnIndex);
    const profiles = {
      "cave-brute": {
        speedMultiplier: 1, maxSpeed: 30,
        plantDamage: 16, attackInterval: 1150, incomingDamage: 1,
        widthScale: 1, heightScale: 1, wobbleDuration: 520
      },
      "dust-skitter": {
        speedMultiplier: 1.55, maxSpeed: 34,
        plantDamage: 10, attackInterval: 920, incomingDamage: 1,
        widthScale: 0.8, heightScale: 0.88, wobbleDuration: 350
      },
      "stonehide": {
        speedMultiplier: 0.62, maxSpeed: 19,
        plantDamage: 23, attackInterval: 1450, incomingDamage: 0.7,
        widthScale: 1.18, heightScale: 1.14, wobbleDuration: 760
      }
    };
    const profile = profiles[archetype];
    const durability = COMBAT_BALANCE.monsters[archetype];
    const hp = durability.hitsToDefeat
      ? COMBAT_BALANCE.plants.radish.projectileDamage * durability.hitsToDefeat
      : Math.round((65 + Math.floor(this.wave * 4)) * durability.hpMultiplier);
    const baseSpeed = Math.min(30, 8 + (this.wave - 1) * 1.35);
    const speed = Math.min(profile.maxSpeed, baseSpeed * profile.speedMultiplier);
    const spawn = this.monsterLanePoint(SPAWN_LOCAL_X, row);
    const view = this.add.container(spawn.x, spawn.y).setDepth(10 + spawn.y / 1000);

    // Scale each creature against the measured gap of its perspective lane.
    const laneGap = row < LANES - 1
      ? this.laneYs[row + 1] - this.laneYs[row]
      : this.laneYs[row] - this.laneYs[row - 1];
    const monsterScale = PhaserMath.Clamp(laneGap / 108, 0.28, 0.62);
    view.setScale(monsterScale * profile.widthScale, monsterScale * profile.heightScale);
    view.setPosition(spawn.x, spawn.y);

    const g = this.add.graphics();
    const bodyColor = archetype === "stonehide" ? 0x68675b
      : archetype === "dust-skitter" ? 0x895b3a : 0x765036;
    const headColor = archetype === "stonehide" ? 0x898578
      : archetype === "dust-skitter" ? 0xb18154 : 0x9a7048;

    // Original prehistoric raider silhouette shared by the enemy family.
    g.fillStyle(0x2c2118, 0.9); g.fillEllipse(0, 18, 54, 68);
    g.fillStyle(bodyColor, 1);
    g.fillPoints([
      {x:-20,y:-4},{x:18,y:-7},{x:29,y:24},{x:19,y:43},
      {x:8,y:31},{x:0,y:48},{x:-9,y:31},{x:-26,y:42},{x:-30,y:16}
    ], true);
    g.fillStyle(headColor, 1); g.fillEllipse(0, -22, 53, 49);
    g.fillStyle(0x49301e, 1);
    g.fillEllipse(0, -39, 51, 18);
    g.fillTriangle(-22,-37,-12,-55,-5,-35);
    g.fillTriangle(-7,-39,5,-57,12,-34);
    g.fillTriangle(9,-36,25,-49,22,-27);
    g.fillStyle(0x3b2118, 1);
    g.fillEllipse(-10, -23, 8, 11); g.fillEllipse(11, -23, 8, 11);
    g.fillStyle(0xf1a34d, 1);
    g.fillCircle(-10, -23, 3.2); g.fillCircle(11, -23, 3.2);
    g.fillStyle(0x2a1a13, 1); g.fillEllipse(0, -8, 18, 10);
    g.fillStyle(0xf0dfbd, 1);
    g.fillTriangle(-14, -8, -9, 7, -4, -7);
    g.fillTriangle(4, -7, 9, 7, 14, -8);
    g.fillStyle(0x513321, 1);
    g.fillEllipse(-18, -5, 10, 18); g.fillEllipse(18, -5, 10, 18);
    g.lineStyle(7, bodyColor, 1);
    g.lineBetween(-19, 1, -35, 20); g.lineBetween(19, 1, 35, 20);
    g.lineStyle(9, 0x4a3020, 1);
    g.lineBetween(-11, 40, -19, 57); g.lineBetween(11, 40, 19, 57);
    g.lineStyle(2, 0xe1d0a5, 1);
    g.beginPath(); g.arc(0, 8, 17, 0.25, Math.PI - 0.25); g.strokePath();
    g.fillStyle(0xf0dfbd, 1);
    g.fillTriangle(0, 15, -4, 25, 4, 25);

    if (archetype === "dust-skitter") {
      // Lean horn-like ear guards and ankle wraps make this quick raider
      // readable at a glance without borrowing another game's creature art.
      g.fillStyle(0xd39b4e, 1);
      g.fillTriangle(-18, -39, -31, -58, -25, -32);
      g.fillTriangle(18, -39, 31, -58, 25, -32);
      g.lineStyle(3, 0x54331f, 1);
      g.lineBetween(-13, 43, -25, 56);
      g.lineBetween(13, 43, 25, 56);
      g.fillStyle(0xd8b77c, 1);
      g.fillEllipse(-20, 21, 11, 5);
      g.fillEllipse(20, 21, 11, 5);
    } else if (archetype === "stonehide") {
      // Layered shale plates are a distinct defensive trait, not a copied
      // shield or costume from the genre reference.
      const chestPlate = [
        {x:-23,y:0},{x:-13,y:-8},{x:13,y:-8},{x:23,y:1},
        {x:18,y:29},{x:0,y:39},{x:-18,y:29}
      ];
      g.fillStyle(0x555b56, 1); g.fillPoints(chestPlate, true);
      g.lineStyle(3, 0xb5ad91, 1); g.strokePoints(chestPlate, true);
      g.fillStyle(0x777c70, 1);
      g.fillPoints([{x:-31,y:-4},{x:-23,y:-16},{x:-11,y:-5},{x:-16,y:12}], true);
      g.fillPoints([{x:31,y:-4},{x:23,y:-16},{x:11,y:-5},{x:16,y:12}], true);
      g.fillStyle(0x454c48, 1);
      g.fillRoundedRect(-23, -47, 46, 10, 4);
      g.lineStyle(2, 0xd0c5a5, 1);
      g.lineBetween(-15, 5, 0, 13);
      g.lineBetween(0, 13, 15, 5);
    } else {
      g.fillStyle(0x6c8b45, 1);
      g.fillEllipse(-21, 17, 9, 5); g.fillEllipse(22, 13, 8, 5);
    }

    view.add(g);

    // Stonehide raises a clearly visible shale ring while it braces over prey.
    let braceCue = null;
    if (archetype === "stonehide") {
      braceCue = this.add.graphics();
      braceCue.lineStyle(4, 0xd8d0b5, 0.92);
      braceCue.strokeCircle(0, 6, 45);
      braceCue.lineStyle(2, 0xa9a18b, 0.9);
      braceCue.beginPath();
      braceCue.arc(0, 6, 52, Math.PI * 1.08, Math.PI * 1.92, false);
      braceCue.strokePath();
      braceCue.setVisible(false);
      view.add(braceCue);
    }

    view.setDepth(8);
    const shadow = this.add.ellipse(
      spawn.x, spawn.y + 2,
      48 * monsterScale * profile.widthScale,
      12 * monsterScale,
      0x21170f, 0.32
    ).setDepth(7);

    this.tweens.add({
      targets: view, angle: { from: -2.5, to: 2.5 },
      duration: profile.wobbleDuration, ease: "Sine.easeInOut",
      yoyo: true, repeat: -1
    });

    if (archetype === "dust-skitter" && this.wave === 3 && spawnIndex === 1) {
      this.setMessage("A Dust Skitter has joined the raid: quick, but easier to bring down.");
    } else if (archetype === "stonehide" && spawnIndex === 4) {
      this.setMessage("A Stonehide is approaching: slow, heavily plated, and tough to stop.");
    }

    this.monsters.push({
      kind: archetype,
      row, x: spawn.x, y: spawn.y, localX: SPAWN_LOCAL_X, hp,
      speed,
      plantDamage: profile.plantDamage,
      attackInterval: profile.attackInterval,
      incomingDamageMultiplier: profile.incomingDamage,
      // The skitter alternates normal movement with short, readable bursts.
      burstCooldown: archetype === "dust-skitter" ? PhaserMath.Between(1500, 2300) : 0,
      burstRemaining: 0,
      braced: false,
      braceCue,
      maxHp: hp,
      hitFlashGraphic: g, hitFlashTimer: null,
      attackCooldown: 0, alive: true, view, shadow, dustTimer: 0
    });
  }

  updateMonsters(dt, delta) {
    for (const monster of this.monsters) {
      if (!monster.alive) continue;
      monster.attackCooldown -= delta;
      const blocker = this.plants.filter((p) => p.alive && p.row === monster.row && this.worldToLane(p).localX < monster.localX)
        .sort((a, b) => this.worldToLane(b).localX - this.worldToLane(a).localX)[0];
      const blockerLocalX = blocker ? this.worldToLane(blocker).localX : -Infinity;
      const withinBiteRange = Boolean(blocker && monster.localX - blockerLocalX <= 43);

      // A Stonehide locks its shale plates into place while chewing a plant.
      // This state also changes how much damage incoming hits can inflict.
      if (monster.kind === "stonehide") {
        monster.braced = withinBiteRange;
        if (monster.braceCue && monster.braceCue.visible !== monster.braced) {
          monster.braceCue.setVisible(monster.braced);
        }
      }

      if (withinBiteRange) {
        if (monster.attackCooldown <= 0) {
          blocker.hp -= monster.plantDamage; monster.attackCooldown = monster.attackInterval;
          this.playMonsterBiteSound();
          this.tweens.add({ targets: monster.view, x: monster.view.x - 4, scaleY: monster.view.scaleY * 0.94, duration: 85, yoyo: true });
          if (blocker.hp <= 0) this.destroyPlant(blocker);
        }
        continue;
      }
      if (!blocker && monster.localX <= HOME_LOCAL_X + 34) {
        // A breach is not an instant defeat: the monster reaches the home
        // boundary and damages its health on its normal attack cadence.
        monster.localX = HOME_LOCAL_X + 34;
        const homePosition = this.monsterLanePoint(monster.localX, monster.row);
        monster.x = homePosition.x;
        monster.y = homePosition.y;
        monster.view.setPosition(homePosition.x, homePosition.y);
        if (monster.shadow && monster.shadow.active) {
          monster.shadow.setPosition(homePosition.x, homePosition.y + 2);
        }
        if (monster.attackCooldown <= 0) {
          this.houseHealth = Math.max(0, this.houseHealth - monster.plantDamage);
          monster.attackCooldown = monster.attackInterval;
          this.playMonsterBiteSound();
          this.setMessage("The monsters are attacking the farmhouse! Home health: " + this.houseHealth + "%");
          if (this.houseHealth <= 0) {
            this.endGame(false);
            return;
          }
        }
        continue;
      }

      let movementSpeed = monster.speed;
      if (monster.kind === "dust-skitter") {
        monster.burstCooldown -= delta;
        if (monster.burstCooldown <= 0 && monster.burstRemaining <= 0) {
          monster.burstRemaining = 420;
          monster.burstCooldown = PhaserMath.Between(3000, 3900);
          this.createFootstepDust(monster.x - 10, monster.y + 3, monster.view.scaleY * 1.15);
          this.createFootstepDust(monster.x + 4, monster.y + 1, monster.view.scaleY);
        }
        if (monster.burstRemaining > 0) {
          monster.burstRemaining = Math.max(0, monster.burstRemaining - delta);
          movementSpeed *= 1.65;
        }
      }

      monster.localX -= movementSpeed * dt;
      const position = this.monsterLanePoint(monster.localX, monster.row);
      monster.x = position.x; monster.y = position.y;
      monster.view.setPosition(position.x, position.y);
      if (monster.shadow && monster.shadow.active) {
        monster.shadow.setPosition(position.x, position.y + 2);
      }
      monster.dustTimer -= dt * 1000;
      if (monster.dustTimer <= 0) {
        this.createFootstepDust(position.x - 9, position.y + 2, monster.view.scaleY);
        monster.dustTimer = monster.kind === "dust-skitter" && monster.burstRemaining > 0 ? 62 : 155;
      }
    }
    this.monsters = this.monsters.filter((m) => m.alive);
  }

  updateProjectiles(dt) {
    for (const shot of this.projectiles) {
      if (!shot.alive) continue;
      shot.localX += shot.speed * dt;
      const position = this.monsterLanePoint(shot.localX, shot.row);
      shot.view.setPosition(position.x, position.y + shot.verticalOffset);

      // Leave small fading embers behind the glowing thorn as it travels.
      shot.trailTimer -= dt * 1000;
      if (shot.trailTimer <= 0) {
        this.createProjectileTrail(position.x - 5, position.y + shot.verticalOffset);
        shot.trailTimer = 48;
      }

      // Collision is checked only against monsters occupying this same lane.
      const hit = this.monsters.find((monster) =>
        monster.alive &&
        monster.row === shot.row &&
        Math.abs(monster.localX - shot.localX) <= 24
      );
      if (hit) {
        this.createProjectileImpact(position.x, position.y + shot.verticalOffset);
        this.applyMonsterDamage(
          hit, shot.damage * this.incomingMonsterDamageMultiplier(hit)
        );
        if (hit.view && hit.view.active) {
          this.tweens.killTweensOf(hit.view);
          this.tweens.add({
            targets: hit.view, x: hit.view.x - 7, angle: hit.view.angle - 7,
            duration: 55, yoyo: true, repeat: 1, ease: "Sine.easeOut"
          });
          this.createStoneHitDust(position.x, position.y + shot.verticalOffset + 4, hit.view.scaleY);
        }
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

  incomingMonsterDamageMultiplier(monster) {
    const armorMultiplier = monster.incomingDamageMultiplier || 1;
    // Bracing cuts a further 45% from incoming hits, but only while the
    // Stonehide is stationary and actively biting a plant.
    return monster.braced ? armorMultiplier * 0.55 : armorMultiplier;
  }

  flashMonsterOnHit(monster) {
    if (!monster || !monster.alive || !monster.hitFlashGraphic || !monster.hitFlashGraphic.active) return;
    // Brief additive highlight makes the creature visibly flash on impact.
    // Keep its alpha and scale untouched so it never fades or vanishes on a hit.
    if (monster.hitFlashTimer) monster.hitFlashTimer.remove(false);
    monster.hitFlashGraphic.setBlendMode(1); // Phaser BlendModes.ADD
    monster.hitFlashTimer = this.time.delayedCall(85, () => {
      if (monster.hitFlashGraphic && monster.hitFlashGraphic.active) {
        monster.hitFlashGraphic.setBlendMode(0); // Phaser BlendModes.NORMAL
      }
      monster.hitFlashTimer = null;
    });
  }

  applyMonsterDamage(monster, amount) {
    if (!monster || !monster.alive || amount <= 0) return;
    monster.hp = Math.max(0, monster.hp - amount);
    this.flashMonsterOnHit(monster);
    this.damageMonsterIfNeeded(monster);
  }

  damageMonsterIfNeeded(monster) {
    if (monster.hp > 0 || !monster.alive) return;
    monster.alive = false;
    if (monster.hitFlashTimer) {
      monster.hitFlashTimer.remove(false);
      monster.hitFlashTimer = null;
    }
    if (monster.shadow && monster.shadow.active) monster.shadow.destroy();
    this.createMonsterDefeatBurst(monster.x, monster.y, monster.view && monster.view.scaleY);
    // Remove the complete creature container immediately. This guarantees
    // that no child graphic or hit-flash layer can remain visible after death.
    if (monster.view && monster.view.active) {
      this.tweens.killTweensOf(monster.view);
      monster.view.destroy(true);
    }
    this.energy = Math.min(300, this.energy + 8);
    this.totalDefeatedMonsters += 1;
    this.waveDefeatedMonsters += 1;
  }

  uprootPlant(plant) {
    if (!plant || !plant.alive || this.gameOver) return;
    plant.alive = false;
    plant.view.destroy();
    this.playFarmerAction("farmer-uproot");
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
    this.playFarmerAction("farmer-attack");
    this.tweens.add({ targets: this.caveman, angle: this.facing * 22, duration: 100, yoyo: true });
    if (target) {
      this.applyMonsterDamage(
        target, 42 * this.incomingMonsterDamageMultiplier(target)
      );
      this.setMessage("Club hit!");
    }
    else this.setMessage("No monster is close enough for the club.");
  }

  nearestLane(y) {
    const local = this.boardCoordinates(this.caveman.x, y);
    return PhaserMath.Clamp(Math.floor(local.v * LANES), 0, LANES - 1);
  }

  checkWaveProgress() {
    if (this.gameOver || this.spawnedThisWave < this.waveSize || this.monsters.length > 0) return;

    const clearedWave = this.wave;
    if (clearedWave === this.totalWaves) {
      // The final wave is complete only after every one of its monsters
      // has spawned and the battlefield contains no living monsters.
      this.endGame(true);
      return;
    }

    this.wave += 1;
    this.spawnedThisWave = 0;
    this.waveDefeatedMonsters = 0;
    this.waveSize = PHASE_ONE_WAVE_SIZES[this.wave - 1];
    this.spawnTimer = 3200;
    this.setMessage(
      "Wave " + clearedWave + " cleared. Wave " + this.wave +
      " is gathering: " + this.waveSize + " monsters incoming."
    );
  }

  playVictoryMusic() {
    if (this.effectsVolume <= 0) return;
    const audioContext = this.sound && this.sound.context;
    if (!audioContext || typeof audioContext.createOscillator !== "function") return;
    try {
      const start = audioContext.currentTime + 0.05;
      const notes = [392, 493.88, 587.33, 783.99];
      notes.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const noteStart = start + index * 0.16;
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(frequency, noteStart);
        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.12 * this.effectsVolume / 100, noteStart + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.34);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(noteStart);
        oscillator.stop(noteStart + 0.36);
      });
    } catch (error) {
      // The result screen must remain available when browser audio is unavailable.
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
        gain.gain.exponentialRampToValueAtTime(0.16 * this.effectsVolume / 100, noteStart + 0.035);
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
    this.farmerPlanting = false;
    this.setMessage(won ? "VICTORY! The farm is safe." : "GAME OVER — The monsters reached the final line.");
    this.add.rectangle(560, 340, 1120, 680, 0x10170f, 0.72).setDepth(60);
    if (won) {
      this.stopBackgroundMusic();
      this.add.rectangle(560, 340, 650, 330, 0x79502e, 0.98)
        .setStrokeStyle(6, 0x392417).setDepth(61);
      this.add.text(560, 235, "VICTORY!", {
        fontFamily: "Arial", fontSize: "54px", color: "#fff2c8", fontStyle: "bold",
        stroke: "#392417", strokeThickness: 5
      }).setOrigin(0.5).setDepth(62);
      const elapsedSeconds = Math.floor(this.elapsedBattleMs / 1000);
      const minutes = Math.floor(elapsedSeconds / 60);
      const seconds = String(elapsedSeconds % 60).padStart(2, "0");
      const summary = [
        "All " + this.totalWaves + " waves cleared",
        this.totalDefeatedMonsters + " / " + this.totalSpawnedMonsters + " monsters defeated",
        this.totalPlantsPlanted + " plants planted",
        "Time: " + minutes + ":" + seconds,
        "Energy remaining: " + this.energy
      ].join("\n");
      this.add.text(560, 330, summary, {
        fontFamily: "Georgia", fontSize: "19px", color: "#fff0c8",
        align: "center", lineSpacing: 8, fontStyle: "bold"
      }).setOrigin(0.5).setDepth(62);
      this.createGameOverButton(455, 465, "PLAY AGAIN", 0x9bc66e, () => this.scene.restart());
      this.createGameOverButton(665, 465, "HOME", 0xe5c27d, () => {
        if (typeof window !== "undefined") window.location.assign("/");
      });
      this.playVictoryMusic();
      return;
    }
    const title = this.add.text(560, 255, "FARM LOST", {
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

    const elapsedSeconds = Math.floor(this.elapsedBattleMs / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = String(elapsedSeconds % 60).padStart(2, "0");
    const summary = [
      "Reached wave " + Math.min(this.wave, this.totalWaves) + " of " + this.totalWaves,
      this.totalDefeatedMonsters + " monsters defeated",
      this.totalPlantsPlanted + " plants planted",
      "Time survived: " + minutes + ":" + seconds
    ].join("\n");
    this.add.text(560, 355, summary, {
      fontFamily: "Georgia", fontSize: "18px", color: "#fff0c8",
      align: "center", lineSpacing: 7, fontStyle: "bold"
    }).setOrigin(0.5).setDepth(62);

    this.stopBackgroundMusic();
    this.createGameOverButton(455, 465, "RETRY", 0x9bc66e, () => this.scene.restart());
    this.createGameOverButton(665, 465, "HOME", 0xe5c27d, () => {
      if (typeof window !== "undefined") window.location.assign("/");
    });
    this.playDefeatMusic();
  }

  createGameOverButton(x, y, label, color, action) {
    const button = this.add.container(x, y).setDepth(63);
    const shadow = this.add.rectangle(2, 4, 190, 58, 0x21150d, 0.55);
    const background = this.add.rectangle(0, 0, 190, 58, 0xb88950, 1)
      .setStrokeStyle(4, 0x392417)
      .setInteractive({ useHandCursor: true });
    const inset = this.add.rectangle(0, 0, 180, 48, color, 1).setStrokeStyle(1, 0xf0d59a);
    const text = this.add.text(0, 0, label, {
      fontFamily: "Georgia", fontSize: "16px", color: "#392719", fontStyle: "bold",
      stroke: "#f3d9a4", strokeThickness: 1
    }).setOrigin(0.5);
    button.add([shadow, background, inset, text]);
    background.on("pointerover", () => background.setScale(1.05));
    background.on("pointerout", () => background.setScale(1));
    background.on("pointerdown", action);
    return button;
  }

  setMessage(message) { this.messageText.setText(message); }

  refreshHud() {
    this.hudText.setText(
      "ENERGY  " + this.energy + "     HOME  " + this.houseHealth + "%     RADISHES  " +
      this.livingPlantCount() + "     KILLS  " + this.totalDefeatedMonsters + "/" + PHASE_ONE_TOTAL_MONSTERS
    );
    this.waveText.setText(
      "WAVE " + Math.min(this.wave, this.totalWaves) + "/" + this.totalWaves +
      "  ·  " + this.waveDefeatedMonsters + "/" + this.waveSize + " DOWN" +
      (this.emergencyMode ? "  ·  LAST STAND" : "")
    );
  }
}
