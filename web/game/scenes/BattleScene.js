import { Scene, Input, Math as PhaserMath } from "phaser";
import { translate } from "../../app/LocaleProvider";
import { createSeededRandom } from "../rules/seededRandom.mjs";
import { createCombatEventLog, appendCombatEvent } from "../rules/combatEventLog.mjs";
import gridCalibration from "../data/farm-grid-calibration.json";
import soundAssets from "../data/sound-assets.json";
import {
  PHASE_ONE_WAVE_SIZES,
  PHASE_ONE_TOTAL_MONSTERS,
  INITIAL_ENERGY,
  MUSHROOM_PICKUP_TTL_MS,
  loadSavedCoins,
  saveCoins,
  RADISH_CONFIG,
  MUSHROOM_CONFIG,
  TOMATO_CONFIG,
  PUMPKIN_CONFIG,
  ONION_CONFIG,
  collectEnergy,
  isWaveComplete,
  isPhaseOneVictory,
  unlockNextStage
} from "../rules/phaseOneRules.mjs";
import {
  resolvePlantPlacement,
  resolvePlantUproot,
  applyHitPointsDamage,
  resolveMonsterLaneStep,
  resolveProjectileLaneStep,
  selectLaneBlocker,
  selectProjectileTarget,
  selectFarmerMeleeTarget,
  selectDragonFireballTarget,
  advanceCooldown,
  resolveBiteAttack,
  resolveDustSkitterMotionStep,
  resolveWaveSpawnStep,
  resolveMonsterArchetype
} from "../rules/combatSimulation.mjs";
import {
  PHASE_ONE_DRAGON,
  PHASE_ONE_PLANTS,
  PHASE_ONE_FARMER,
  PHASE_ONE_TIMING,
  PHASE_ONE_REWARDS,
  getMonsterCombatStats,
  getStonehideIncomingDamageMultiplier
} from "../rules/phaseOneCombatContract.mjs";

const LANES = gridCalibration.grid.rows;
const COLUMNS = gridCalibration.grid.columns;
const GRID_NODES = gridCalibration.grid.controlPoints;
const GRID_WIDTH = GRID_NODES[0][COLUMNS].x - GRID_NODES[0][0].x;
const GRID_HEIGHT = GRID_NODES[LANES][0].y - GRID_NODES[0][0].y;
const GRID_CENTER_X = (GRID_NODES[0][0].x + GRID_NODES[LANES][COLUMNS].x) / 2;
const GRID_CENTER_Y = (GRID_NODES[0][0].y + GRID_NODES[LANES][0].y) / 2;
const CELL_W = GRID_WIDTH / COLUMNS;
const CELL_H = GRID_HEIGHT / LANES;
// Reversible visual rarity palette for the current hyena archetypes.
// White is the baseline; stronger archetypes receive progressively richer tints.
const MONSTER_TIER_TINTS = {
  "dust-skitter": 0xd7e1e8, // lighter scout: below standard durability
  "cave-brute": 0xffffff,  // standard hyena
  "stonehide": 0x579bff,   // reinforced hyena
  "alpha-brute": 0xffc247  // giant alpha
};
const HOME_LOCAL_X = -300;
const CAVEMAN_RETURN_SPEED = 420;
const SPAWN_LOCAL_X = GRID_WIDTH / 2 + 28;

export default class BattleScene extends Scene {
  constructor() { super("BattleScene"); }

  preload() {
    this.load.image("farm-battlefield", "/assets/backgrounds/farm-battlefield.jpeg");
    this.load.image("radish-character", "/assets/plants/radish.png");
    this.load.image("mushroom-character", "/assets/plants/mushroom.png");
    this.load.image("tomato-character", "/assets/plants/tomato.png");
    this.load.image("pumpkin-character", "/assets/plants/pumpkin.png");
    this.load.image("onion-character", "/assets/plants/Onion.png");
    this.load.spritesheet("gold-coin", "/assets/items/currency/gold-coin.png", { frameWidth: 170, frameHeight: 170 });
    this.load.spritesheet("farmer-run", "/assets/characters/farmer/farmer-run.png", { frameWidth: 360, frameHeight: 430 });
    this.load.spritesheet("farmer-walk", "/assets/characters/farmer/farmer-walk.png", { frameWidth: 360, frameHeight: 430 });
    this.load.spritesheet("farmer-jump", "/assets/characters/farmer/farmer-jump.png", { frameWidth: 216, frameHeight: 720 });
    this.load.spritesheet("farmer-idle", "/assets/characters/farmer/farmer-idle.png", { frameWidth: 540, frameHeight: 360 });
    this.load.spritesheet("farmer-plant", "/assets/characters/farmer/farmer-plant.png", {
      frameWidth: 360,
      frameHeight: 430,
      margin: 0,
      spacing: 0
    });
    this.load.spritesheet("farmer-collect", "/assets/characters/farmer/farmer-collect.png", { frameWidth: 180, frameHeight: 360 });
    this.load.spritesheet("farmer-uproot", "/assets/characters/farmer/farmer-uproot.png", { frameWidth: 360, frameHeight: 430 });
    this.load.spritesheet("farmer-attack", "/assets/characters/farmer/farmer-attack.png", { frameWidth: 180, frameHeight: 360 });
    this.load.spritesheet("farmer-hit", "/assets/characters/farmer/farmer-hit.png", { frameWidth: 152, frameHeight: 430 });
    this.load.spritesheet("farmer-death", "/assets/characters/farmer/farmer-death.png", { frameWidth: 152, frameHeight: 430 });
    // Optional authored story sheets; missing files do not block the battle.
    this.load.spritesheet("farmer-sling", "/assets/characters/farmer/farmer-sling.png", { frameWidth: 360, frameHeight: 430 });
    this.load.spritesheet("farmer-rescue", "/assets/characters/farmer/farmer-rescue.png", { frameWidth: 360, frameHeight: 430 });
    this.load.spritesheet("farmer-carry", "/assets/characters/farmer/farmer-carry.png", { frameWidth: 360, frameHeight: 430 });
    this.load.spritesheet("dragon-boss", "/assets/characters/monsters/dragon/dragon-boss.png", { frameWidth: 512, frameHeight: 512 });
    this.load.image("phase-one-princess-captive", "/assets/characters/princess/princess-captive.png");
    this.load.image("phase-one-princess-rescued", "/assets/characters/princess/princess-rescued.png");
    this.load.image("phase-one-emblem", "/assets/levels/phase-1-emblem.png");

    // These four hyena sheets now share one standardized 360x298 frame grid.
    this.load.spritesheet("hyena-idle", "/assets/characters/monsters/hyena/hyena-idle.png", { frameWidth: 360, frameHeight: 298 });
    this.load.spritesheet("hyena-walk", "/assets/characters/monsters/hyena/hyena-walk.png", { frameWidth: 360, frameHeight: 298 });
    this.load.spritesheet("hyena-run", "/assets/characters/monsters/hyena/hyena-run.png", { frameWidth: 360, frameHeight: 296 });
    this.load.spritesheet("hyena-bite", "/assets/characters/monsters/hyena/hyena-bite.png", { frameWidth: 360, frameHeight: 298 });
    this.load.spritesheet("hyena-hit", "/assets/characters/monsters/hyena/hyena-hit.png", { frameWidth: 360, frameHeight: 894 });
    this.load.spritesheet("hyena-death", "/assets/characters/monsters/hyena/hyena-death.png", { frameWidth: 360, frameHeight: 447 });
    // The jump sheet has two different row layouts, so register it as an image
    // and add its eight frames with explicit source rectangles below.
    this.load.image("hyena-jump", "/assets/characters/monsters/hyena/hyena-jump.png");
    for (const asset of soundAssets.assets) {
      this.load.audio(asset.key, asset.path);
    }
    this.load.on("loaderror", (file) => {
      if (file.key === "farm-battlefield") this.backgroundAssetFailed = true;
      if (file.key === "radish-character") this.radishAssetFailed = true;
      if (file.key === "mushroom-character") this.mushroomAssetFailed = true;
      if (["tomato-character", "pumpkin-character", "onion-character"].includes(file.key)) {
        this.optionalPlantAssetFailures = this.optionalPlantAssetFailures || [];
        this.optionalPlantAssetFailures.push(file.key);
      }
      if (file.key.startsWith("farmer-")) this.farmerAssetFailed = true;
      if (["hyena-idle", "hyena-walk", "hyena-run", "hyena-bite"].includes(file.key)) this.hyenaAssetFailed = true;
      if (file.key.startsWith("sfx-")) {
        this.failedSoundAssets = this.failedSoundAssets || [];
        this.failedSoundAssets.push(file.key);
      }
    });
  }

  create() {
    this.isPaused = false;
    // Client-local deterministic seed for reproducible development sessions only.
    // The authoritative server must issue and retain its own seed per game session.
    const seedBuffer = new Uint32Array(1);
    if (window.crypto?.getRandomValues) window.crypto.getRandomValues(seedBuffer);
    else seedBuffer[0] = Date.now() >>> 0;
    this.simulationSeed = seedBuffer[0];
    this.simulationRandom = createSeededRandom(this.simulationSeed);
    this.combatEventLog = createCombatEventLog({ seed: this.simulationSeed, rulesVersion: "phase-one-v1" });
    this.languageChangeHandler = () => {
      this.refreshHud();
      if (this.lastMessage) this.setMessage(this.lastMessage);
      const refreshLocalized = (items) => items.forEach((item) => {
        const key = item?.getData?.("localeKey");
        if (key && item.setText) item.setText(translate(key, window.localStorage.getItem("farmVsMonsters.language") || "ar"));
        if (item?.list) refreshLocalized(item.list);
      });
      refreshLocalized(this.children.list);
    };
    window.addEventListener("farm-language-change", this.languageChangeHandler);
    this.events.once("shutdown", () => window.removeEventListener("farm-language-change", this.languageChangeHandler));
    this.energy = INITIAL_ENERGY;
    let savedCoins = 0;
    try {
      savedCoins = loadSavedCoins(window.localStorage);
    } catch {
      // The battle remains playable when browser storage is unavailable.
    }
    this.coins = savedCoins;
    this.registry.set("coins", this.coins);
    this.houseHealth = 100;
    this.wave = 1;
    this.totalWaves = PHASE_ONE_WAVE_SIZES.length;
    this.spawnedThisWave = 0;
    this.waveDefeatedMonsters = 0;
    this.waveSize = PHASE_ONE_WAVE_SIZES[0];
    this.totalSpawnedMonsters = 0;
    this.totalDefeatedMonsters = 0;
    this.totalPlantsPlanted = 0;
    this.energyCollected = 0;
    this.elapsedBattleMs = 0;
    this.combatClockMs = 0;
    this.spawnTimer = PHASE_ONE_TIMING.firstMonsterSpawnDelayMs;
    this.waveIntermissionMs = 0;
    this.selectedPlant = null;
    this.plants = [];
    this.monsters = [];
    this.projectiles = [];
    this.energyPickups = [];
    this.nextEnergyPickupId = 1;
    this.sfxCooldowns = new Map();
    this.farmerFootstepCooldownMs = 0;
    this.nextProjectileAim = "head";
    this.collectingEnergyToken = false;
    this.laneYs = Array.from({ length: LANES }, (_, row) => this.gridCellCenter(0, row).y);
    this.emergencyMode = false;
    this.hasPlantedDefender = false;
    this.facing = 1;
    this.plantingTarget = null;
    this.returnTarget = null;
    this.farmerPlanting = false;
    this.phaseOneStoryState = "battle";
    this.storySequenceActive = false;
    this.dragonBoss = null;
    this.princessActor = null;
    this.gameOver = false;
    this.hyenaAnimationsReady = this.createHyenaAnimations();
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
    this.createCollectionMenuControl();
    this.createQuickCollectionButtons();
    this.createCaveman();
    this.bindInput();
    this.events.once("shutdown", () => {
      this.audioSceneShuttingDown = true;
      this.stopBackgroundMusic();
    });
    this.refreshHud();
    this.setMessage(this.textures.exists("farm-battlefield")
      ? "Choose a plant card, then click an empty soil cell. Tomato and Onion attack; Pumpkin blocks."
      : "Temporary farm art active. Choose a plant card, then click an empty soil cell.");
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
    this.add.text(145, 386, translate("PRINCESS", window.localStorage.getItem("farmVsMonsters.language") || "ar"), { fontFamily: "Arial", fontSize: "10px", color: "#fff4d4", fontStyle: "bold" }).setOrigin(0.5).setData("localeKey", "PRINCESS");
    this.add.text(94, 555, translate("FARMHOUSE", window.localStorage.getItem("farmVsMonsters.language") || "ar"), { fontFamily: "Arial", fontSize: "13px", color: "#fff3d4", fontStyle: "bold" }).setOrigin(0.5).setData("localeKey", "FARMHOUSE");
    this.add.text(1000, 95, translate("MONSTER GATE", window.localStorage.getItem("farmVsMonsters.language") || "ar"), { fontFamily: "Arial", fontSize: "13px", color: "#563c2c", fontStyle: "bold" }).setOrigin(0.5).setData("localeKey", "MONSTER GATE");
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

    // The board cells are perspective trapezoids, not perfect squares.
    // Move the monster/projectile lane down by half the ACTUAL cell height
    // at this exact horizontal position, interpolated along both cell edges.
    position.y += (bottomY - topY) / 2;
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
    // Compact HUD counters: icons with small values, never large statistic cards.
    const counters = [
      { x: 26, icon: "⚡" },
      { x: 116, icon: "🪙" },
      { x: 210, icon: "🏡" },
      { x: 304, icon: "🌱" },
      { x: 398, icon: "👾" },
    ];
    this.hudValueTexts = counters.map((counter) => this.add.text(counter.x, 34, counter.icon + " 0", {
      fontFamily: "Arial", fontSize: "17px", color: "#ffffff", fontStyle: "bold",
      stroke: "#17213d", strokeThickness: 4, resolution: 2
    }).setOrigin(0, 0.5).setDepth(41));

    // Wave is a compact icon + number, aligned with the other counters.
    this.waveText = this.add.text(510, 34, "🌊 1/5", {
      fontFamily: "Arial", fontSize: "16px", color: "#ffffff", fontStyle: "bold",
      stroke: "#17213d", strokeThickness: 4, resolution: 2,
      align: "left"
    }).setOrigin(0, 0.5).setDepth(41);

    // Plant selection cells stay distinct and larger than the status counters.
    this.radishCard = this.createPlantCard(24, "RADISH", "35", "radish", null, "radish-character", 64);
    this.mushroomCard = this.createPlantCard(72, "MUSHROOM", "50", "mushroom", null, "mushroom-character", 64);
    // New artwork is visible in the battle selector, but these plants stay
    // locked until their combat rules and planting implementations are ready.
    this.tomatoCard = this.createPlantCard(120, "TOMATO", String(TOMATO_CONFIG.cost), "tomato", null, "tomato-character", 64);
    this.pumpkinCard = this.createPlantCard(168, "PUMPKIN", String(PUMPKIN_CONFIG.cost), "pumpkin", null, "pumpkin-character", 64);
    this.onionCard = this.createPlantCard(216, "ONION", String(ONION_CONFIG.cost), "onion", null, "onion-character", 64);

    this.messageText = this.add.text(560, 574, "", {
      fontFamily: "Arial", fontSize: "15px", color: "#ffffff", fontStyle: "bold",
      backgroundColor: "rgba(255,255,255,0.18)", padding: { x: 18, y: 8 }, align: "center",
      stroke: "#24466b", strokeThickness: 3, resolution: 2,
      shadow: { offsetX: 0, offsetY: 2, color: "#17314f", blur: 5, fill: true }
    }).setOrigin(0.5, 1).setDepth(42);
  }

  createPlantCard(x, title, costLabel, type, drawIcon, imageKey = null, y = 619, locked = false) {
    const card = this.add.container(x, y).setDepth(45);
    // Floating glass selector, positioned below the top resource/status strip.
    // A soft translucent white halo gives a light blur-like edge without a frame.
    const tint = locked ? 0xb7c4d3 : (type === "radish" ? 0x8ff0b0 : 0x9edfff);
    const halo = this.add.rectangle(0, 1, 54, 44, 0xffffff, 0.10);
    const panel = this.add.rectangle(0, 0, 48, 38, 0xffffff, locked ? 0.12 : 0.22)
      .setInteractive({ useHandCursor: true });
    panel.setStrokeStyle(0, 0xffffff, 0);
    let icon;
    if (imageKey && this.textures.exists(imageKey)) {
      const frameData = this.textures.getFrame(imageKey);
      const iconHeight = 25;
      const iconWidth = iconHeight * (frameData.realWidth / frameData.realHeight);
      icon = this.add.image(0, -5, imageKey)
        .setDisplaySize(Math.min(iconWidth, 34), iconHeight);
    } else {
      icon = this.add.graphics();
      if (drawIcon) drawIcon(icon);
    }
    const cost = this.add.text(0, 13, "⚡" + costLabel, {
      fontFamily: "Arial", fontSize: "9px", color: "#ffffff", fontStyle: "bold",
      stroke: "#536477", strokeThickness: 2, resolution: 2,
      align: "center"
    }).setOrigin(0.5, 0.5);
    if (locked) {
      icon.setAlpha(0.78);
      cost.setText("🔒");
      const lockLabel = this.add.text(0, 26, title, {
        fontFamily: "Arial", fontSize: "7px", color: "#ffffff", fontStyle: "bold",
        stroke: "#34445b", strokeThickness: 2, resolution: 2
      }).setOrigin(0.5, 0.5);
      card.add([halo, panel, icon, cost, lockLabel]);
      card.setAlpha(0.78);
    } else {
      card.add([halo, panel, icon, cost]);
    }

    panel.on("pointerover", () => {
      if (!locked && this.selectedPlant !== type) panel.setFillStyle(tint, 0.34);
      card.setScale(1.04);
    });
    panel.on("pointerout", () => {
      panel.setFillStyle(0xffffff, locked ? 0.12 : 0.22);
      card.setScale(1);
    });
    panel.on("pointerdown", () => {
      if (this.gameOver) return;
      if (locked) {
        this.setMessage(title + " is coming soon. Its combat ability is not ready yet.");
        return;
      }
      this.selectedPlant = type;
      this.radishCard.setAlpha(type === "radish" ? 1 : 0.78);
      this.mushroomCard.setAlpha(type === "mushroom" ? 1 : 0.78);
      this.tomatoCard?.setAlpha(type === "tomato" ? 1 : 0.78);
      this.pumpkinCard?.setAlpha(type === "pumpkin" ? 1 : 0.78);
      this.onionCard?.setAlpha(type === "onion" ? 1 : 0.78);
      panel.setFillStyle(tint, 0.38);
      const plantHints = {
        radish: "Radish chosen. Fires thorn shots in its lane.",
        mushroom: "Mushroom chosen. Collect its energy when it appears.",
        tomato: "Tomato chosen. Fires tomato shots in its lane.",
        pumpkin: "Pumpkin chosen. A durable lane blocker.",
        onion: "Onion chosen. Fires heavy onion shots in its lane."
      };
      this.setMessage(plantHints[type] || "Plant chosen.");
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
      this.createStoryFarmerAnimations();
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
    // Keep one scale for the entire spritesheet. Recalculating it from each
    // planting frame makes crouched poses (with a shorter alpha silhouette)
    // enlarge dramatically, especially the head and torso.
    this.farmerTextureScales ||= new Map();
    let textureScale = this.farmerTextureScales.get(textureKey);
    if (!Number.isFinite(textureScale)) {
      textureScale = this.farmerTargetDisplayHeight / bounds.height;
      this.farmerTextureScales.set(textureKey, textureScale);
    }
    sprite.setScale(textureScale);
  }

  createFarmerAnimations() {
    const definitions = [
      ["farmer-idle", "farmer-idle", 4, 1.5, -1],
      ["farmer-run", "farmer-run", 6, 8, -1],
      ["farmer-walk", "farmer-walk", 8, 6, -1],
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
      "farmer-hit", "farmer-death", "farmer-collect", "farmer-sling", "farmer-rescue"
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

  createStoryFarmerAnimations() {
    // Optional sheets are validated independently so unfinished story art
    // never disables the existing farmer animations.
    const definitions = [
      ["farmer-sling", 6, 9, 0],
      ["farmer-rescue", 6, 8, 0],
      ["farmer-carry", 6, 8, -1]
    ];
    for (const [key, frameCount, frameRate, repeat] of definitions) {
      if (!this.textures.exists(key)) continue;
      const texture = this.textures.get(key);
      const available = Object.keys(texture.frames).filter((name) => name !== "__BASE").length;
      if (available < frameCount) {
        console.warn("Optional story sheet has too few frames:", key, available, "/", frameCount);
        continue;
      }
      if (this.anims.exists(key)) this.anims.remove(key);
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(key, { start: 0, end: frameCount - 1 }),
        frameRate,
        repeat
      });
    }
  }

  createPrincessActor() {
    // The princess is only rendered from the user's authored asset.
    if (!this.textures.exists("phase-one-princess-captive")) return;
    this.princessActor = this.add.image(995, 270, "phase-one-princess-captive")
      .setOrigin(0.5, 1)
      .setDisplaySize(66, 96)
      .setDepth(8.6);
  }

  beginDragonEncounter() {
    if (this.dragonBoss || this.phaseOneStoryState !== "battle") return;
    this.phaseOneStoryState = "dragon";
    this.facing = 1;
    this.caveman.scaleX = 1;
    this.createPrincessActor();
    this.dragonBoss = {
      hp: PHASE_ONE_DRAGON.maxHp, maxHp: PHASE_ONE_DRAGON.maxHp, alive: true,
      attackCooldown: PHASE_ONE_DRAGON.dragonInitialAttackDelayMs, shotCooldown: PHASE_ONE_DRAGON.farmerSlingInitialDelayMs, sprite: null
    };
    if (this.textures.exists("dragon-boss")) {
      const texture = this.textures.get("dragon-boss");
      const frames = Object.keys(texture.frames).filter((name) => name !== "__BASE").length;
      this.dragonBoss.sprite = this.add.sprite(930, 145, "dragon-boss", 0)
        .setOrigin(0.5, 1).setDisplaySize(220, 220).setDepth(8.2);
      if (frames > 1) {
        if (!this.anims.exists("dragon-boss-idle")) {
          this.anims.create({
            key: "dragon-boss-idle",
            frames: this.anims.generateFrameNumbers("dragon-boss", { start: 0, end: frames - 1 }),
            frameRate: 7, repeat: -1
          });
        }
        this.dragonBoss.sprite.play("dragon-boss-idle");
      }
      this.tweens.add({
        targets: this.dragonBoss.sprite,
        x: { from: 835, to: 1010 }, y: { from: 140, to: 165 },
        duration: 2600, ease: "Sine.easeInOut", yoyo: true, repeat: -1
      });
    }
    this.dragonHealthBar = this.add.graphics().setDepth(56);
    this.dragonHealthLabel = this.add.text(910, 55, "DRAGON", {
      fontFamily: "Arial", fontSize: "17px", color: "#ffffff",
      fontStyle: "bold", stroke: "#090503", strokeThickness: 5, resolution: 2
    }).setOrigin(0.5).setDepth(57);
    this.drawDragonHealthBar();
    this.setMessage("The dragon has arrived! The farmer is loading his sling.");
  }

  drawDragonHealthBar() {
    if (!this.dragonBoss || !this.dragonHealthBar?.active) return;
    const ratio = PhaserMath.Clamp(this.dragonBoss.hp / this.dragonBoss.maxHp, 0, 1);
    this.dragonHealthBar.clear();
    this.dragonHealthBar.fillStyle(0x24150f, 0.9);
    this.dragonHealthBar.fillRoundedRect(756, 66, 308, 23, 8);
    this.dragonHealthBar.fillStyle(0x5b1710, 1);
    this.dragonHealthBar.fillRoundedRect(760, 70, 300, 15, 6);
    this.dragonHealthBar.fillStyle(0xff4b3e, 1);
    this.dragonHealthBar.fillRoundedRect(760, 70, 300 * ratio, 15, 6);
    this.dragonHealthBar.lineStyle(3, 0xffe0a2, 1);
    this.dragonHealthBar.strokeRoundedRect(756, 66, 308, 23, 8);
  }

  updateDragonBoss(delta) {
    const boss = this.dragonBoss;
    if (!boss?.alive || this.phaseOneStoryState !== "dragon") return;
    if (boss.sprite?.active && this.princessActor?.active) {
      this.princessActor.setPosition(boss.sprite.x + 78, boss.sprite.y + 96);
    }
    boss.shotCooldown = advanceCooldown(boss.shotCooldown, delta);
    if (boss.shotCooldown <= 0) {
      boss.shotCooldown = PHASE_ONE_DRAGON.farmerSlingIntervalMs;
      if (this.anims.exists("farmer-sling") && this.cavemanVisual?.active) {
        this.playFarmerAction("farmer-sling");
      }
      const startX = this.caveman.x + this.facing * 28;
      const startY = this.caveman.y - 52;
      const targetX = boss.sprite?.x ?? 930;
      const targetY = (boss.sprite?.y ?? 145) + 22;
      const stone = this.add.circle(startX, startY, 7, 0xb9a58b, 1)
        .setStrokeStyle(2, 0x66513c, 1).setDepth(52);
      this.tweens.add({
        targets: stone, x: targetX - 18, y: targetY,
        duration: PhaserMath.Clamp(Math.abs(targetX - startX) / 0.62, 380, 1050),
        ease: "Quad.easeIn",
        onComplete: () => {
          if (stone.active) stone.destroy();
          if (boss.alive && !this.gameOver) this.damageDragonBoss(PHASE_ONE_DRAGON.farmerSlingDamage);
        }
      });
    }

    boss.attackCooldown = advanceCooldown(boss.attackCooldown, delta);
    if (boss.attackCooldown <= 0) {
      boss.attackCooldown = PHASE_ONE_DRAGON.attackIntervalMs;
      const targetPlant = selectDragonFireballTarget(this.plants);
      const targetX = targetPlant ? targetPlant.x : 92;
      const targetY = targetPlant ? targetPlant.y - 18 : 490;
      const fireball = this.add.circle(boss.sprite?.x ?? 930, (boss.sprite?.y ?? 145) - 38, 15, 0xff762e, 1)
        .setStrokeStyle(3, 0xffd16c, 1).setDepth(53);
      this.tweens.add({
        targets: fireball, x: targetX, y: targetY, scale: 1.45,
        duration: PHASE_ONE_DRAGON.fireballTravelMs, ease: "Quad.easeIn",
        onComplete: () => {
          if (fireball.active) fireball.destroy();
          if (this.gameOver || this.storySequenceActive || this.collectionMenuOpen) return;
          if (targetPlant?.alive) {
            targetPlant.hp = applyHitPointsDamage(targetPlant.hp, PHASE_ONE_DRAGON.fireballDamageToPlant).hp;
            this.flashEatenPlant(targetPlant);
            if (targetPlant.hp <= 0) this.destroyPlant(targetPlant);
          } else {
            this.houseHealth = Math.max(0, this.houseHealth - PHASE_ONE_DRAGON.fireballDamageToFarm);
            if (this.houseHealth <= 0) this.endGame(false);
            this.refreshHud();
          }
        }
      });
    }
  }

  damageDragonBoss(amount) {
    const boss = this.dragonBoss;
    if (!boss?.alive || amount <= 0) return;
    boss.hp = applyHitPointsDamage(boss.hp, amount).hp;
    if (boss.sprite?.active) {
      boss.sprite.setTint(0xffc078);
      this.time.delayedCall(110, () => { if (boss.sprite?.active) boss.sprite.clearTint(); });
    }
    this.drawDragonHealthBar();
    if (boss.hp > 0) return;
    boss.alive = false;
    this.dragonHealthBar?.destroy();
    this.dragonHealthLabel?.destroy();
    if (boss.sprite?.active) {
      this.tweens.killTweensOf(boss.sprite);
      this.tweens.add({
        targets: boss.sprite, alpha: 0, y: boss.sprite.y - 22, duration: 650,
        onComplete: () => boss.sprite?.destroy()
      });
    }
    this.playMonsterDefeatSound();
    this.setMessage("The dragon has fallen! The farmer is going to rescue the princess.");
    this.tryFinishPhaseOne();
  }

  tryFinishPhaseOne() {
    if (
      this.phaseOneStoryState !== "dragon" ||
      this.wave !== this.totalWaves ||
      this.spawnedThisWave < this.waveSize ||
      this.monsters.some((monster) => monster.alive) ||
      this.dragonBoss?.alive
    ) return;
    this.beginPrincessRescue();
  }

  beginPrincessRescue() {
    if (this.storySequenceActive || this.phaseOneStoryState === "complete") return;
    this.storySequenceActive = true;
    this.phaseOneStoryState = "rescuing";
    this.setMessage("The battlefield is safe. The farmer is rescuing the princess!");
    this.facing = 1;
    this.caveman.scaleX = 1;
    this.farmerWantsToRun = true;
    this.setFarmerAnimation("farmer-run");
    const rescueX = this.princessActor?.active ? this.princessActor.x : 145;
    const rescueY = this.princessActor?.active ? this.princessActor.y : 375;
    this.tweens.add({
      targets: this.caveman, x: rescueX + 24, y: rescueY,
      duration: 1050, ease: "Sine.easeInOut",
      onComplete: () => {
        if (this.cavemanVisual?.active && this.anims.exists("farmer-rescue")) {
          this.cavemanVisual.play("farmer-rescue");
        }
        if (this.princessActor?.active) {
          this.princessActor.setDepth(0);
          this.caveman.add(this.princessActor);
          this.princessActor.setPosition(22, -48).setDisplaySize(58, 84);
          if (this.textures.exists("phase-one-princess-rescued")) {
            this.princessActor.setTexture("phase-one-princess-rescued");
          }
        }
        this.time.delayedCall(650, () => {
          if (this.cavemanVisual?.active) {
            const carryAnimation = this.anims.exists("farmer-carry") ? "farmer-carry" : "farmer-run";
            this.cavemanVisual.play(carryAnimation);
          }
          this.facing = -1;
          this.caveman.scaleX = -1;
          this.tweens.add({
            targets: this.caveman, x: 82, y: 485,
            duration: 1650, ease: "Sine.easeInOut",
            onComplete: () => {
              this.phaseOneStoryState = "complete";
              this.storySequenceActive = false;
              this.endGame(true);
            }
          });
        });
      }
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
    const panelGlow = this.add.rectangle(0, 0, 258, 228, 0x8b65e8, 0.16)
      .setStrokeStyle(1, 0xffffff, 0.42);
    const panel = this.add.rectangle(0, 0, 250, 220, 0x315b91, 0.64)
      .setStrokeStyle(1, 0xffffff, 0.76)
      .setInteractive();
    const inset = this.add.rectangle(0, 0, 236, 206, 0x35bceb, 0.12)
      .setStrokeStyle(1, 0xa7e84f, 0.42);
    const heading = this.add.text(0, -91, translate("TRIBE SOUND", window.localStorage.getItem("farmVsMonsters.language") || "ar"), {
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

    this.audioButton = this.add.container(1090, 34).setDepth(72);
    const buttonHalo = this.add.circle(0, 0, 26, 0xffffff, 0.12);
    const buttonBackground = this.add.circle(0, 0, 23, 0x35bceb, 0.42).setStrokeStyle(1, 0xffffff, 0.82);
    const speaker = this.add.graphics();
    speaker.fillStyle(0xffffff, 1);
    speaker.fillRoundedRect(-11, -6, 7, 12, 2);
    speaker.fillTriangle(-5, -7, 5, -14, 5, 14);
    speaker.fillTriangle(-5, 7, 5, 14, 5, -14);
    speaker.lineStyle(2, 0xffffff, 1);
    speaker.beginPath();
    speaker.arc(3, 0, 10, -0.85, 0.85, false);
    speaker.strokePath();
    this.audioButton.add([buttonHalo, buttonBackground, speaker]);
    buttonBackground.setInteractive({ useHandCursor: true });
    buttonBackground.on("pointerover", () => buttonBackground.setFillStyle(0x35bceb, 0.72));
    buttonBackground.on("pointerout", () => buttonBackground.setFillStyle(0x35bceb, 0.42));
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
      const inButton = pointer.x >= 1065 && pointer.x <= 1115 &&
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
    const label = this.add.text(-101, -10, translate(title, window.localStorage.getItem("farmVsMonsters.language") || "ar"), {
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
    track.on("pointerover", () => track.setFillStyle(0x35bceb, 1));
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

  playSfx(key, volume = this.effectsVolume, cooldownMs = 0) {
    if (!this.sound || !this.cache.audio.exists(key) || volume <= 0) return false;
    const now = this.time ? this.time.now : 0;
    const lastPlayed = this.sfxCooldowns && this.sfxCooldowns.has(key)
      ? this.sfxCooldowns.get(key)
      : -Infinity;
    if (cooldownMs > 0 && now - lastPlayed < cooldownMs) return false;
    try {
      this.sound.play(key, { volume: PhaserMath.Clamp(volume / 100, 0, 1) });
      if (this.sfxCooldowns) this.sfxCooldowns.set(key, now);
      return true;
    } catch {
      // Sound is optional; never let a failed audio device interrupt gameplay.
      return false;
    }
  }

  playHyenaVoice(kind = "growl", intensity = 1) {
    // Original procedural cartoon animal vocals: generated with Web Audio,
    // so the game ships no third-party recordings or restrictive audio files.
    const context = this.sound && this.sound.context;
    if (!context || context.state !== "running" || typeof context.createOscillator !== "function") return false;
    if (this.effectsVolume <= 0) return false;

    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.linearRampToValueAtTime(
      PhaserMath.Clamp((this.effectsVolume / 100) * intensity * 0.34, 0, 0.34),
      now + 0.018
    );
    master.connect(context.destination);

    const addTone = (startFrequency, endFrequency, duration, waveform = "sawtooth", offset = 0, level = 0.42) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = waveform;
      oscillator.frequency.setValueAtTime(startFrequency, now + offset);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(35, endFrequency), now + offset + duration);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.linearRampToValueAtTime(level, now + offset + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + duration);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + duration + 0.025);
    };

    if (kind === "laugh") {
      // Three quick, pitch-bending cackles with a bright, silly nasal tone.
      [0, 0.16, 0.34].forEach((offset, index) => {
        addTone(610 - index * 65, 390 + index * 24, 0.19, "square", offset, 0.34);
        addTone(1220 - index * 110, 760, 0.13, "triangle", offset + 0.015, 0.10);
      });
      master.gain.setValueAtTime(0.0001, now + 0.68);
    } else if (kind === "yelp") {
      // A short upward squeak followed by a falling, soft whimper.
      addTone(760, 310, 0.24, "triangle", 0, 0.52);
      addTone(420, 190, 0.28, "sine", 0.19, 0.25);
      master.gain.setValueAtTime(0.0001, now + 0.52);
    } else if (kind === "bite") {
      // A playful low chomp with a tiny high-frequency snap.
      addTone(250, 78, 0.16, "sawtooth", 0, 0.40);
      addTone(1250, 420, 0.055, "square", 0, 0.13);
      master.gain.setValueAtTime(0.0001, now + 0.21);
    } else {
      // A short, rounded growl with two wobbling harmonics.
      addTone(145, 78, 0.42, "sawtooth", 0, 0.40);
      addTone(292, 156, 0.34, "triangle", 0.025, 0.18);
      master.gain.setValueAtTime(0.0001, now + 0.46);
    }
    return true;
  }

  playPlantSound() {
    this.playSfx("sfx-plant-dig", this.effectsVolume * 0.78, 120);
  }

  playUprootSound() {
    this.playSfx("sfx-plant-rustle", this.effectsVolume * 0.72, 120);
  }

  playMonsterBiteSound() {
    this.playSfx("sfx-monster-bite", this.effectsVolume * 0.54, 220);
    this.playHyenaVoice("bite", 0.9);
  }

  playThornSound() {
    this.playSfx("sfx-thorn-launch", this.projectileVolume * 0.7, 85);
  }

  playMonsterHitSound() {
    this.playSfx("sfx-monster-hit", this.effectsVolume * 0.58, 70);
  }

  playThornImpactSound() {
    this.playSfx("sfx-thorn-impact", this.projectileVolume * 0.48, 90);
  }

  playMonsterDefeatSound() {
    this.playSfx("sfx-monster-defeat", this.effectsVolume * 0.78, 100);
  }

  playCoinRewardSound() {
    this.playSfx("sfx-coin-collect", this.effectsVolume * 0.5, 100);
  }

  playEnergyCollectSound() {
    this.playSfx("sfx-coin-collect", this.effectsVolume * 0.42, 100);
  }

  playMonsterJumpSound() {
    this.playSfx("sfx-monster-jump", this.effectsVolume * 0.52, 100);
  }

  playMonsterLandSound() {
    this.playSfx("sfx-monster-land", this.effectsVolume * 0.62, 100);
  }

  playFarmerFootsteps(dt) {
    this.farmerFootstepCooldownMs -= dt * 1000;
    if (this.farmerFootstepCooldownMs > 0) return;
    const key = Math.random() < 0.5 ? "sfx-grass-step-01" : "sfx-grass-step-02";
    this.playSfx(key, this.effectsVolume * 0.24, 80);
    this.farmerFootstepCooldownMs = 285;
  }

  createQuickCollectionButtons() {
    // A shared translucent glass dock ties the two collection shortcuts together.
    this.quickCollectionDock = this.add.container(755, 619).setDepth(47);
    const dockGlow = this.add.rectangle(0, 1, 146, 52, 0xffffff, 0.10);
    const dock = this.add.rectangle(0, 0, 140, 46, 0xdaf3ff, 0.22)
      .setStrokeStyle(1, 0xffffff, 0.42);
    this.quickCollectionDock.add([dockGlow, dock]);

    const makeButton = (x, tab, tint) => {
      const button = this.add.container(x, 0);
      const halo = this.add.circle(0, 0, 21, 0xffffff, 0.10);
      const plate = this.add.circle(0, 0, 18, tint, 0.38)
        .setStrokeStyle(1, 0xffffff, 0.72).setInteractive({ useHandCursor: true });
      const icon = this.add.graphics();
      icon.lineStyle(2.6, 0xffffff, 1);
      if (tab === "plants") {
        icon.lineBetween(0, 11, 0, -2);
        icon.lineBetween(0, 2, -8, -6);
        icon.lineBetween(0, -1, 8, -9);
        icon.strokeEllipse(-7, -7, 10, 7);
        icon.strokeEllipse(7, -10, 10, 7);
        icon.lineBetween(-10, 12, 10, 12);
      } else {
        icon.fillStyle(0xffffff, 1);
        icon.fillEllipse(0, 6, 14, 10);
        icon.fillCircle(-8, -6, 3.2);
        icon.fillCircle(-2, -11, 3.2);
        icon.fillCircle(5, -11, 3.2);
        icon.fillCircle(10, -5, 3.2);
      }
      button.add([halo, plate, icon]);
      plate.on("pointerover", () => {
        plate.setFillStyle(tint, 0.72);
        button.setScale(1.06);
      });
      plate.on("pointerout", () => {
        plate.setFillStyle(tint, 0.38);
        button.setScale(1);
      });
      plate.on("pointerdown", () => this.openCollectionMenuTab(tab));
      this.quickCollectionDock.add(button);
      return button;
    };

    this.quickPlantsButton = makeButton(-34, "plants", 0x42c96b);
    this.quickMonstersButton = makeButton(34, "monsters", 0x8b65e8);
  }

  openCollectionMenuTab(tab) {
    if (!this.collectionMenuOpen) this.toggleCollectionMenu();
    this.collectionMenuTab = tab;
    this.renderCollectionMenu();
  }

  createCollectionMenuControl() {
    const button = this.add.container(978, 27).setDepth(47);
    const plate = this.add.rectangle(0, 0, 46, 30, 0x35bceb, 0.48)
      .setStrokeStyle(1, 0xffffff, 0.78).setInteractive({ useHandCursor: true });
    const label = this.add.text(0, 0, "▤", {
      fontFamily: "Arial", fontSize: "20px", color: "#ffffff", fontStyle: "bold"
    }).setOrigin(0.5);
    button.add([plate, label]);
    plate.on("pointerover", () => plate.setFillStyle(0x35bceb, 0.72).setScale(1.04));
    plate.on("pointerout", () => plate.setFillStyle(0x35bceb, 0.42).setScale(1));
    plate.on("pointerdown", () => this.toggleCollectionMenu());
    this.collectionMenuControl = button;
    this.collectionMenuOpen = false;
  }

  toggleCollectionMenu() {
    if (this.gameOver) return;
    if (this.collectionMenuOpen) {
      this.closeCollectionMenu();
      return;
    }
    this.collectionMenuOpen = true;
    this.collectionMenuTab = "phases";
    this.collectionMenuLayer = this.add.container(560, 340).setDepth(90);
    this.collectionMenuLayer.add(this.add.rectangle(0, 0, 1120, 680, 0x142b50, 0.42).setInteractive());
    const panelGlow = this.add.rectangle(0, 0, 774, 584, 0x8b65e8, 0.18).setStrokeStyle(1, 0xffffff, 0.48);
    const panel = this.add.rectangle(0, 0, 760, 570, 0x315b91, 0.68).setStrokeStyle(1, 0xffffff, 0.76);
    const panelInset = this.add.rectangle(0, 0, 742, 552, 0x35bceb, 0.08).setStrokeStyle(1, 0xa7e84f, 0.28);
    this.collectionMenuLayer.add([panelGlow, panel, panelInset]);
    this.collectionMenuLayer.add(this.add.rectangle(0, -274, 738, 40, 0x35bceb, 0.34).setStrokeStyle(1, 0xffffff, 0.72));
    this.collectionMenuLayer.add(this.add.text(0, -274, "دفتر المزرعة والمغامرة  ·  FARM JOURNAL", {
      fontFamily: "Arial", fontSize: "19px", color: "#ffffff", fontStyle: "bold", stroke: "#17213d", strokeThickness: 3
    }).setOrigin(0.5));
    const close = this.add.text(350, -274, "✕", {
      fontFamily: "Arial", fontSize: "23px", color: "#ffffff", backgroundColor: "rgba(255,113,133,0.72)",
      padding: { x: 8, y: 2 }, stroke: "#ffffff", strokeThickness: 1
    }).setOrigin(0.5).setAlpha(0.88).setInteractive({ useHandCursor: true });
    close.on("pointerover", () => close.setScale(1.08).setAlpha(1));
    close.on("pointerout", () => close.setScale(1).setAlpha(0.88));
    close.on("pointerdown", () => this.closeCollectionMenu());
    this.collectionMenuLayer.add(close);
    this.collectionMenuTabs = this.add.container(0, -220);
    this.collectionMenuLayer.add(this.collectionMenuTabs);
    this.collectionMenuContent = this.add.container(0, -160);
    this.collectionMenuLayer.add(this.collectionMenuContent);
    this.renderCollectionMenu();
  }

  closeCollectionMenu() {
    this.collectionMenuOpen = false;
    if (this.collectionMenuLayer) this.collectionMenuLayer.destroy(true);
    this.collectionMenuLayer = null;
  }

  renderCollectionMenu() {
    if (!this.collectionMenuLayer) return;
    this.collectionMenuTabs.removeAll(true);
    this.collectionMenuContent.removeAll(true);
    const locale = typeof window !== "undefined" ? window.localStorage.getItem("farmVsMonsters.language") || "ar" : "ar";
    const tabs = [
      ["phases", locale === "ar" ? "المراحل" : "PHASES"],
      ["plants", locale === "ar" ? "النباتات" : "PLANTS"],
      ["coins", locale === "ar" ? "المغارة والنقود" : "CAVE & COINS"],
      ["monsters", locale === "ar" ? "الوحوش" : "MONSTERS"]
    ];
    tabs.forEach(([id, label], index) => {
      const x = -270 + index * 180;
      const active = this.collectionMenuTab === id;
      const tabColors = [0x42c96b, 0x35bceb, 0xffca45, 0x8b65e8];
      const bg = this.add.rectangle(x, 0, 164, 42, active ? tabColors[index] : 0xdaf3ff, active ? 0.58 : 0.16)
        .setStrokeStyle(1, 0xffffff, active ? 0.88 : 0.42).setInteractive({ useHandCursor: true });
      const txt = this.add.text(x, 0, label, {
        fontFamily: "Arial", fontSize: "15px", color: "#ffffff", fontStyle: "bold", stroke: "#17213d", strokeThickness: 2
      }).setOrigin(0.5);
      bg.on("pointerover", () => {
        if (!active) bg.setFillStyle(tabColors[index], 0.42).setStrokeStyle(1, 0xffffff, 0.72);
        bg.setScale(1.025);
      });
      bg.on("pointerout", () => {
        bg.setFillStyle(active ? tabColors[index] : 0xdaf3ff, active ? 0.58 : 0.16)
          .setStrokeStyle(1, 0xffffff, active ? 0.88 : 0.42)
          .setScale(1);
      });
      bg.on("pointerdown", () => { this.collectionMenuTab = id; this.renderCollectionMenu(); });
      this.collectionMenuTabs.add([bg, txt]);
    });
    const content = this.collectionMenuContent;
    const addLabel = (x, y, value, size = 19, color = "#ffffff") =>
      content.add(this.add.text(x, y, value, { fontFamily: "Georgia", fontSize: size + "px", color, fontStyle: "bold", align: "center", wordWrap: { width: 650 } }).setOrigin(0.5));
    const addRow = (y, imageKey, title, detail, locked = false) => {
      content.add(this.add.rectangle(0, y, 660, 72, 0x8edcff, 0.18).setStrokeStyle(1, 0xffffff, 0.42));
      if (imageKey && this.textures.exists(imageKey)) {
        const icon = this.add.image(-285, y, imageKey).setDisplaySize(54, 54);
        content.add(icon);
      } else {
        addLabel(-285, y, locked ? "🔒" : "❖", 27, "#ffffff");
      }
      addLabel(-115, y - 11, title, 17);
      addLabel(120, y + 15, detail, 13, "#ffffff");
      if (locked) addLabel(285, y, "🔗  🗝", 20, "#ffffff");
    };
    if (this.collectionMenuTab === "phases") {
      addLabel(0, -10, locale === "ar" ? "اختر مغامرتك — المرحلة الأولى متاحة" : "Choose your adventure — Stage 1 is available", 17);
      for (let stage = 1; stage <= 10; stage += 1) {
        const row = Math.floor((stage - 1) / 2);
        const col = (stage - 1) % 2;
        const x = col === 0 ? -170 : 170;
        content.add(this.add.rectangle(x, 35 + row * 82, 300, 82, stage === 1 ? 0x42c96b : 0x8b65e8, stage === 1 ? 0.42 : 0.24).setStrokeStyle(1, 0xffffff, 0.46));
        const unlocked = stage === 1;
        if (stage === 1 && this.textures.exists("phase-one-emblem")) {
          content.add(this.add.image(x - 105, 65 + row * 100, "phase-one-emblem").setDisplaySize(90, 58));
        } else {
          content.add(this.add.text(x - 105, 65 + row * 100, unlocked ? "I" : "🔒", { fontSize: "30px", color: "#ffffff", stroke: "#17213d", strokeThickness: 3 }).setOrigin(0.5));
        }
        content.add(this.add.text(x + 35, 18 + row * 82, locale === "ar" ? "المرحلة " + stage : "STAGE " + stage, { fontSize: "17px", color: "#ffffff", fontStyle: "bold", stroke: "#17213d", strokeThickness: 2 }).setOrigin(0.5));
        content.add(this.add.text(x + 35, 48 + row * 82, unlocked ? (locale === "ar" ? "متاحة للعب" : "AVAILABLE") : (locale === "ar" ? "مغلقة — تحتاج مفتاحاً" : "LOCKED · KEY REQUIRED"), { fontSize: "12px", color: "#ffffff", fontStyle: "bold", stroke: "#17213d", strokeThickness: 2 }).setOrigin(0.5));
      }
      addLabel(0, 435, locale === "ar" ? "ستُفتح المراحل التالية بعد إكمال المغامرات السابقة." : "Complete earlier adventures to unlock later stages.", 13, "#ffffff");
    } else if (this.collectionMenuTab === "plants") {
      addLabel(0, -8, locale === "ar" ? "النباتات المتاحة وأسعار الطاقة" : "Available plants and their energy costs", 17);
      addRow(65, "radish-character", locale === "ar" ? "الفجل الدفاعي" : "Defensive Radish", "35 " + (locale === "ar" ? "طاقة" : "ENERGY"));
      addRow(155, "mushroom-character", locale === "ar" ? "فطر الطاقة" : "Energy Mushroom", "50 " + (locale === "ar" ? "طاقة" : "ENERGY"));
      addLabel(0, 260, locale === "ar" ? "النباتات الجديدة ستظهر هنا لاحقاً مع سعر الشراء بالنقود." : "New plants and coin purchase prices will appear here later.", 14, "#ffffff");
      addLabel(0, 320, locale === "ar" ? "الشراء غير مفعّل حالياً؛ هذان النباتان متاحان للزراعة مباشرة." : "Purchases are not enabled yet; both plants are already available.", 13, "#ffffff");
    } else if (this.collectionMenuTab === "coins") {
      if (this.textures.exists("treasure-cave-menu")) {
        content.add(this.add.image(0, 115, "treasure-cave-menu").setDisplaySize(610, 310));
      } else {
        content.add(this.add.rectangle(0, 115, 610, 310, 0x35bceb, 0.14).setStrokeStyle(1, 0xffffff, 0.62));
        addLabel(0, 60, locale === "ar" ? "مغارة الكنز — بانتظار رسم المغارة" : "TREASURE CAVE — ARTWORK PENDING", 18);
      }
      addLabel(0, 185, (locale === "ar" ? "رصيدك الحالي: " : "CURRENT BALANCE: ") + this.coins.toLocaleString() + "  🪙", 25, "#ffffff");
      addLabel(0, 270, locale === "ar" ? "كل ضبع مهزوم يمنحك 8 نقود. ستُضاف آلية شراء النباتات لاحقاً." : "Each defeated hyena awards 8 coins. Plant purchases will be added later.", 13, "#ffffff");
    } else {
      addLabel(0, -8, locale === "ar" ? "دليل الوحوش — نقاط الصحة وقوة الهجوم" : "Monster field guide — health and attack strength", 17);
      addRow(55, "hyena-idle", locale === "ar" ? "الضبع العادي" : "Cave Brute", (locale === "ar" ? "الصحة: 69 + 4 لكل موجة · الضرر: 16" : "HP: 69 + 4 per wave · Damage: 16"));
      addRow(145, "hyena-idle", locale === "ar" ? "الضبع السريع" : "Dust Skitter", (locale === "ar" ? "52% من صحة العادي · الضرر: 8" : "52% of brute HP · Damage: 8"));
      addRow(235, "hyena-idle", locale === "ar" ? "الضبع المدرع" : "Stonehide", (locale === "ar" ? "220% من صحة العادي · الضرر: 23" : "220% of brute HP · Damage: 23"));
      addRow(325, "hyena-idle", locale === "ar" ? "الضبع العملاق" : "Alpha Brute", (locale === "ar" ? "الصحة: 350 · ضرر النبات: 32" : "HP: 350 · Plant damage: 32"));
      addRow(415, "dragon-boss", locale === "ar" ? "التنين الزعيم" : "Dragon Boss", locale === "ar" ? "زعيم مستقل · شريط صحة خاص" : "Separate boss · dedicated health bar");
    }
  }

  createPauseControl() {
    const button = this.add.container(1035, 27).setDepth(46);
    const background = this.add.rectangle(0, 0, 54, 30, 0x8b65e8, 0.42)
      .setStrokeStyle(1, 0xffffff, 0.82).setInteractive({ useHandCursor: true });
    const label = this.add.text(0, 0, "Ⅱ", {
      fontFamily: "Arial", fontSize: "19px", color: "#ffffff", fontStyle: "bold"
    }).setOrigin(0.5);
    button.add([background, label]);
    background.on("pointerover", () => background.setFillStyle(0xa07df2, 0.72));
    background.on("pointerout", () => background.setFillStyle(0x8b65e8, 0.42));
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
      if (this.gameOver || this.storySequenceActive) return;
      const { col, row } = this.worldToGrid(pointer.x, pointer.y);
      if (row >= 0 && row < LANES && col >= 0 && col < COLUMNS) this.requestPlant(col, row);
    });
  }

  update(_time, delta) {
    if (this.gameOver || this.isPaused || this.collectionMenuOpen) return;
    // Phaser can produce a non-finite or negative frame delta during unusual
    // tab visibility/resume transitions. Never pass that into combat rules.
    const deltaMs = Number.isFinite(delta) ? Math.max(0, delta) : 0;
    const dt = deltaMs / 1000;
    this.elapsedBattleMs += deltaMs;
    if (this.storySequenceActive) {
      this.refreshHud();
      return;
    }
    this.combatClockMs += deltaMs;
    this.handleControls(dt);
    // Wave timing and spawn decisions are resolved by the renderer-independent combat kernel.
    const previousIntermissionSecond = this.waveIntermissionMs > 0
      ? Math.ceil(this.waveIntermissionMs / 1000)
      : null;
    const spawnStep = resolveWaveSpawnStep({
      wave: this.wave,
      totalWaves: this.totalWaves,
      waveSize: this.waveSize,
      spawnedThisWave: this.spawnedThisWave,
      intermissionMs: this.waveIntermissionMs,
      spawnTimerMs: this.spawnTimer,
      deltaMs
    });
    this.waveIntermissionMs = spawnStep.intermissionMs;
    this.spawnTimer = spawnStep.spawnTimerMs;
    if (
      previousIntermissionSecond !== null &&
      spawnStep.remainingIntermissionSecond !== previousIntermissionSecond
    ) {
      this.setMessage(spawnStep.remainingIntermissionSecond > 0
        ? "Wave " + this.wave + " begins in " + spawnStep.remainingIntermissionSecond + "..."
        : "Wave " + this.wave + " incoming!");
    }
    if (spawnStep.shouldSpawn) {
      const spawnIndex = this.spawnedThisWave;
      this.spawnMonster(spawnIndex);
      this.spawnedThisWave = spawnStep.spawnedThisWave;
      this.totalSpawnedMonsters += 1;
      if (this.wave === 5 && this.spawnedThisWave === 2) this.beginDragonEncounter();
    }
    this.updatePlants(deltaMs);
    this.updateMonsters(dt, deltaMs);
    if (this.gameOver) return;
    this.updateDragonBoss(deltaMs);
    if (this.storySequenceActive || this.gameOver) {
      this.refreshHud();
      return;
    }
    // A farmhouse breach can end the run inside updateMonsters; stop this
    // frame immediately so projectiles, wave logic, and HUD do not advance.
    if (this.gameOver) return;
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
      // The farmer sprite uses origin (0.5, 1), so the container Y is the
      // actual foot/ground contact point. Sort it against monsters using
      // that same ground coordinate: farther up-screen renders behind,
      // farther down-screen renders in front. Do not offset the farmer's Y.
      this.caveman.setDepth(depthForY(this.caveman.y));
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
    // Uprooting is a direct player action and must remain available even while
    // the farmer is walking back from a previous planting animation.
    // Check the occupied cell before applying movement/action locks.
    const existingPlant = this.plants.find((plant) => plant.alive && plant.col === col && plant.row === row);
    if (existingPlant) {
      this.uprootPlant(existingPlant);
      return;
    }
    this.farmerForceIdleFrame = false;
    if (this.plantingTarget || this.returnTarget || this.farmerPlanting) {
      this.setMessage("The caveman must finish his current action before moving again.");
      return;
    }
    if (!this.selectedPlant) { this.setMessage("Choose a plant card first."); return; }
    const plantConfigs = { radish: RADISH_CONFIG, mushroom: MUSHROOM_CONFIG, tomato: TOMATO_CONFIG, pumpkin: PUMPKIN_CONFIG, onion: ONION_CONFIG };
    const plantConfig = plantConfigs[this.selectedPlant];
    if (this.energy < plantConfig.cost) {
      this.setMessage("Not enough energy to plant " + this.selectedPlant + ".");
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
    this.playFarmerFootsteps(dt);
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
    this.playFarmerFootsteps(dt);
    const step = Math.min(distance, CAVEMAN_RETURN_SPEED * dt);
    this.caveman.x += (dx / distance) * step;
    this.caveman.y += (dy / distance) * step;
    if (dx !== 0) {
      this.facing = Math.sign(dx);
      this.caveman.scaleX = this.facing;
    }
  }

  recordCombatEvent(type, payload) {
    this.combatEventLog = appendCombatEvent(this.combatEventLog, {
      tick: Math.max(0, Math.floor(this.combatClockMs)),
      type,
      payload
    });
  }

  plantSelected(col, row, type, returnPosition = null) {
    if (this.gameOver) return;
    if (!["radish", "mushroom", "tomato", "pumpkin", "onion"].includes(type)) return;
    const placement = resolvePlantPlacement({
      energy: this.energy,
      plants: this.plants,
      type,
      col,
      row,
      columns: COLUMNS,
      rows: LANES
    });
    if (!placement.ok) {
      this.setMessage("Planting cancelled: this cell is no longer available.");
      return;
    }
    this.recordCombatEvent("plant_placed", { type, col, row });
    const configs = { radish: RADISH_CONFIG, mushroom: MUSHROOM_CONFIG, tomato: TOMATO_CONFIG, pumpkin: PUMPKIN_CONFIG, onion: ONION_CONFIG };
    const config = configs[type];
    this.energy = placement.energy;
    this.farmerPlanting = true;
    this.playFarmerAction("farmer-plant");
    const { x, y } = this.plantingCellCenter(col, row);
    const plant = {
      ...placement.plant,
      x, y,
      cooldown: PhaserMath.Between(250, 650),
      productionTimer: type === "mushroom" ? config.productionInterval : undefined,
      productionCount: 0,
      view: type === "mushroom" ? this.drawEnergyMushroom(x, y, row)
        : type === "radish" ? this.drawRadish(x, y)
        : this.drawCatalogPlant(type, x, y)
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

    const plantedMessages = {
      radish: "Radish planted! It defends this lane.",
      mushroom: "Energy Mushroom planted! It will produce collectible energy.",
      tomato: "Tomato planted! It fires tomato shots down this lane.",
      pumpkin: "Pumpkin planted! It blocks and absorbs bites.",
      onion: "Onion planted! It fires heavy onion shots down this lane."
    };
    this.setMessage(plantedMessages[type] || "Plant planted.");
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

  drawCatalogPlant(type, x, y) {
    const plant = this.add.container(x, y).setDepth(11);
    const texture = type === "tomato" ? "tomato-character" : type === "pumpkin" ? "pumpkin-character" : "onion-character";
    if (this.textures.exists(texture)) {
      const frame = this.textures.getFrame(texture);
      const height = type === "pumpkin" ? 70 : 64;
      const width = height * (frame.realWidth / frame.realHeight);
      plant.add(this.add.image(0, -height / 2 + 2, texture).setDisplaySize(Math.min(width, 76), height));
    } else {
      const fallback = this.add.ellipse(0, -24, 42, 48,
        type === "tomato" ? 0xe85b55 : type === "pumpkin" ? 0xf39b32 : 0xe8e5d7, 1);
      plant.add(fallback);
    }
    this.tweens.add({ targets: plant, scaleY: 1.025, duration: 1350, ease: "Sine.easeInOut", yoyo: true, repeat: -1 });
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
    const deltaMs = Number.isFinite(delta) ? Math.max(0, delta) : 0;
    for (const plant of this.plants) {
      if (!plant.alive) continue;
      if (plant.type === "mushroom") {
        plant.productionTimer -= delta;
        if (plant.productionTimer <= 0) {
          plant.productionTimer += MUSHROOM_CONFIG.productionInterval;
          this.spawnMushroomEnergy(plant);
        }
        continue;
      }
      if (plant.type === "pumpkin") continue;
      const configs = { radish: RADISH_CONFIG, tomato: TOMATO_CONFIG, onion: ONION_CONFIG };
      const config = configs[plant.type];
      if (!config) continue;
      // Recover safely if a plant was created by an older or partial runtime
      // state that did not initialize its firing timer.
      const cooldownMs = Number.isFinite(plant.cooldown) ? plant.cooldown : 0;
      plant.cooldown = advanceCooldown(cooldownMs, deltaMs);
      if (plant.cooldown > 0) continue;
      const plantLaneX = this.worldToLane(plant).localX;
      // Every shooter is lane-locked: it never targets an adjacent row.
      const target = this.monsters
        .filter((monster) => monster.alive && monster.row === plant.row &&
          Number.isFinite(monster.localX) && monster.localX > plantLaneX &&
          monster.localX - plantLaneX <= config.range)
        .sort((a, b) => a.localX - b.localX)[0];
      if (!target) continue;
      this.fireThorn(plant, target);
      plant.cooldown = Number.isFinite(config.cooldownMs) ? config.cooldownMs : config.cooldown;
    }
  }

  spawnMushroomEnergy(plant) {
    // Production creates a full collectible regardless of the current bank.
    // The energy cap is applied only when the player collects it, so spending
    // energy before pickup expiry cannot retroactively erase a production cycle.
    const amount = MUSHROOM_CONFIG.energy;
    plant.productionCount = (plant.productionCount ?? 0) + 1;
    const pickupId = `pickup-${this.nextEnergyPickupId++}`;
    this.recordCombatEvent("energy_spawned", { sourceCol: plant.col, sourceRow: plant.row, pickupId, amount });
    const token = this.add.container(plant.x, plant.y - 66).setDepth(35);
    token.combatPickupId = pickupId;
    token.combatPickupConsumed = false;
    this.energyPickups.push(token);
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
      if (!token.active || token.combatPickupConsumed || this.gameOver) return;
      token.combatPickupConsumed = true;
      this.collectingEnergyToken = true;
      const collection = collectEnergy(this.energy, amount);
      const collected = collection.collected;
      if (collected > 0) {
        // Collecting a mushroom is an instant resource interaction, not a
        // movement action. Never replace the farmer's planting/return
        // animation or attach an action-complete listener while he is busy:
        // that can leave the movement/action state out of sync.
        const farmerIsStationary = !this.plantingTarget && !this.returnTarget && !this.farmerPlanting;
        const currentFarmerAction = this.cavemanVisual?.anims?.currentAnim?.key;
        const actionInProgress = [
          "farmer-plant", "farmer-uproot", "farmer-attack", "farmer-hit", "farmer-death", "farmer-collect"
        ].includes(currentFarmerAction) && this.cavemanVisual?.anims?.isPlaying;
        if (farmerIsStationary && !actionInProgress) {
          this.playFarmerAction("farmer-collect");
        }
        this.recordCombatEvent("energy_collected", { pickupId: token.combatPickupId, amount: collected });
        this.energy = collection.energy;
        this.energyCollected += collected;
        this.playEnergyCollectSound();
        this.setMessage("Collected " + collected + " mushroom energy!");
      } else {
        this.recordCombatEvent("energy_discarded", { pickupId: token.combatPickupId });
        this.setMessage("Energy is full. Defeat monsters or spend energy before collecting more.");
      }
      this.refreshHud();
      if (token.expiryTimer) token.expiryTimer.remove(false);
      this.energyPickups = this.energyPickups.filter((pickup) => pickup !== token);
      this.tweens.add({
        targets: token, y: token.y - 30, alpha: 0, scale: 1.35, duration: 220,
        onComplete: () => token.destroy()
      });
    });
    this.tweens.add({
      targets: token, y: token.y - 9, duration: 700, ease: "Sine.easeInOut",
      yoyo: true, repeat: -1
    });
    token.expiryTimer = this.time.delayedCall(MUSHROOM_PICKUP_TTL_MS, () => {
      if (token.active) {
        this.energyPickups = this.energyPickups.filter((pickup) => pickup !== token);
        this.tweens.add({ targets: token, alpha: 0, duration: 350, onComplete: () => token.destroy() });
      }
    });
  }

  fireThorn(plant, target) {
    // The Radish fires a miniature copy of its own artwork, turned sideways
    // so the root points toward incoming monsters. Keep the combat contract
    // (lane, speed, damage and collision) unchanged.
    const lane = this.worldToLane(plant);
    // Start at the visual center of the plant itself, not at its lower edge
    // or at the monster's lowered collision lane.
    const localX = lane.localX;
    const row = plant.row;
    const targetRow = plant.row;
    const targetLocalX = Math.max(localX + 1, target.localX);
    const position = { x: plant.x, y: plant.y };
    // After launch, the projectile follows the centerline through the soil
    // cell centroids across X, using the perspective-calibrated grid mesh.
    const verticalOffset = 0;
    const launchY = position.y;
    const view = this.add.container(position.x, launchY).setDepth(16);

    const halo = this.add.circle(0, 0, 18, 0xff7185, 0.13);
    const outerGlow = this.add.circle(0, 0, 13, 0x8bd66f, 0.2);
    const innerGlow = this.add.circle(0, 0, 9, 0xffd5dc, 0.28);
    view.add([halo, outerGlow, innerGlow]);

    const projectileTexture = plant.type === "tomato" ? "tomato-character"
      : plant.type === "onion" ? "onion-character" : "radish-character";
    if (this.textures.exists(projectileTexture)) {
      const projectileSize = plant.type === "onion" ? 27 : 29;
      const plantProjectile = this.add.image(0, 0, projectileTexture)
        .setDisplaySize(projectileSize, projectileSize)
        .setRotation(-Math.PI / 2);
      view.add(plantProjectile);
    } else {
      // Visible fallback only if the Radish artwork failed to load.
      const fallback = this.add.ellipse(0, 0, 23, 13, 0xff7185, 1)
        .setStrokeStyle(2, 0xffffff, 0.9);
      const leaf = this.add.triangle(-8, -2, -3, 0, -12, -8, -12, 5, 0x65bd62);
      view.add([fallback, leaf]);
    }

    this.tweens.add({
      targets: [halo, outerGlow],
      alpha: { from: 0.12, to: 0.42 },
      scale: { from: 0.86, to: 1.18 },
      duration: 180,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1
    });
    this.tweens.add({
      targets: innerGlow,
      alpha: { from: 0.18, to: 0.42 },
      scale: { from: 0.9, to: 1.16 },
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
      view, localX, row, startRow: row, targetRow, target,
      startLocalX: localX, targetLocalX, verticalOffset,
      speed: (plant.type === "tomato" ? TOMATO_CONFIG : plant.type === "onion" ? ONION_CONFIG : RADISH_CONFIG).projectileSpeed,
      damage: (plant.type === "tomato" ? TOMATO_CONFIG : plant.type === "onion" ? ONION_CONFIG : RADISH_CONFIG).projectileDamage,
      collisionRadius: (plant.type === "tomato" ? TOMATO_CONFIG : plant.type === "onion" ? ONION_CONFIG : RADISH_CONFIG).projectileCollisionRadius,
      alive: true, trailTimer: 0
    });
    this.playThornSound();
  }

  createProjectileImpact(x, y) {
    const burst = this.add.container(x, y).setDepth(24);
    const flash = this.add.circle(0, 0, 10, 0xfff4f7, 0.96);
    const sparks = [];
    const colors = [0xff7185, 0x8bd66f, 0xffc7d0, 0x65bd62, 0xffffff, 0xffa4b2];
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI * 2 * i) / 6;
      const spark = this.add.circle(Math.cos(angle) * 5, Math.sin(angle) * 5, 3, colors[i], 1);
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
    // TEMPORARY PLAYTEST OVERRIDE: show the running hyena as the very first
    // enemy in wave 1. Remove this single condition to restore the original
    // campaign order after the run animation has been verified.
    if (this.wave === 1 && spawnIndex === 0) return "dust-skitter";
    return resolveMonsterArchetype(this.wave, spawnIndex);
  }

  createHyenaAnimations() {
    // These four authored sheets are the required monster artwork. Hit and
    // death are optional single-pose sheets and must never disable the hyenas.
    const requiredDefinitions = [
      ["hyena-idle", 4, 5, -1],
      ["hyena-walk", 9, 9, -1],
      ["hyena-run", 9, 14, -1],
      ["hyena-bite", 6, 9, -1]
    ];
    const optionalDefinitions = [
      ["hyena-hit", 3, 12, 0],
      ["hyena-death", 6, 8, 0]
    ];

    try {
      if (this.hyenaAssetFailed) throw new Error("A required hyena sprite sheet failed to load.");

      for (const [key, expectedFrames, frameRate, repeat] of requiredDefinitions) {
        if (!this.textures.exists(key)) throw new Error(`Missing required hyena sheet: ${key}.`);
        const texture = this.textures.get(key);
        const available = Object.keys(texture.frames).filter((name) => name !== "__BASE").length;
        // The bite artwork is authored in the final row of its 3x3 sheet.
        // Frames 0-5 are setup/transition poses; only 6-8 are the actual
        // grounded chewing cycle. Playing the earlier frames made the hyena
        // appear to sink or float while it was eating.
        const startFrame = key === "hyena-bite" ? 6 : 0;
        if (available <= startFrame) {
          throw new Error(`Invalid ${key} sheet: expected frames starting at ${startFrame}, found ${available}.`);
        }
        // Respect the authored frame range while tolerating shorter approved
        // sheets (for example, hyena-idle may contain only 3 frames).
        const frameCount = Math.min(expectedFrames, available - startFrame);
        const endFrame = startFrame + frameCount - 1;
        if (this.anims.exists(key)) this.anims.remove(key);
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(key, { start: startFrame, end: endFrame }),
          frameRate,
          repeat
        });
      }

      for (const [key, expectedFrames, frameRate, repeat] of optionalDefinitions) {
        if (!this.textures.exists(key)) continue;
        const texture = this.textures.get(key);
        const available = Object.keys(texture.frames).filter((name) => name !== "__BASE").length;
        if (available < 1) continue;
        const frameCount = Math.min(expectedFrames, available);
        if (this.anims.exists(key)) this.anims.remove(key);
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(key, { start: 0, end: frameCount - 1 }),
          frameRate,
          repeat
        });
      }

      // Jump is an optional authored animation with five 216x447 frames on
      // row one and three 360x447 frames on row two. Keep its irregular grid
      // intact rather than forcing Phaser to slice it into equal cells.
      if (this.textures.exists("hyena-jump")) {
        const jumpTexture = this.textures.get("hyena-jump");
        const jumpFrames = [
          ...Array.from({ length: 5 }, (_, i) => ({ x: i * 216, y: 0, width: 216, height: 447 })),
          ...Array.from({ length: 3 }, (_, i) => ({ x: i * 360, y: 447, width: 360, height: 447 }))
        ];
        jumpFrames.forEach((frame, index) => {
          jumpTexture.add(String(index), 0, frame.x, frame.y, frame.width, frame.height);
        });
        if (this.anims.exists("hyena-jump")) this.anims.remove("hyena-jump");
        this.anims.create({
          key: "hyena-jump",
          frames: jumpFrames.map((_, index) => ({ key: "hyena-jump", frame: String(index) })),
          frameRate: 10,
          repeat: 0
        });
      }

      return true;
    } catch (error) {
      console.error("Required hyena artwork is unavailable; refusing to replace it with vector monsters.", error);
      this.hyenaAssetFailed = true;
      return false;
    }
  }

  playHyenaAnimation(monster, key, force = false) {
    const sprite = monster && monster.hyenaSprite;
    if (!sprite || !sprite.active || !this.hyenaAnimationsReady || !this.anims.exists(key)) return;
    if (!force && monster.hitAnimUntil > this.time.now && key !== "hyena-hit") return;
    const currentKey = sprite.anims.currentAnim?.key;
    if (!force && currentKey === key && sprite.anims.isPlaying) return;
    sprite.play(key);
  }

  spawnMonster(spawnIndex = this.spawnedThisWave) {
    const row = this.simulationRandom.nextInt(0, LANES - 1);
    const archetype = this.monsterArchetypeFor(spawnIndex);
    const profile = getMonsterCombatStats(archetype, this.wave);
    const hp = profile.hp;
    const speed = profile.speed;
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
      : archetype === "alpha-brute" ? 0x4d3931
      : archetype === "dust-skitter" ? 0x895b3a : 0x765036;
    const headColor = archetype === "stonehide" ? 0x898578
      : archetype === "alpha-brute" ? 0x80604b
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

    let monsterRecord = null;
    const hyenaSprite = this.hyenaAnimationsReady
      ? this.add.sprite(0, 0, "hyena-idle", 0).setOrigin(0.5, 1).setFlipX(true).setScale(0.918)
      : null;
    const tierTint = MONSTER_TIER_TINTS[archetype] ?? 0xffffff;
    // Monster visuals must always use the authored hyena artwork. Never show
    // the old programmatically drawn creature as a fallback.
    g.setVisible(false);
    view.add(g);
    if (hyenaSprite) {
      view.add(hyenaSprite);
      hyenaSprite.setTint(tierTint);
      hyenaSprite.play("hyena-idle");
      hyenaSprite.on("animationcomplete", (animation) => {
        if (!monsterRecord || !monsterRecord.alive) return;
        if (animation.key === "hyena-bite" || animation.key === "hyena-hit") {
          this.playHyenaAnimation(monsterRecord, "hyena-idle", true);
        }
      });
    }

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
    // Keep the running test hyena level and at a constant visual scale.
    // Other monster archetypes retain their subtle idle wobble.
    if (archetype !== "dust-skitter") {
      this.tweens.add({
        targets: view, angle: { from: -2.5, to: 2.5 },
        duration: profile.wobbleDurationMs, ease: "Sine.easeInOut",
        yoyo: true, repeat: -1
      });
    }

    if (archetype === "dust-skitter" && this.wave === 3 && spawnIndex === 1) {
      this.setMessage("A Dust Skitter has joined the raid: quick, but easier to bring down.");
    } else if (archetype === "stonehide" && spawnIndex === 4) {
      this.setMessage("A Stonehide is approaching: slow, heavily plated, and tough to stop.");
    } else if (archetype === "alpha-brute") {
      this.setMessage("ALPHA BRUTE! A giant raider with double health and crushing bites is approaching!");
    }

    monsterRecord = {
      combatId: `monster-${this.totalSpawnedMonsters + 1}`,
      kind: archetype,
      row, x: spawn.x, y: spawn.y, localX: SPAWN_LOCAL_X, hp,
      widthScale: profile.widthScale,
      heightScale: profile.heightScale,
      speed,
      plantDamage: profile.plantDamage,
      attackInterval: profile.attackIntervalMs,
      incomingDamageMultiplier: profile.incomingDamageMultiplier,
      // The skitter alternates normal movement with short, readable bursts.
      burstCooldown: archetype === "dust-skitter" ? this.simulationRandom.nextInt(profile.initialBurstCooldownMinMs, profile.initialBurstCooldownMaxMs) : 0,
      burstRemaining: 0,
      combatProfile: profile,
      // Dust Skitters occasionally hop; this is purely visual and never
      // changes their lane, collision position, or ability to be hit.
      jumpCooldown: archetype === "dust-skitter" ? this.simulationRandom.nextInt(profile.jumpCooldownMinMs, profile.jumpCooldownMaxMs) : 0,
      jumpDuration: 560,
      jumpElapsed: 0,
      isJumping: false,
      braced: false,
      braceCue,
      maxHp: hp,
      tierTint,
      hitFlashGraphic: g, hitFlashTimer: null, hyenaSprite, hitAnimUntil: 0,
      attackCooldown: 0, alive: true, view, dustTimer: 0,
      replayMoveElapsedMs: 0, replayMoveStartLocalX: SPAWN_LOCAL_X, replayLastMovementTick: Math.floor(this.combatClockMs), replayLastBlockerCol: null,
      knockedPlants: new Set(),
      voiceCooldown: PhaserMath.Between(4200, 8500)
    };
    this.monsters.push(monsterRecord);
    this.recordCombatEvent("monster_spawned", {
      monsterId: monsterRecord.combatId, wave: this.wave, spawnIndex, row, archetype,
      hp, speed, localX: SPAWN_LOCAL_X
    });
  }

  knockBackPlant(plant, monster) {
    if (!plant?.alive || !plant.view?.active) return;

    // A creature passing a plant jolts it away from the direction of travel.
    // Keep its logical grid position unchanged; this is a short impact animation.
    const view = plant.view;
    const perspectiveGap = plant.row < LANES - 1
      ? this.laneYs[plant.row + 1] - this.laneYs[plant.row]
      : this.laneYs[plant.row] - this.laneYs[plant.row - 1];
    const shove = PhaserMath.Clamp(perspectiveGap * 0.24, 9, 19);
    this.tweens.add({
      targets: view,
      x: view.x + shove,
      y: view.y - shove * 0.28,
      angle: PhaserMath.Between(-9, 9),
      scaleX: 1.08,
      duration: 105,
      ease: "Cubic.easeOut",
      yoyo: true,
      hold: 35,
      onComplete: () => {
        if (view.active) view.setAngle(0).setScale(1, view.scaleY);
      }
    });
    plant.lastKnockbackAt = this.time.now;
    this.playMonsterLandSound();
  }

  updateMonsters(dt, delta) {
    for (const monster of this.monsters) {
      if (!monster.alive) continue;
      monster.attackCooldown = advanceCooldown(monster.attackCooldown, delta);
      if (monster.hyenaSprite && !this.gameOver) {
        monster.voiceCooldown -= delta;
        if (monster.voiceCooldown <= 0) {
          if (Math.random() < 0.42) this.playHyenaVoice(Math.random() < 0.58 ? "laugh" : "growl", 0.38);
          monster.voiceCooldown = PhaserMath.Between(6500, 12500);
        }
      }
      // Radish and Pumpkin plants block their own lane. Resource producers
      // and ranged attackers are passed by monsters.
      const blocker = selectLaneBlocker({
        plants: this.plants.map((plant) => ({
          plant,
          localX: plant.alive && ["radish", "pumpkin"].includes(plant.type) && plant.row === monster.row
            ? this.worldToLane(plant).localX
            : null
        })),
        row: monster.row,
        monsterLocalX: monster.localX
      });
      const blockerLocalX = blocker ? this.worldToLane(blocker).localX : -Infinity;
      // Calculate a real visual clearance from both rendered bounds, then
      // convert screen pixels back into this lane's local movement units.
      const lanePixelStep = blocker
        ? Math.abs(this.monsterLanePoint(blockerLocalX + 1, monster.row).x -
          this.monsterLanePoint(blockerLocalX, monster.row).x)
        : 1;
      const monsterHalfWidth = monster.hyenaSprite
        ? monster.hyenaSprite.width * monster.hyenaSprite.scaleX * monster.view.scaleX * 0.5
        : monster.view.getBounds().width * 0.5;
      const plantHalfWidth = blocker ? blocker.view.getBounds().width * 0.5 : 0;
      const biteReach = blocker
        ? (monsterHalfWidth + plantHalfWidth + 10) / Math.max(0.01, lanePixelStep)
        : 0;
      const withinBiteRange = Boolean(blocker && monster.localX - blockerLocalX <= biteReach);

      // A Stonehide locks its shale plates into place while chewing a plant.
      // This state also changes how much damage incoming hits can inflict.
      if (monster.kind === "stonehide") {
        monster.braced = withinBiteRange;
        if (monster.braceCue && monster.braceCue.visible !== monster.braced) {
          monster.braceCue.setVisible(monster.braced);
        }
      }

      if (withinBiteRange) {
        const enteringBiteRange = !monster.isEating;
        monster.replayMoveElapsedMs += delta;
        const movementTick = Math.floor(this.combatClockMs);
        if (enteringBiteRange || monster.replayLastBlockerCol !== blocker.col || monster.replayMoveElapsedMs >= 500) {
          this.recordCombatEvent("monster_moved", {
            monsterId: monster.combatId,
            distance: Math.max(0, monster.replayMoveStartLocalX - monster.localX),
            deltaMs: Math.max(0, movementTick - monster.replayLastMovementTick),
            blockerCol: blocker.col,
            biteReach: Math.min(1.5, biteReach)
          });
          monster.replayMoveStartLocalX = monster.localX;
          monster.replayLastMovementTick = movementTick;
          monster.replayMoveElapsedMs = 0;
          monster.replayLastBlockerCol = blocker.col;
        }
        if (monster.isJumping) {
          monster.isJumping = false;
          monster.jumpElapsed = 0;
          if (monster.hyenaSprite?.active) monster.hyenaSprite.y = 0;
        }
        // Keep the hyena fixed at the plant while its authored bite cycle loops.
        // The bite sheet animates the mouth/body (including the legs); movement
        // coordinates are deliberately not advanced anywhere in this branch.
        if (!monster.isEating) monster.isEating = true;
        if (monster.hyenaSprite && monster.hitAnimUntil <= this.time.now) {
          this.playHyenaAnimation(monster, "hyena-bite");
        }
        const bite = resolveBiteAttack({
          cooldownMs: monster.attackCooldown,
          deltaMs: 0,
          intervalMs: monster.attackInterval
        });
        monster.attackCooldown = bite.cooldownMs;
        if (bite.shouldAttack) {
          this.recordCombatEvent("monster_bite", {
            monsterId: monster.combatId, plantCol: blocker.col, plantRow: blocker.row,
            damage: monster.plantDamage
          });
          blocker.hp = applyHitPointsDamage(blocker.hp, monster.plantDamage).hp;
          this.playMonsterBiteSound();
          this.flashEatenPlant(blocker);
          if (blocker.hp <= 0) this.destroyPlant(blocker);
        }
        continue;
      }
      if (monster.isEating) {
        monster.isEating = false;
      }
      if (!blocker && monster.localX <= HOME_LOCAL_X + 34) {
        // The first monster to cross the final line ends the run immediately.
        // There is no farmhouse health buffer or additional attack interval.
        this.endGame(false);
        return;
      }

      let movementSpeed = monster.speed;
      let jumpOffset = 0;
      if (monster.kind === "dust-skitter") {
        const profile = monster.combatProfile;
        const jumpWillStart = false;
        const jumpWillLand = false;
        const burstWillStart = monster.burstCooldown - delta <= 0 && monster.burstRemaining <= 0;
        const motion = resolveDustSkitterMotionStep({
          isJumping: false,
          jumpCooldownMs: monster.jumpCooldown,
          jumpElapsedMs: monster.jumpElapsed,
          jumpDurationMs: monster.jumpDuration,
          deltaMs: delta,
          jumpSpeedMultiplier: 1,
          jumpVisualHeight: 0,
          visualScale: 1,
          nextJumpDurationMs: null,
          nextJumpResetCooldownMs: null,
          burstCooldownMs: monster.burstCooldown,
          burstRemainingMs: monster.burstRemaining,
          burstDurationMs: profile.burstDurationMs,
          burstSpeedMultiplier: profile.burstSpeedMultiplier,
          nextBurstCooldownMs: burstWillStart
            ? this.simulationRandom.nextInt(profile.burstCooldownMinMs, profile.burstCooldownMaxMs)
            : null,
          enableJump: false
        });
        monster.isJumping = motion.isJumping;
        monster.jumpCooldown = motion.jumpCooldownMs;
        monster.jumpElapsed = motion.jumpElapsedMs;
        monster.jumpDuration = motion.jumpDurationMs;
        monster.burstCooldown = motion.burstCooldownMs;
        monster.burstRemaining = motion.burstRemainingMs;
        jumpOffset = motion.jumpOffset;
        movementSpeed *= motion.movementMultiplier;
        if (motion.burstStarted) {
          this.createFootstepDust(monster.x - 10, monster.y + 3, monster.view.scaleY * 1.15);
          this.createFootstepDust(monster.x + 4, monster.y + 1, monster.view.scaleY);
        }
      }

      // Stop just outside the plant's bite reach. Clamp the step so even a
      // fast skitter cannot tunnel through a plant between two update frames.
      const laneStep = resolveMonsterLaneStep({
        localX: monster.localX,
        speed: movementSpeed,
        deltaSeconds: dt,
        blockerLocalX: blocker ? blockerLocalX : null,
        biteReach
      });
      monster.localX = laneStep.localX;
      monster.replayMoveElapsedMs += delta;
      const blockerCol = blocker ? blocker.col : null;
      const movementTick = Math.floor(this.combatClockMs);
      const movementCheckpointDue = monster.replayMoveElapsedMs >= 500 ||
        (withinBiteRange && monster.replayLastBlockerCol !== blockerCol) ||
        monster.replayLastBlockerCol !== blockerCol;
      if (movementCheckpointDue) {
        this.recordCombatEvent("monster_moved", {
          monsterId: monster.combatId,
          distance: Math.max(0, monster.replayMoveStartLocalX - monster.localX),
          deltaMs: Math.max(0, movementTick - monster.replayLastMovementTick),
          blockerCol,
          biteReach: blocker ? Math.min(1.5, biteReach) : 0
        });
        monster.replayMoveStartLocalX = monster.localX;
        monster.replayLastMovementTick = movementTick;
        monster.replayMoveElapsedMs = 0;
        monster.replayLastBlockerCol = blockerCol;
      }

      const position = this.monsterLanePoint(monster.localX, monster.row);
      monster.x = position.x; monster.y = position.y;
      monster.view.setPosition(position.x, position.y);
      if (monster.hyenaSprite?.active) monster.hyenaSprite.y = 0;
      if (monster.hyenaSprite && monster.hitAnimUntil <= this.time.now) {
        // The corrected 15-frame run sheet belongs to the fast hyena.
        // Keep it running for the full advance so its new crop can be tested
        // clearly in a normal battle, rather than only during a short burst.
        const movementAnimation = monster.kind === "dust-skitter"
          ? "hyena-run"
          : "hyena-walk";
        this.playHyenaAnimation(monster, movementAnimation);
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
      shot.localX = resolveProjectileLaneStep({ localX: shot.localX, speed: shot.speed, deltaSeconds: dt });
      // Keep the projectile locked to the Radish's original lane. Only its
      // horizontal aim follows the target; it never travels diagonally.
      if (shot.target && shot.target.alive && shot.target.row === shot.row &&
          Number.isFinite(shot.target.localX)) {
        shot.targetLocalX = Math.max(shot.startLocalX + 1, shot.target.localX);
      }

      shot.currentRow = shot.row;
      // Projectiles travel through the horizontal centerline of each
      // perspective soil cell; monster sprites use a separately lowered lane.
      const position = this.lanePoint(shot.localX, shot.row);
      shot.view.setPosition(position.x, position.y + shot.verticalOffset);

      shot.trailTimer -= dt * 1000;
      if (shot.trailTimer <= 0) {
        this.createProjectileTrail(position.x - 5, position.y + shot.verticalOffset);
        shot.trailTimer = 48;
      }

      // A Radish projectile can damage monsters in its own lane only.
      let hit = null;
      let nearestHitDistance = Infinity;
      for (const monster of this.monsters) {
        if (!monster?.alive || monster.row !== shot.row ||
            !Number.isFinite(monster.localX)) continue;
        const horizontalDistance = Math.abs(monster.localX - shot.localX);
        const hitRadius = (shot.collisionRadius || PHASE_ONE_PLANTS.radish.projectileCollisionRadius) * (monster.widthScale || 1);
        if (horizontalDistance > hitRadius || horizontalDistance >= nearestHitDistance) continue;
        hit = monster;
        nearestHitDistance = horizontalDistance;
      }

      if (hit) {
        this.createProjectileImpact(position.x, position.y + shot.verticalOffset);
        this.playThornImpactSound();
        this.applyMonsterDamage(
          hit, shot.damage * this.incomingMonsterDamageMultiplier(hit)
        );
        if (hit.view && hit.view.active) {
          this.tweens.add({
            targets: hit.view,
            x: hit.view.x - 3,
            duration: 65,
            yoyo: true,
            ease: "Sine.easeOut"
          });
          this.createStoneHitDust(position.x, position.y + shot.verticalOffset + 4, hit.view.scaleY);
        }
        this.damageMonsterIfNeeded(hit);
        shot.alive = false;
        shot.view.destroy();
        continue;
      }

      if (shot.localX > shot.targetLocalX + PHASE_ONE_PLANTS.radish.projectileCollisionRadius ||
          shot.localX > SPAWN_LOCAL_X + 80) {
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
    return monster.kind === 'stonehide' ? getStonehideIncomingDamageMultiplier(monster.braced) : armorMultiplier;
  }

  flashMonsterOnHit(monster) {
    if (!monster || !monster.alive) return;

    // Keep the hyena grounded and on its original lane. Strengthen the flash
    // by about 30%, then add a tiny horizontal recoil on the sprite only.
    // The monster record/container position is never changed, so its route,
    // collision lane, and movement progress remain untouched.
    const sprite = monster.hyenaSprite;
    if (sprite?.active) {
      monster.hitAnimUntil = this.time.now + 260;
      // The authored hit sheet has an upward hop; use the grounded idle pose
      // and communicate impact with tint + a brief horizontal recoil instead.
      this.playHyenaAnimation(monster, "hyena-idle", true);
      sprite.setTint(0xffcf70);
      this.tweens.killTweensOf(sprite);
      const baseX = Number.isFinite(monster.hitRecoilBaseX) ? monster.hitRecoilBaseX : sprite.x;
      monster.hitRecoilBaseX = baseX;
      sprite.x = baseX;
      this.tweens.add({
        targets: sprite,
        x: baseX + 9,
        duration: 65,
        ease: "Quad.easeOut",
        yoyo: true,
        onComplete: () => {
          if (sprite.active) sprite.x = baseX;
        }
      });
    }

    const graphic = monster.hitFlashGraphic;
    if (graphic?.active) graphic.setBlendMode(1);

    if (monster.hitFlashTimer) monster.hitFlashTimer.remove(false);
    monster.hitFlashTimer = this.time.delayedCall(125, () => {
      if (sprite?.active) {
        // Restore the creature's rarity color after the temporary hit flash.
        sprite.setTint(monster.tierTint ?? 0xffffff);
        if (Number.isFinite(monster.hitRecoilBaseX)) sprite.x = monster.hitRecoilBaseX;
      }
      if (graphic?.active) graphic.setBlendMode(0);
      monster.hitFlashTimer = null;
    });
  }

  applyMonsterDamage(monster, amount) {
    if (!monster || !monster.alive || amount <= 0) return;
    monster.hp = applyHitPointsDamage(monster.hp, amount).hp;
    this.playMonsterHitSound();
    if (monster.hyenaSprite) this.playHyenaVoice("yelp", 0.82);
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
    this.createMonsterDefeatBurst(monster.x, monster.y, monster.view && monster.view.scaleY);
    this.playMonsterDefeatSound();
    if (monster.hyenaSprite) this.playHyenaVoice("yelp", 0.88);
    this.playCoinRewardSound();
    // Play the authored death sequence before removing the creature. The
    // reward and wave counters are still granted immediately and exactly once.
    if (monster.view && monster.view.active) {
      this.tweens.killTweensOf(monster.view);
      if (monster.hyenaSprite && monster.hyenaSprite.active) {
        this.playHyenaAnimation(monster, "hyena-death", true);
        this.time.delayedCall(760, () => {
          if (monster.view && monster.view.active) monster.view.destroy(true);
        });
      } else {
        monster.view.destroy(true);
      }
    }
    this.coins += PHASE_ONE_REWARDS.ordinaryMonsterDefeatCoins;
    this.registry.set("coins", this.coins);
    try {
      saveCoins(window.localStorage, this.coins);
    } catch {
      // A blocked storage API must never interrupt combat or reward handling.
    }
    this.totalDefeatedMonsters += 1;
    this.waveDefeatedMonsters += 1;
  }

  uprootPlant(plant) {
    if (!plant || !plant.alive || this.gameOver) return;
    const uproot = resolvePlantUproot({ energy: this.energy, plant });
    if (!uproot.ok) return;
    this.recordCombatEvent("plant_uprooted", { type: plant.type, col: plant.col, row: plant.row });
    plant.alive = false;
    plant.view.destroy();
    // Only manual uprooting refunds energy; destroyed plants do not.
    this.energy = uproot.energy;
    // Uprooting is performed while the farmer is standing still. Do not
    // switch to an action sprite sheet or alter his locomotion animation.
    this.playUprootSound();
    this.setMessage("Plant uprooted. Its full energy cost was refunded; choose any empty soil cell to replant.");
    this.updateEmergencyMode();
    this.refreshHud();
  }

  flashEatenPlant(plant) {
    if (!plant?.alive || !plant.view?.active) return;
    // Brief warm-red pulse on the plant artwork each time the hyena bites.
    // Only image children support tint; fallback vector art still gets a pulse.
    const artwork = (plant.view.list || []).filter((child) => child?.active);
    for (const child of artwork) {
      if (typeof child.setTint === "function") {
        child.setTint(0xff7777);
        this.tweens.killTweensOf(child);
        this.tweens.add({
          targets: child,
          alpha: 0.58,
          duration: 90,
          yoyo: true,
          onComplete: () => {
            if (child.active) {
              child.clearTint?.();
              child.setAlpha(1);
            }
          }
        });
      } else {
        this.tweens.killTweensOf(plant.view);
        this.tweens.add({
          targets: plant.view,
          alpha: 0.62,
          duration: 90,
          yoyo: true,
          onComplete: () => {
            if (plant.view?.active) plant.view.setAlpha(1);
          }
        });
      }
    }
  }

  destroyPlant(plant) {
    if (!plant.alive) return;
    plant.alive = false; plant.view.destroy();
    if (plant.energyCounter) plant.energyCounter.destroy();
    const defeatedMessages = {
      mushroom: "An energy mushroom has been eaten!",
      radish: "A radish defender has fallen!",
      tomato: "The tomato plant has been eaten!",
      pumpkin: "The pumpkin guard has been destroyed!",
      onion: "The onion plant has been eaten!"
    };
    this.setMessage(defeatedMessages[plant.type] || "A plant has been destroyed!");
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
    const target = selectFarmerMeleeTarget({
      monsters: this.monsters,
      row: this.nearestLane(this.caveman.y),
      farmerX: this.caveman.x,
      reach: PHASE_ONE_FARMER.clubReachPx
    });
    this.playFarmerAction("farmer-attack");
    this.tweens.add({ targets: this.caveman, angle: this.facing * 22, duration: 100, yoyo: true });
    if (target) {
      this.applyMonsterDamage(
        target, PHASE_ONE_FARMER.clubDamage * this.incomingMonsterDamageMultiplier(target)
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
    if (this.gameOver || !isWaveComplete(this.spawnedThisWave, this.waveSize, this.monsters.length)) return;

    const clearedWave = this.wave;
    if (isPhaseOneVictory(this.wave, this.totalWaves, this.spawnedThisWave, this.waveSize, this.monsters.length)) {
      // The dragon is a separate boss and is never included in ordinary wave counts.
      if (this.dragonBoss) {
        this.tryFinishPhaseOne();
        if (this.dragonBoss.alive) this.setMessage("The ordinary monsters are defeated. Finish the dragon to rescue the princess!");
        return;
      }
      this.endGame(true);
      return;
    }

    this.wave += 1;
    this.spawnedThisWave = 0;
    this.waveDefeatedMonsters = 0;
    this.waveSize = PHASE_ONE_WAVE_SIZES[this.wave - 1];
    this.waveIntermissionMs = PHASE_ONE_TIMING.waveIntermissionMs;
    this.spawnTimer = PHASE_ONE_TIMING.nextWaveSpawnDelayMs;
    this.setMessage(
      "Wave " + clearedWave + " cleared. Prepare for wave " + this.wave +
      ": " + this.waveSize + " monsters in 5 seconds."
    );
  }

  playVictoryMusic() {
    this.playSfx("sfx-victory", this.effectsVolume * 0.82);
  }

  playDefeatMusic() {
    this.playSfx("sfx-defeat", this.effectsVolume * 0.82);
  }

  endGame(won) {
    if (this.gameOver) return;
    // A campaign win is valid only after the dragon is defeated and the rescue sequence completes.
    won = Boolean(won && this.phaseOneStoryState === "complete");
    this.gameOver = true;
    // Collectibles are no longer usable after a terminal result; remove their
    // expiry timers and idle tweens instead of leaving disabled pickups visible.
    for (const token of this.energyPickups) {
      if (token.expiryTimer) token.expiryTimer.remove(false);
      this.tweens.killTweensOf(token);
      if (token.active) token.destroy();
    }
    this.energyPickups = [];
    this.plantingTarget = null;
    this.returnTarget = null;
    this.farmerPlanting = false;
    const locale = typeof window !== "undefined" ? window.localStorage.getItem("farmVsMonsters.language") || "ar" : "ar";
    this.setMessage(won ? "VICTORY! The farm is safe." : "GAME OVER — The monsters reached the final line.");
    if (won) { try { unlockNextStage(window.localStorage, 1); } catch { /* Keep the local game result even if storage is unavailable. */ } }
    this.add.rectangle(560, 340, 1120, 680, 0x10170f, 0.72).setDepth(60);
    if (won) {
      this.stopBackgroundMusic();
      this.add.rectangle(560, 350, 790, 520, 0x8b65e8, 0.18)
        .setStrokeStyle(1.5, 0xffffff, 0.48).setDepth(61);
      this.add.rectangle(560, 350, 770, 500, 0x315b91, 0.68)
        .setStrokeStyle(1, 0xffffff, 0.72).setDepth(61);
      this.add.rectangle(560, 350, 748, 478, 0x35bceb, 0.10)
        .setStrokeStyle(1, 0xa7e84f, 0.28).setDepth(61);
      // A celebratory finish is shown only after the farmer has carried his wife home.
      const celebration = [
        [205, 150, 0xffdf75], [915, 150, 0xffdf75], [245, 520, 0xffb5a0],
        [875, 520, 0xffb5a0], [310, 225, 0x9bdc87], [810, 225, 0x9bdc87],
        [390, 125, 0xffdf75], [730, 125, 0xffdf75]
      ];
      celebration.forEach(([x, y, color], index) => {
        const star = this.add.star(x, y, 5, 5, 12, color, 1).setDepth(63);
        this.tweens.add({
          targets: star, angle: 180, scale: { from: 0.75, to: 1.2 },
          alpha: { from: 0.55, to: 1 }, duration: 1150 + index * 95,
          ease: "Sine.easeInOut", yoyo: true, repeat: -1
        });
      });
      if (this.textures.exists("phase-one-emblem")) {
        this.add.image(560, 155, "phase-one-emblem").setDisplaySize(150, 90).setDepth(62);
      }
      // Reuse the player's rescued-princess artwork in the final celebration.
      if (this.textures.exists("phase-one-princess-rescued")) {
        this.add.image(850, 246, "phase-one-princess-rescued")
          .setDisplaySize(76, 112).setDepth(63);
      }
      this.add.text(560, 225, locale === "ar" ? "عادت الزوجة إلى المزرعة!" : "SHE IS HOME!", {
        fontFamily: "Arial", fontSize: locale === "ar" ? "30px" : "34px",
        color: "#ffffff", fontStyle: "bold", stroke: "#17213d", strokeThickness: 5
      }).setOrigin(0.5).setDepth(64);
      this.add.text(560, 275, translate("VICTORY!", locale), {
        fontFamily: "Arial", fontSize: "48px", color: "#ffffff", fontStyle: "bold",
        stroke: "#17213d", strokeThickness: 5
      }).setOrigin(0.5).setDepth(64);
      this.add.text(560, 322, locale === "ar" ? "اكتملت المرحلة الأولى · تم إنقاذ الأميرة" : "STAGE 1 COMPLETE · THE PRINCESS IS RESCUED", {
        fontFamily: "Arial", fontSize: locale === "ar" ? "17px" : "15px",
        color: "#ffffff", fontStyle: "bold", stroke: "#17213d", strokeThickness: 3
      }).setOrigin(0.5).setDepth(64);
      const elapsedSeconds = Math.floor(this.elapsedBattleMs / 1000);
      const minutes = Math.floor(elapsedSeconds / 60);
      const seconds = String(elapsedSeconds % 60).padStart(2, "0");
      this.add.rectangle(560, 355, 360, 34, 0x42c96b, 0.62)
        .setStrokeStyle(1, 0xffffff, 0.76).setDepth(63);
      this.add.text(560, 355, locale === "ar" ? "تم فتح المرحلة الثانية!" : "STAGE 2 UNLOCKED!", {
        fontFamily: "Arial", fontSize: locale === "ar" ? "16px" : "15px",
        color: "#ffffff", fontStyle: "bold", stroke: "#14523d", strokeThickness: 3
      }).setOrigin(0.5).setDepth(64);

      const summaryStats = locale === "ar"
        ? [
            ["الموجات المكتملة", this.totalWaves + " / 5"],
            ["الضباع المهزومة", this.totalDefeatedMonsters + " / " + this.totalSpawnedMonsters],
            ["النباتات المزروعة", String(this.totalPlantsPlanted)],
            ["الوقت", minutes + ":" + seconds],
            ["الطاقة المجموعة", String(this.energyCollected)],
            ["الطاقة المتبقية", String(this.energy)],
            ["العملات", String(this.coins)]
          ]
        : [
            ["WAVES CLEARED", this.totalWaves + " / 5"],
            ["HYENAS DEFEATED", this.totalDefeatedMonsters + " / " + this.totalSpawnedMonsters],
            ["PLANTS GROWN", String(this.totalPlantsPlanted)],
            ["TIME", minutes + ":" + seconds],
            ["ENERGY COLLECTED", String(this.energyCollected)],
            ["ENERGY REMAINING", String(this.energy)],
            ["COINS EARNED", String(this.coins)]
          ];
      const statColors = [0x258b68, 0x9a4f83, 0x287eaa, 0x6851a6];
      summaryStats.forEach(([label, value], index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const x = column === 0 ? 390 : 730;
        const y = 397 + row * 42;
        this.add.rectangle(x, y, 326, 34, statColors[index % statColors.length], 0.58)
          .setStrokeStyle(1, 0xffffff, 0.62).setDepth(63);
        this.add.text(x, y, label + "  ·  " + value, {
          fontFamily: "Arial", fontSize: locale === "ar" ? "13px" : "14px",
          color: "#ffffff", fontStyle: "bold", align: "center",
          stroke: "#17213d", strokeThickness: 3,
          wordWrap: { width: 306, useAdvancedWrap: true }
        }).setOrigin(0.5).setDepth(64);
      });
      this.createGameOverButton(445, 575, "PLAY AGAIN", 0x42c96b, () => this.scene.restart());
      this.createGameOverButton(675, 575, "CAMPAIGN MAP", 0x8b65e8, () => {
        if (typeof window !== "undefined") window.location.assign("/stages");
      });
      this.playVictoryMusic();
      return;
    }
    this.add.rectangle(560, 355, 660, 370, 0x8b65e8, 0.18)
      .setStrokeStyle(1.5, 0xffffff, 0.46).setDepth(61);
    this.add.rectangle(560, 355, 640, 350, 0x315b91, 0.70)
      .setStrokeStyle(1, 0xffffff, 0.72).setDepth(61);
    this.add.rectangle(560, 355, 620, 330, 0x35bceb, 0.09)
      .setStrokeStyle(1, 0xa7e84f, 0.28).setDepth(61);

    const title = this.add.text(560, 255, translate("FARM LOST", locale), {
      fontFamily: "Arial", fontSize: "68px", color: "#ffffff", fontStyle: "bold",
      stroke: "#8b65e8", strokeThickness: 10, shadow: { offsetX: 0, offsetY: 5, color: "#000000", blur: 12, fill: true }
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
    const summary = locale === "ar"
      ? ["وصلت إلى الموجة " + Math.min(this.wave, this.totalWaves) + " من " + this.totalWaves, "الوحوش المهزومة: " + this.totalDefeatedMonsters, "النباتات المزروعة: " + this.totalPlantsPlanted, "الطاقة المجموعة: " + this.energyCollected, "العملات: " + this.coins, "مدة الصمود: " + minutes + ":" + seconds].join("\n")
      : ["Reached wave " + Math.min(this.wave, this.totalWaves) + " of " + this.totalWaves, this.totalDefeatedMonsters + " monsters defeated", this.totalPlantsPlanted + " plants planted", "Energy collected: " + this.energyCollected, "Coins: " + this.coins, "Time survived: " + minutes + ":" + seconds].join("\n");
    this.add.text(560, 355, summary, {
      fontFamily: "Arial", fontSize: "18px", color: "#ffffff",
      align: "center", lineSpacing: 7, fontStyle: "bold"
    }).setOrigin(0.5).setDepth(62);

    this.stopBackgroundMusic();
    this.createGameOverButton(455, 465, "RETRY", 0x42c96b, () => this.scene.restart());
    this.createGameOverButton(665, 465, "HOME", 0xff7185, () => {
      if (typeof window !== "undefined") window.location.assign("/");
    });
    this.playDefeatMusic();
  }

  createGameOverButton(x, y, label, color, action) {
    const button = this.add.container(x, y).setDepth(63);
    const glow = this.add.rectangle(0, 1, 194, 62, 0xffffff, 0.10);
    const background = this.add.rectangle(0, 0, 190, 58, 0xdaf3ff, 0.22)
      .setStrokeStyle(1, 0xffffff, 0.82)
      .setInteractive({ useHandCursor: true });
    const inset = this.add.rectangle(0, 0, 180, 48, color, 0.62).setStrokeStyle(1, 0xffffff, 0.68);
    const locale = typeof window !== "undefined" ? window.localStorage.getItem("farmVsMonsters.language") || "ar" : "ar";
    const text = this.add.text(0, 0, translate(label, locale), {
      fontFamily: "Arial", fontSize: "16px", color: "#ffffff", fontStyle: "bold",
      stroke: "#17213d", strokeThickness: 3
    }).setOrigin(0.5);
    button.add([glow, background, inset, text]);
    background.on("pointerover", () => { background.setScale(1.05).setFillStyle(0x35bceb, 0.34); inset.setAlpha(0.82); });
    background.on("pointerout", () => { background.setScale(1).setFillStyle(0xdaf3ff, 0.22); inset.setAlpha(0.62); });
    background.on("pointerdown", action);
    return button;
  }

  setMessage(message) {
    this.lastMessage = message;
    const locale = typeof window !== "undefined" ? window.localStorage.getItem("farmVsMonsters.language") || "ar" : "ar";
    this.messageText.setText(translate(message, locale));
  }

  refreshHud() {
    const values = [
      "⚡ " + this.energy,
      "🪙 " + this.coins,
      "🏡 " + this.houseHealth + "%",
      "🌱 " + this.livingPlantCount(),
      "👾 " + this.totalDefeatedMonsters + "/" + PHASE_ONE_TOTAL_MONSTERS,
    ];
    if (this.hudValueTexts) {
      this.hudValueTexts.forEach((text, index) => text.setText(values[index]));
    }
    if (this.waveText) {
      this.waveText.setText("🌊 " + Math.min(this.wave, this.totalWaves) + "/" + this.totalWaves);
    }
  }
}
