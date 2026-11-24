import { Scene, Input, Math as PhaserMath } from "phaser";
import { createBattleHudButtons } from "./BattleHudButtons.js";
import { translate } from "../../app/LocaleProvider";
import { PhaserAssetManager } from "../services/assetManager.mjs";
import { VFXManager } from "../vfx/VFXManager.mjs";
import { createDefaultVFXRegistry } from "../vfx/createDefaultVFXRegistry.mjs";
import { getPlantVFXProfile } from "../vfx/PlantVFXProfiles.mjs";
import { getProjectileVFXProfile } from "../vfx/ProjectileVFXProfiles.mjs";
import { getMonsterReactionProfile, getPlantAnimationProfile, getPlantIdleMotionTransform } from "../visuals/PlantMonsterVisualProfiles.mjs";
import { createStudioAnimationProfile } from "../studio/animationProfiles.mjs";
import { getSpriteFrameRectangles } from "../studio/spriteSheetGrid.mjs";
import { createPhaserSkeletalRig } from "../studio/phaserSkeletalRig.mjs";
import { createSkeletalAnimationController, resolveSkeletalIdleClip } from "../studio/animationStateMachine.mjs";
import { circleIntersectsConvexPolygon, convexPolygonsOverlap } from "../studio/skeletalCollision.mjs";
import { transformRigHitboxToWorld, transformRigPointToWorld } from "../studio/skeletalWorldTransform.mjs";
import { getProjectileTrajectoryOffset, getProjectileHeadCorrection, getProjectileLaunchPoint } from "../studio/projectileTrajectory.mjs";
import { createStudioMonsterProfile, resolveStudioMonsterRuntimeProfile, selectWeightedStudioMonster } from "../studio/monsterProfiles.mjs";

// Campaign progression controls built-in plant availability; Studio test assets remain separately gated.
const PLAYTEST_ALL_PLANTS = false;
const ALL_PLAYTEST_PLANT_IDS = Object.freeze(["radish", "mushroom", "pumpkin", "pineapple", "hazelnut", "mango", "snow-thrower", "electric-mushroom"]);
import { createSeededRandom } from "../rules/seededRandom.mjs";
import { normalizeSeedLoadout, MAX_SEED_PACKETS } from "../rules/seedLoadout.mjs";
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
  PUMPKIN_CONFIG,
  PINEAPPLE_CONFIG,
  HAZELNUT_CONFIG,
  MANGO_CONFIG,
  SNOW_THROWER_CONFIG,
  ELECTRIC_MUSHROOM_CONFIG,
  collectEnergy,
  isWaveComplete,
  isPhaseOneVictory,
  unlockNextStage,
  loadUnlockedPlantIds,
  unlockPlantReward,
  recordMonsterDiscovery
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
    // Observe the existing preload queue without changing asset keys, URLs,
    // spritesheet frame boundaries, or load order. Optional groups can migrate
    // to loadGroup() incrementally after their dependencies are documented.
    this.assetManager = new PhaserAssetManager(this);
    this.events.once("shutdown", () => {
      this.assetManager?.destroy();
      this.assetManager = null;
    });
    this.load.image("farm-battlefield", "/assets/backgrounds/farm-battlefield.jpeg");
    this.load.image("seed-card", "/assets/items/ui/ui-seed-card.png");
    this.load.image("mushroom-card", "/assets/items/ui/ui-mushroom-card.png");
    this.load.image("seed-card-frame", "/assets/items/ui/ui-seed-card-fram.png");
    this.load.image("seed-card-locked", "/assets/items/ui/ui-seed-card-locked.png");
    this.load.image("seed-slot-empty", "/assets/items/ui/ui-seed-slot-empty.png");
    this.load.image("inventory-wood-frame", "/assets/items/ui/ui-inventory-wood-fram.png");
    // FarmVsMonsters top HUD artwork. The dedicated mushroom currency icon
    // was not included in the uploaded files, so the existing mushroom plant
    // artwork remains the icon until that separate asset is added.
    this.load.image("hud-currency-frame", "/assets/items/ui/Mushroom currency counter frame.png");
    this.load.image("hud-wave-frame", "/assets/items/ui/Wooden attack-wave progress bar frame.png");
    this.load.image("hud-wave-fill", "/assets/items/ui/Golden-orange progress fill segment.png");
    this.load.image("hud-wave-marker", "/assets/items/ui/Small wave progress marker.png");
    this.load.image("hud-wave-icon", "/assets/items/ui/Cute monster-wave indicator icon.png");
    this.load.image("hud-wave-badge", "/assets/items/ui/Empty wooden wave-number badge.png");
    this.load.image("hud-pause-button", "/assets/items/ui/Round wooden pause button with pause symbol.png");
    this.load.image("hud-settings-button", "/assets/items/ui/Round wooden settings button with golden gear.png");
    this.load.image("hud-speed-button", "/assets/items/ui/Round wooden speed button with fast-forward symbol.png");
    this.load.image("hud-health-icon", "/assets/items/ui/Cute farm-house health icon.png");
    this.load.image("hud-decorations", "/assets/items/ui/Decorative fantasy leaves, mushrooms and golden ornaments as one grouped asset.png");
    this.load.image("radish-level-1", "/assets/plants/radish-level-1.png");
    this.load.image("radish-level-1-bomb", "/assets/plants/radish-level-1-bomb.png");
    this.load.image("mushroom-character", "/assets/plants/mushroom.png");
    this.load.image("electric-mushroom-level-1", "/assets/plants/Electric-mushroom-level-1.png");
    this.load.image("pumpkin-character", "/assets/plants/pumpkin.png");
    this.load.image("mango-level-1", "/assets/plants/mango-level-1.png");
    this.load.image("mango-level-1-bomb", "/assets/plants/mango-level-1-bomb.png");
    this.load.image("snow-thrower-level-1", "/assets/plants/Snow-thrower-level-1.png");
    this.load.image("snow-thrower-bomb-level-1", "/assets/plants/Snow-thrower-bomb-level-1.png");
    this.load.image("frozen-hyena-level-1", "/assets/characters/monsters/hyena/frozen-hyena-level-1.png");
    this.load.image("frozen-hyena-level-2", "/assets/characters/monsters/hyena/frozen-hyena-level-2.png");
    // 1254×1254 artwork is a 3×3 sheet: nine 418×418 animation frames.
    this.load.spritesheet("pineapple-level-1", "/assets/plants/pineapple-level-1.png", { frameWidth: 418, frameHeight: 418, margin: 0, spacing: 0 });
    // 1024×1024 artwork, 3×3 grid: use 341px integer cells; Phaser exposes 9 frames.
    this.load.spritesheet("hazelnut-level-1", "/assets/plants/hazelnut-level-1.png", { frameWidth: 341, frameHeight: 341, margin: 0, spacing: 0 });
    this.load.image("hazelnut-level-1-bomb", "/assets/plants/hazelnut-level-1-bomb.png");
    this.load.image("pineapple-level-1-bomb", "/assets/plants/pineapple-level-1-bomb.png");
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
    this.load.spritesheet("hyena-run", "/assets/characters/monsters/hyena/hyena-run1.png", { frameWidth: 367, frameHeight: 298 });
    // hyena-bite.png is a 1080x894 sheet arranged as 3 columns x 2 rows: six 360x447 frames.
    this.load.spritesheet("hyena-bite", "/assets/characters/monsters/hyena/hyena-bite.png", { frameWidth: 360, frameHeight: 447 });
    this.load.spritesheet("hyena-hit", "/assets/characters/monsters/hyena/hyena-hit.png", { frameWidth: 360, frameHeight: 894 });
    this.load.spritesheet("hyena-death", "/assets/characters/monsters/hyena/hyena-death.png", { frameWidth: 360, frameHeight: 447 });
    // The jump sheet has two different row layouts, so register it as an image
    // and add its eight frames with explicit source rectangles below.
    this.load.image("hyena-jump", "/assets/characters/monsters/hyena/hyena-jump.png");
    for (const asset of soundAssets.assets) {
      this.load.audio(asset.key, asset.path);
    }
    const queuedRigPartTextures = new Set();
    const queueRigPartTextures = (entry, variant) => {
      for (const part of entry.rigParts || []) {
        if (!part || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(part.id || "") || typeof part.path !== "string" ||
            !(part.path.startsWith("/assets/") || part.path.startsWith("/api/studio/assets?preview="))) continue;
        const key = "studio-rig-part-" + variant + "-" + part.id;
        if (queuedRigPartTextures.has(key)) continue;
        queuedRigPartTextures.add(key);
        this.load.image(key, part.path);
      }
    };
    const queueStudioCatalog = (catalogKey) => {
      this.load.once("filecomplete-json-" + catalogKey, () => {
        const entries = this.cache.json.get(catalogKey)?.plants || [];
        const variant = catalogKey === "studio-test-catalog" ? "testing" : "published";
        for (const entry of entries) {
          if (!entry || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id || "") ||
              typeof entry.path !== "string" || !(entry.path.startsWith("/assets/") || entry.path.startsWith("/api/studio/assets?preview="))) continue;
          this.load.image("studio-plant-" + variant + "-" + entry.id, entry.path);
          queueRigPartTextures(entry, variant);
          if (entry.combat?.mode === "projectile" && entry.combat.projectile?.path && (entry.combat.projectile.path.startsWith("/assets/") || entry.combat.projectile.path.startsWith("/api/studio/assets?preview="))) {
            this.load.image("studio-projectile-" + variant + "-" + entry.id, entry.combat.projectile.path);
          }
        }
      });
    };
    const queueStudioMonsterCatalog = (catalogKey) => {
      this.load.once("filecomplete-json-" + catalogKey, () => {
        const entries = this.cache.json.get(catalogKey)?.monsters || [];
        const variant = catalogKey === "studio-test-monster-catalog" ? "testing" : "published";
        for (const entry of entries) {
          if (!entry || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id || "") ||
              typeof entry.path !== "string" || !(entry.path.startsWith("/assets/") || entry.path.startsWith("/api/studio/assets?preview="))) continue;
          this.load.image("studio-monster-" + variant + "-" + entry.id, entry.path);
          queueRigPartTextures(entry, variant);
        }
      });
    };
    queueStudioCatalog("studio-published-catalog");
    queueStudioCatalog("studio-test-catalog");
    this.load.json("studio-published-catalog", "/assets/studio-plant-catalog.json");
    this.load.json("studio-test-catalog", "/api/studio/assets?catalog=testing");
    queueStudioMonsterCatalog("studio-published-monster-catalog");
    queueStudioMonsterCatalog("studio-test-monster-catalog");
    this.load.json("studio-published-monster-catalog", "/assets/studio-monster-catalog.json");
    this.load.json("studio-test-monster-catalog", "/api/studio/assets?catalog=testing-monsters");
    this.load.json("stage-encounter-config", "/api/studio/stage-encounters");
    this.load.on("loaderror", (file) => {
      if (file.key === "farm-battlefield") this.backgroundAssetFailed = true;
      if (file.key === "radish-level-1") this.radishAssetFailed = true;
      if (file.key === "mushroom-character") this.mushroomAssetFailed = true;
      if (file.key === "pumpkin-character") {
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
    const requestedStage = Number(new URLSearchParams(window.location.search).get("stage"));
    this.stageNumber = Number.isInteger(requestedStage) ? Math.max(1, Math.min(100, requestedStage)) : 1;
    this.stageEncounterConfig = this.cache.json.get("stage-encounter-config")?.stages?.[String(this.stageNumber)] || null;
    this.stageMonsterRosterConfigured = this.stageEncounterConfig?.monstersConfigured === true;
    this.stageMonsterEntries = (this.stageEncounterConfig?.monsters || []).filter(entry => entry.enabled !== false);
    this.stageWaveCount = this.stageMonsterRosterConfigured
      ? Math.max(1, ...this.stageMonsterEntries.map(entry => Math.max(1, Number(entry.wave) || 1)))
      : PHASE_ONE_WAVE_SIZES.length;
    this.totalConfiguredMonsters = this.stageMonsterRosterConfigured
      ? Array.from({ length: this.stageWaveCount }, (_, index) => Math.min(500,
          this.stageMonsterEntries.filter(entry => Number(entry.wave) === index + 1)
            .reduce((sum, entry) => sum + Math.max(1, Number(entry.count) || 1), 0)
        )).reduce((sum, count) => sum + count, 0)
      : PHASE_ONE_TOTAL_MONSTERS;
    this.stagePlantRosterConfigured = this.stageEncounterConfig?.plantsConfigured === true;
    this.stagePlantEntries = (this.stageEncounterConfig?.plants || []).filter(entry => entry.enabled !== false);
    this.vfxManager = new VFXManager(this, { registry: createDefaultVFXRegistry(), limits: { maxActiveBursts: 24 } });
    this.events.once("shutdown", () => {
      this.vfxManager?.destroy();
      this.vfxManager = null;
    });
    // Uploaded 3×3 plant/monster sheets are cropped using source dimensions,
    // exactly like Mango: nine named Phaser frames, with no assumed cell size.
    this.registerThreeByThreeSheet("mango-level-1");
    this.registerThreeByThreeSheet("electric-mushroom-level-1");
    this.registerThreeByThreeSheet("snow-thrower-level-1");
    this.registerThreeByThreeSheet("frozen-hyena-level-1");
    this.registerThreeByThreeSheet("frozen-hyena-level-2");
    const publishedStudioPlants = this.cache.json.get("studio-published-catalog")?.plants || [];
    const testStudioPlants = this.cache.json.get("studio-test-catalog")?.plants || [];
    const studioPlantMap = new Map();
    const addStudioPlants = (entries, testOnly) => {
      for (const entry of entries) {
        if (!entry || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id || "") ||
            typeof entry.path !== "string" || !(entry.path.startsWith("/assets/") || entry.path.startsWith("/api/studio/assets?preview=")) ||
            !entry.combat?.mode) continue;
        const variant = testOnly ? "testing" : "published";
        studioPlantMap.set(entry.id, {
          ...entry,
          testOnly,
          textureKey: "studio-plant-" + variant + "-" + entry.id,
          projectileTextureKey: "studio-projectile-" + variant + "-" + entry.id
        });
      }
    };
    addStudioPlants(publishedStudioPlants, false);
    addStudioPlants(testStudioPlants, true);
    this.studioPlants = [...studioPlantMap.values()];
    for (const plant of this.studioPlants) {
      const variant = plant.testOnly ? "testing" : "published";
      plant.rigPartTextures = Object.fromEntries((plant.rigParts || []).map((part) => {
        const textureKey = "studio-rig-part-" + variant + "-" + part.id;
        if (this.textures.exists(textureKey)) this.registerStudioGridSheet(textureKey, part.rows || 1, part.columns || 1);
        return [part.id, textureKey];
      }));
    }
    this.studioPlantsByType = Object.fromEntries(this.studioPlants.map((plant) => [plant.id, plant]));
    for (const plant of this.studioPlants) {
      const textureKey = plant.textureKey;
      const frameCount = Math.max(1, (Number(plant.rows) || 1) * (Number(plant.columns) || 1));
      try {
        plant.animationProfile = createStudioAnimationProfile(plant.animationProfile, frameCount);
      } catch {
        // Older or malformed catalog entries retain a safe first-frame idle and full-sheet attack.
        plant.animationProfile = createStudioAnimationProfile(null, Math.min(100, frameCount));
      }
      if (plant.spriteSheet && frameCount > 0 && this.registerStudioGridSheet(textureKey, plant.rows, plant.columns)) {
        const clips = [
          ["idle", plant.animationProfile.idle],
          ["attack", plant.animationProfile.attack]
        ];
        for (const [clipName, clip] of clips) {
          if (clip.endFrame <= clip.startFrame) continue;
          const animationKey = "studio-" + plant.id + "-" + clipName;
          if (!this.anims.exists(animationKey)) {
            this.anims.create({
              key: animationKey,
              frames: this.anims.generateFrameNumbers(textureKey, { start: clip.startFrame, end: clip.endFrame }),
              frameRate: clip.fps,
              repeat: clip.loop ? -1 : 0
            });
          }
        }
      }
    }
    // Register each attached projectile Sprite Sheet only after Phaser has loaded
    // its image, using the independent grid saved with that projectile.
    for (const plant of this.studioPlants) {
      const projectile = plant.combat?.projectile;
      const textureKey = plant.projectileTextureKey;
      if (!projectile?.path || !this.textures.exists(textureKey)) continue;
      const frameCount = Math.max(1, Math.min(24, Number(projectile.frameCount) || 1));
      const rows = Math.max(1, Number(projectile.rows) || 1);
      const columns = Math.max(1, Number(projectile.columns) || 1);
      if (rows * columns !== frameCount) {
        projectile.frameCount = 1;
        projectile.rows = 1;
        projectile.columns = 1;
        continue;
      }
      if (frameCount > 1 && this.registerStudioGridSheet(textureKey, rows, columns)) {
        const animationKey = "studio-projectile-" + plant.id;
        if (!this.anims.exists(animationKey)) {
          this.anims.create({
            key: animationKey,
            frames: this.anims.generateFrameNumbers(textureKey, { start: 0, end: frameCount - 1 }),
            frameRate: 12,
            repeat: -1
          });
        }
      }
    }
    const publishedStudioMonsters = this.cache.json.get("studio-published-monster-catalog")?.monsters || [];
    const testStudioMonsters = this.cache.json.get("studio-test-monster-catalog")?.monsters || [];
    const studioMonsterMap = new Map();
    const addStudioMonsters = (entries, testOnly) => {
      for (const entry of entries) {
        if (!entry || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id || "") ||
            typeof entry.path !== "string" || !(entry.path.startsWith("/assets/") || entry.path.startsWith("/api/studio/assets?preview="))) continue;
        try {
          const monsterProfile = createStudioMonsterProfile(entry.monsterProfile);
          const frameCount = Math.max(1, (Number(entry.rows) || 1) * (Number(entry.columns) || 1));
          const animationProfile = createStudioAnimationProfile(entry.animationProfile, frameCount);
          const variant = testOnly ? "testing" : "published";
          studioMonsterMap.set(entry.id, {
            ...entry,
            monsterProfile,
            animationProfile,
            testOnly,
            textureKey: "studio-monster-" + variant + "-" + entry.id
          });
        } catch (error) {
          console.warn("Skipping invalid Studio monster profile:", entry.id, error);
        }
      }
    };
    addStudioMonsters(publishedStudioMonsters, false);
    addStudioMonsters(testStudioMonsters, true);
    this.studioMonsters = [...studioMonsterMap.values()];
    for (const monster of this.studioMonsters) {
      const variant = monster.testOnly ? "testing" : "published";
      monster.rigPartTextures = Object.fromEntries((monster.rigParts || []).map((part) => {
        const textureKey = "studio-rig-part-" + variant + "-" + part.id;
        if (this.textures.exists(textureKey)) this.registerStudioGridSheet(textureKey, part.rows || 1, part.columns || 1);
        return [part.id, textureKey];
      }));
    }
    this.studioMonstersById = Object.fromEntries(this.studioMonsters.map((monster) => [monster.id, monster]));
    for (const monster of this.studioMonsters) {
      if (!monster.spriteSheet || !this.registerStudioGridSheet(monster.textureKey, monster.rows, monster.columns)) continue;
      monster.runtimeReady = true;
      for (const [clipName, clip] of [["idle", monster.animationProfile.idle], ["move", monster.animationProfile.move], ["attack", monster.animationProfile.attack]]) {
        if (clip.endFrame <= clip.startFrame) continue;
        const animationKey = "studio-monster-" + monster.id + "-" + clipName;
        if (!this.anims.exists(animationKey)) {
          this.anims.create({
            key: animationKey,
            frames: this.anims.generateFrameNumbers(monster.textureKey, { start: clip.startFrame, end: clip.endFrame }),
            frameRate: clip.fps,
            repeat: clip.loop ? -1 : 0
          });
        }
      }
    }
    if (this.textures.exists("snow-thrower-level-1") && !this.anims.exists("snow-thrower-level-1-throw")) {
      const available = Object.keys(this.textures.get("snow-thrower-level-1").frames).filter((name) => name !== "__BASE").length;
      if (available >= 9) {
        this.anims.create({
          key: "snow-thrower-level-1-throw",
          frames: this.anims.generateFrameNumbers("snow-thrower-level-1", { start: 0, end: 8 }),
          // Shorten the throw animation by 200ms (750ms → 550ms).
          frameRate: 16.36,
          repeat: 0
        });
      }
    }
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
    this.totalWaves = this.stageWaveCount;
    this.spawnedThisWave = 0;
    this.waveDefeatedMonsters = 0;
    this.waveSize = this.getStageWaveSize(1);
    const firstStageMonster = this.getStageMonsterEntry(0);
    this.spawnTimer = this.stageMonsterRosterConfigured && firstStageMonster ? Math.max(0, Number(firstStageMonster.firstSpawnDelayMs) || 0) : PHASE_ONE_TIMING.firstMonsterSpawnDelayMs;
    this.totalSpawnedMonsters = 0;
    this.totalDefeatedMonsters = 0;
    this.totalPlantsPlanted = 0;
    this.energyCollected = 0;
    this.elapsedBattleMs = 0;
    this.combatClockMs = 0;
    this.waveIntermissionMs = 0;
    this.selectedPlant = null;
    this.plants = [];
    this.seedPacketCooldowns = new Map();
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
    if (this.textures.exists("radish-level-1")) {
      const radishTexture = this.textures.get("radish-level-1");
      const radishSource = radishTexture.getSourceImage();
      // The uploaded Radish Level 1 sheet is 908×1079, arranged 3×3.
      // Derive every crop edge from the real dimensions (302/303 × 359/360).
      for (let index = 0; index < 9; index += 1) {
        const column = index % 3;
        const row = Math.floor(index / 3);
        const frameX = Math.floor((column * radishSource.width) / 3);
        const frameY = Math.floor((row * radishSource.height) / 3);
        const nextFrameX = Math.floor(((column + 1) * radishSource.width) / 3);
        const nextFrameY = Math.floor(((row + 1) * radishSource.height) / 3);
        if (!radishTexture.has(String(index))) {
          radishTexture.add(String(index), 0, frameX, frameY, nextFrameX - frameX, nextFrameY - frameY);
        }
      }
    }
    if (this.textures.exists("mango-level-1") && !this.anims.exists("mango-level-1-throw")) {
      this.anims.create({ key: "mango-level-1-throw", frames: this.anims.generateFrameNumbers("mango-level-1", { start: 0, end: 8 }), frameRate: 12, repeat: 0 });
    }
    if (this.textures.exists("electric-mushroom-level-1") && !this.anims.exists("electric-mushroom-level-1-throw")) {
      const available = Object.keys(this.textures.get("electric-mushroom-level-1").frames)
        .filter((name) => name !== "__BASE").length;
      if (available >= 9) {
        this.anims.create({
          key: "electric-mushroom-level-1-throw",
          frames: this.anims.generateFrameNumbers("electric-mushroom-level-1", { start: 0, end: 8 }),
          frameRate: 18.75,
          repeat: 0
        });
      }
    }
    if (this.textures.exists("radish-level-1") && !this.anims.exists("radish-level-1-throw")) {
      this.anims.create({ key: "radish-level-1-throw", frames: this.anims.generateFrameNumbers("radish-level-1", { start: 0, end: 8 }), frameRate: 12, repeat: 0 });
    }
    if (this.textures.exists("pineapple-level-1") && !this.anims.exists("pineapple-level-1-throw")) {
      this.anims.create({ key: "pineapple-level-1-throw", frames: this.anims.generateFrameNumbers("pineapple-level-1", { start: 0, end: 8 }), frameRate: 14.78, repeat: 0 });
    }
    if (this.textures.exists("hazelnut-level-1") && !this.anims.exists("hazelnut-level-1-throw")) {
      const available = Object.keys(this.textures.get("hazelnut-level-1").frames).filter((name) => name !== "__BASE").length;
      if (available >= 9) this.anims.create({ key: "hazelnut-level-1-throw", frames: this.anims.generateFrameNumbers("hazelnut-level-1", { start: 0, end: 8 }), frameRate: 12, repeat: 0 });
    }
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
    createBattleHudButtons(this, translate);
    this.createCaveman();
    this.bindInput();
    this.events.once("shutdown", () => {
      this.audioSceneShuttingDown = true;
      this.stopBackgroundMusic();
    });
    this.refreshHud();
    this.setMessage(this.textures.exists("farm-battlefield")
      ? "Choose a plant card, then click an empty soil cell. Radish, Pineapple, Hazelnut and Mango attack; Pumpkin blocks."
      : "Temporary farm art active. Choose a plant card, then click an empty soil cell.");
    this.showWaveAnnouncement(1);
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

  pineappleLanePoint(localX, row) {
    // Raise the pineapple's firing lane by half the actual height of the
    // individual perspective cell at this horizontal position. Recalculate
    // from that cell's own top and bottom edges so the offset follows depth
    // and perspective instead of using one fixed screen-space distance.
    const position = this.lanePoint(localX, row);
    const safeRow = PhaserMath.Clamp(Math.floor(row), 0, LANES - 1);
    const u = (localX + GRID_WIDTH / 2) / GRID_WIDTH;
    const cellPosition = u * COLUMNS;
    const col = PhaserMath.Clamp(Math.floor(cellPosition), 0, COLUMNS - 1);
    const cellU = PhaserMath.Clamp(cellPosition - col, 0, 1);
    const topLeft = GRID_NODES[safeRow][col];
    const topRight = GRID_NODES[safeRow][col + 1];
    const bottomLeft = GRID_NODES[safeRow + 1][col];
    const bottomRight = GRID_NODES[safeRow + 1][col + 1];
    const topY = PhaserMath.Linear(topLeft.y, topRight.y, cellU);
    const bottomY = PhaserMath.Linear(bottomLeft.y, bottomRight.y, cellU);
    // Use the cell's actual top edge as the raised lane: this is exactly
    // half a cell-height above its vertical midpoint, independently for
    // every column and row. Assigning the edge directly avoids sign or
    // centroid differences in the perspective-warped grid.
    position.y = topY;
    return position;
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
    // The background artwork owns the visible soil grid. This lightweight
    // overlay only previews the one cell currently under the pointer.
    // It follows the calibrated perspective polygon and never draws a second
    // grid over the authored battlefield.
    this.plantingGrid = null;
    this.plantingPreview = this.add.graphics().setDepth(9.7);
    this.plantingPreviewCell = null;
  }

  updatePlantingPreview(pointer) {
    if (!this.plantingPreview?.active) return;
    this.plantingPreview.clear();
    this.plantingPreviewCell = null;
    if (
      !pointer ||
      this.gameOver ||
      this.isPaused ||
      this.collectionMenuOpen ||
      this.inventoryOpen ||
      this.storySequenceActive
    ) return;

    const { col, row } = this.worldToGrid(pointer.x, pointer.y);
    if (col < 0 || row < 0 || col >= COLUMNS || row >= LANES) return;

    const polygon = this.cellPolygon(col, row);
    const occupied = this.plants.some((plant) => plant.alive && plant.col === col && plant.row === row);
    const configs = {
      radish: RADISH_CONFIG, mushroom: MUSHROOM_CONFIG, pumpkin: PUMPKIN_CONFIG,
      pineapple: PINEAPPLE_CONFIG, hazelnut: HAZELNUT_CONFIG, mango: MANGO_CONFIG,
      "snow-thrower": SNOW_THROWER_CONFIG
    };
    const config = configs[this.selectedPlant];
    const canPlant = Boolean(
      !occupied &&
      config &&
      !this.gameOver &&
      !this.isPaused &&
      !this.collectionMenuOpen &&
      !this.inventoryOpen &&
      !this.storySequenceActive &&
      !this.plantingTarget &&
      !this.returnTarget &&
      !this.farmerPlanting &&
      this.getSeedPacketCooldownRemaining(this.selectedPlant) <= 0 &&
      this.energy >= config.cost
    );
    const fill = occupied ? 0xe45b4f : canPlant ? 0x9be66b : 0xf3c66b;
    const stroke = occupied ? 0xffb1a6 : canPlant ? 0xe6ffc0 : 0xffedb2;

    this.plantingPreview.fillStyle(fill, occupied ? 0.2 : 0.15);
    this.plantingPreview.fillPoints(polygon, true);
    this.plantingPreview.lineStyle(3, stroke, 0.92);
    this.plantingPreview.strokePoints(polygon, true);
    this.plantingPreviewCell = { col, row, occupied, canPlant };
  }

  createHud() {
    // Classic PvZ-inspired seed bank: sun meter on the left, wooden packet tray
    // across the center, compact battle information above it, and collection
    // shortcuts kept at the far right.
    // Seed cards now sit directly on the battlefield HUD: no brown CSS/Phaser tray background.

    // Mushroom energy counter: use the new carved-wood frame and keep
    // the live energy number as text so it remains crisp at every resolution.
    this.mushroomBank = this.add.container(83, 31).setDepth(43);
    const mushroomFrame = this.textures.exists("hud-currency-frame")
      ? this.add.image(0, 0, "hud-currency-frame").setDisplaySize(150, 58)
      : this.add.image(0, 0, "mushroom-card").setDisplaySize(112, 96);
    const mushroomIcon = this.textures.exists("mushroom-character")
      ? this.add.image(-48, 0, "mushroom-character").setDisplaySize(27, 27)
      : this.add.text(-48, 0, "🍄", { fontFamily: "Arial", fontSize: "25px" }).setOrigin(0.5);
    this.energyValueText = this.add.text(15, 0, String(this.energy), {
      fontFamily: "Arial", fontSize: "20px", color: "#fff2a8", fontStyle: "bold",
      stroke: "#39240f", strokeThickness: 3, resolution: 2
    }).setOrigin(0.5);
    this.mushroomBank.add([mushroomFrame, mushroomIcon, this.energyValueText]);

    // Compact secondary counters. The farmhouse health counter uses its
    // dedicated uploaded icon; all values remain live Phaser text objects.
    const counters = [
      { x: 178, icon: "🪙", textX: 181 },
      { x: 270, icon: "", textX: 299, texture: "hud-health-icon" },
      { x: 365, icon: "🌱", textX: 368 },
      { x: 460, icon: "👾", textX: 463 },
    ];
    this.hudValueTexts = counters.map((counter, index) => {
      const widths = [82, 82, 82, 92];
      const width = widths[index];
      this.add.rectangle(counter.x + width / 2 - 2, 16, width, 27, 0x4a2d18, 0.98)
        .setStrokeStyle(2, 0xd1a66b, 1).setDepth(42);
      this.add.rectangle(counter.x + width / 2 - 2, 16, width - 7, 20, 0xead7ad, 1)
        .setStrokeStyle(1, 0x9a7042, 1).setDepth(43);
      if (counter.texture && this.textures.exists(counter.texture)) {
        this.add.image(counter.x + 15, 16, counter.texture)
          .setDisplaySize(22, 22).setDepth(44);
      }
      return this.add.text(counter.textX, 16, (counter.icon ? counter.icon + " " : "") + "0", {
        fontFamily: "Arial", fontSize: "13px", color: "#52351d", fontStyle: "bold",
        resolution: 2
      }).setOrigin(0, 0.5).setDepth(44);
    });

    // Attack level and live progress are grouped together in the upper-right HUD.
    // The progress bar sits immediately left of the current attack counter.
    this.waveProgressFrame = this.add.image(810, 68, "hud-wave-frame")
      .setDisplaySize(200, 38).setDepth(42);
    this.waveProgressTrack = this.add.rectangle(810, 68, 158, 10, 0x392719, 0.72)
      .setStrokeStyle(1, 0x8e6338, 0.8).setDepth(43);
    this.waveProgressFill = this.add.image(731, 68, "hud-wave-fill")
      .setOrigin(0, 0.5).setDisplaySize(2, 9).setDepth(44);
    this.waveProgressMarker = this.add.image(731, 68, "hud-wave-marker")
      .setDisplaySize(18, 18).setDepth(45);
    this.waveProgressLabel = this.add.text(810, 94, "DEFEATED 0/2", {
      fontFamily: "Arial", fontSize: "9px", color: "#ffe8b5", fontStyle: "bold",
      stroke: "#392719", strokeThickness: 2, resolution: 2
    }).setOrigin(0.5).setDepth(44);

    // The attack counter is directly beside the progress bar, toward the right edge.
    this.waveIcon = this.add.image(954, 68, "hud-wave-icon")
      .setDisplaySize(30, 30).setDepth(44);
    this.waveBadge = this.add.image(1007, 68, "hud-wave-badge")
      .setDisplaySize(46, 40).setDepth(43);
    this.waveText = this.add.text(1007, 68, "1/5", {
      fontFamily: "Arial", fontSize: "13px", color: "#fff4c8", fontStyle: "bold",
      stroke: "#392719", strokeThickness: 3, resolution: 2,
      align: "center"
    }).setOrigin(0.5).setDepth(45);

        // Short PvZ-style announcement banner. It is reused between waves instead
    // of allocating new display objects every time a wave begins.
    this.waveBanner = this.add.container(560, 150).setDepth(52).setAlpha(0).setVisible(false);
    const bannerFrame = this.add.rectangle(0, 0, 430, 82, 0x3c2818, 0.96)
      .setStrokeStyle(4, 0xe2b968, 1);
    const bannerInset = this.add.rectangle(0, 0, 416, 68, 0x76502d, 1)
      .setStrokeStyle(2, 0xf3d59a, 0.9);
    this.waveBannerTitle = this.add.text(0, -13, "WAVE 1", {
      fontFamily: "Arial", fontSize: "25px", color: "#fff4c8", fontStyle: "bold",
      stroke: "#392719", strokeThickness: 5, resolution: 2
    }).setOrigin(0.5);
    this.waveBannerSubtitle = this.add.text(0, 19, "GET READY!", {
      fontFamily: "Arial", fontSize: "13px", color: "#ffffff", fontStyle: "bold",
      stroke: "#392719", strokeThickness: 3, resolution: 2
    }).setOrigin(0.5);
    this.waveBanner.add([bannerFrame, bannerInset, this.waveBannerTitle, this.waveBannerSubtitle]);

    // Build the seed bank from the player's pre-battle loadout.
    const plantOptions = [
      { type: "radish", title: "RADISH L1", cost: RADISH_CONFIG.cost, image: "radish-level-1" },
      { type: "mushroom", title: "MUSHROOM", cost: 50, image: "mushroom-character" },
      { type: "pumpkin", title: "PUMPKIN", cost: PUMPKIN_CONFIG.cost, image: "pumpkin-character" },
      { type: "pineapple", title: "PINEAPPLE L1", cost: PINEAPPLE_CONFIG.cost, image: "pineapple-level-1" },
      { type: "hazelnut", title: "HAZELNUT L1", cost: HAZELNUT_CONFIG.cost, image: "hazelnut-level-1" },
      { type: "mango", title: "MANGO L1", cost: MANGO_CONFIG.cost, image: "mango-level-1" },
      { type: "snow-thrower", title: "SNOW L1", cost: SNOW_THROWER_CONFIG.cost, image: "snow-thrower-level-1" },
      { type: "electric-mushroom", title: "ELECTRIC MUSHROOM", cost: ELECTRIC_MUSHROOM_CONFIG.cost, image: "electric-mushroom-level-1" },
    ];
    for (const studioPlant of this.studioPlants || []) {
      plantOptions.push({
        type: studioPlant.id,
        title: String(studioPlant.name || studioPlant.id).toUpperCase().slice(0, 18),
        cost: studioPlant.combat.energyCost,
        image: studioPlant.textureKey,
        studioPlant
      });
    }
    let selectedTypes = ["radish", "mushroom"];
    try {
      const unlocked = new Set([...loadUnlockedPlantIds(window.localStorage), ...(this.studioPlants || []).map((plant) => plant.id)]);
      const availableTypes = new Set(plantOptions.map((plant) => plant.type).filter((type) =>
        PLAYTEST_ALL_PLANTS || unlocked.has(type)
      ));
      const saved = JSON.parse(window.localStorage.getItem("farmVsMonsters.selectedPlants") || "null");
      // Apply the same six-packet limit and starter ordering as pre-battle selection.
      const testingTypes = (this.studioPlants || [])
        .filter((plant) => plant.testOnly)
        .map((plant) => plant.id)
        .filter((type) => availableTypes.has(type));
      const preferredLoadout = PLAYTEST_ALL_PLANTS
        ? [...ALL_PLAYTEST_PLANT_IDS, ...testingTypes, ...(Array.isArray(saved) ? saved : [])]
        : Array.isArray(saved)
          ? ["mushroom", "radish", ...testingTypes, ...saved.filter((type) => availableTypes.has(type))]
          : [...availableTypes];
      selectedTypes = normalizeSeedLoadout(preferredLoadout, [...availableTypes], [...availableTypes]);
    } catch {
      // Storage failures keep the starter loadout playable.
      selectedTypes = ["radish", "mushroom"];
    }
    if (!selectedTypes.includes("mushroom")) selectedTypes.unshift("mushroom");
    if (!selectedTypes.includes("radish")) selectedTypes.push("radish");
    this.plantCardsByType = {};
    const packetStartX = 164;
    const packetGap = selectedTypes.length > 5 ? 78 : 90;
    const packetSlotCount = MAX_SEED_PACKETS;
    // Fill unused seed slots with previews of implemented plants that are
    // not in the current loadout. Their artwork is intentionally dimmed and
    // non-interactive so the player can see upcoming choices without selecting them.
    const inactivePlants = plantOptions.filter((plant) =>
      !selectedTypes.includes(plant.type) && plant.type !== "mushroom"
    );
    const cardFrameKey = this.textures.exists("seed-card-frame") ? "seed-card-frame" : "seed-card";
    for (let slotIndex = selectedTypes.length; slotIndex < packetSlotCount; slotIndex += 1) {
      const plant = inactivePlants[slotIndex - selectedTypes.length];
      const x = packetStartX + slotIndex * packetGap;
      if (!plant) {
        if (this.textures.exists("seed-slot-empty")) {
          this.add.image(x, 72, "seed-slot-empty").setDisplaySize(70, 90).setDepth(44);
        }
        continue;
      }
      const preview = this.add.container(x, 72).setDepth(45);
      const lockedFrameKey = !availableTypes.has(plant.type) && this.textures.exists("seed-card-locked")
        ? "seed-card-locked"
        : cardFrameKey;
      if (this.textures.exists(lockedFrameKey)) {
        const source = this.textures.get(lockedFrameKey).getSourceImage();
        const scale = Math.min(86 / source.width, 98 / source.height);
        preview.add(this.add.image(0, 0, lockedFrameKey)
          .setDisplaySize(source.width * scale * 0.8, source.height * scale * 0.8));
      }
      if (this.textures.exists(plant.image)) {
        const texture = this.textures.get(plant.image);
        const isSheet = ["pineapple-level-1", "hazelnut-level-1", "mango-level-1", "snow-thrower-level-1", "radish-level-1", "electric-mushroom-level-1"].includes(plant.image) || Boolean(plant.studioPlant?.spriteSheet);
        const frame = isSheet ? texture.get("0") : texture.get();
        // Derive preview dimensions from the actual frame, never the full sheet.
        const frameWidth = Math.max(1, frame.cutWidth || frame.width || 1);
        const frameHeight = Math.max(1, frame.cutHeight || frame.height || 1);
        const thumbnailScale = Math.min(54 / frameWidth, 46 / frameHeight);
        const thumbnail = isSheet
          ? this.add.sprite(0, -8, plant.image, "0").setScale(thumbnailScale)
          : this.add.image(0, -8, plant.image).setScale(thumbnailScale);
        preview.add(thumbnail);
        preview.add(this.add.rectangle(0, -8, 56, 48, 0x000000, 0.32));
        preview.add(this.add.text(0, 26.4, availableTypes.has(plant.type) ? "🍄" + plant.cost : "🔒", {
          fontFamily: "Arial", fontSize: "13px", color: "#fff0bd", fontStyle: "bold",
          stroke: "#3d2817", strokeThickness: 2, resolution: 2, align: "center"
        }).setOrigin(0.5).setScale(0.855));
      }
      preview.setData("inactivePlantType", plant.type);
    }
    plantOptions.filter((plant) => selectedTypes.includes(plant.type)).forEach((plant, index) => {
      this.plantCardsByType[plant.type] = this.createPlantCard(
        packetStartX + index * packetGap,
        plant.title,
        String(plant.cost),
        plant.type,
        null,
        plant.image,
        72
      );
    });

    this.messageText = this.add.text(560, 574, "", {
      fontFamily: "Arial", fontSize: "15px", color: "#ffffff", fontStyle: "bold",
      backgroundColor: "rgba(255,255,255,0.18)", padding: { x: 18, y: 8 }, align: "center",
      stroke: "#24466b", strokeThickness: 3, resolution: 2,
      shadow: { offsetX: 0, offsetY: 2, color: "#17314f", blur: 5, fill: true }
    }).setOrigin(0.5, 1).setDepth(42);
  }

  createPlantCard(x, title, costLabel, type, drawIcon, imageKey = null, y = 619, locked = false) {
    const card = this.add.container(x, y).setDepth(45);
    const cardArtworkKey = locked && this.textures.exists("seed-card-locked") ? "seed-card-locked" : this.textures.exists("seed-card-frame") ? "seed-card-frame" : "seed-card";
    let seedFrame = null;
    if (this.textures.exists(cardArtworkKey)) {
      const source = this.textures.get(cardArtworkKey).getSourceImage();
      const scale = Math.min(86 / source.width, 98 / source.height);
      seedFrame = this.add.image(0, 0, cardArtworkKey).setDisplaySize(source.width * scale * 0.8, source.height * scale * 0.8);
    }
    const plantHeight = 46;
    let icon;
    let iconScale = 1;
    if (imageKey && this.textures.exists(imageKey)) {
      const gridSheet = imageKey === "mango-level-1" || imageKey === "radish-level-1" || imageKey === "snow-thrower-level-1" || imageKey === "electric-mushroom-level-1" || Boolean(this.studioPlantsByType?.[type]?.spriteSheet);
      const frame = this.textures.getFrame(imageKey, gridSheet ? "0" : undefined);
      // Bound every seed icon by both dimensions using its frame rectangle.
      const frameWidth = Math.max(1, frame.cutWidth || frame.width || 1);
      const frameHeight = Math.max(1, frame.cutHeight || frame.height || 1);
      iconScale = Math.min(54 / frameWidth, plantHeight / frameHeight);
      icon = gridSheet
        ? this.add.sprite(0, -8, imageKey, "0").setScale(iconScale)
        : this.add.image(0, -8, imageKey).setScale(iconScale);
    } else {
      icon = this.add.graphics();
      if (drawIcon) drawIcon(icon);
    }
    // Preserve the frame-fit scale; applying 0.95 as an absolute scale here
    // would enlarge 341–418px source frames to nearly their original size.
    icon.setScale(iconScale * 0.95 * 0.95);
    const cost = this.add.text(0, 26.4, locked ? "🔒" : "🍄" + costLabel, {
      fontFamily: "Arial", fontSize: "13px", color: "#fff0bd", fontStyle: "bold",
      stroke: "#3d2817", strokeThickness: 2, resolution: 2, align: "center"
    }).setOrigin(0.5).setScale(0.855);
    const cooldownOverlay = this.add.rectangle(0, -1, 64, 72, 0x1a160f, 0.72).setVisible(false);
    const cooldownLabel = this.add.text(0, -1, "", { fontFamily: "Arial", fontSize: "20px", color: "#fff4d6", fontStyle: "bold", stroke: "#382312", strokeThickness: 4, resolution: 2 }).setOrigin(0.5).setVisible(false);
    card.setData("cooldownOverlay", cooldownOverlay); card.setData("cooldownLabel", cooldownLabel);
    const panel = this.add.rectangle(0, 0, 80, 92, 0xffffff, 0).setInteractive({ useHandCursor: true });
    panel.setData("cooldownOverlay", cooldownOverlay); panel.setData("cooldownLabel", cooldownLabel);
    card.add([...(seedFrame ? [seedFrame] : []), panel, icon, cost, cooldownOverlay, cooldownLabel]);
    if (locked) card.setAlpha(0.78);
    panel.on("pointerover", () => { card.setScale(1.04); });
    panel.on("pointerout", () => { card.setScale(1); });
    panel.on("pointerdown", () => {
      if (this.gameOver) return;
      if (locked) { this.setMessage(title + " is coming soon. Its combat ability is not ready yet."); return; }
      if (this.getSeedPacketCooldownRemaining(type) > 0) { this.setMessage("This seed packet is recharging. Wait for it to recover."); return; }
      this.selectedPlant = type;
      Object.entries(this.plantCardsByType || {}).forEach(([plantType, plantCard]) => plantCard.setAlpha(plantType === type ? 1 : 0.9));
      const hints = { radish: "Radish Level 1 chosen. Launches miniature radish bombs down its lane.", mushroom: "Mushroom chosen. Collect its energy when it appears.", pumpkin: "Pumpkin chosen. A durable lane blocker.", hazelnut: "Hazelnut chosen. Fires hazelnut bombs in its lane.", mango: "Mango chosen. Launches a curved mango bomb onto monsters in its lane.", "snow-thrower": "Snow Thrower chosen. Freezes the first monster hit for 2.6 seconds.", "electric-mushroom": "Electric Mushroom chosen. Fires cyan electric bolts down its lane." };
      this.setMessage(hints[type] || "Plant chosen."); this.refreshHud();
    });
    return card;
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
        .setScale(0.63);
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
          this.farmerTargetDisplayHeight = bounds.height * 0.63;
        }
      } catch (error) {
        // Keep the game playable on browsers that block canvas pixel reads.
        sprite.setOrigin(0.5, 1).setScale(0.63);
        return;
      }
    }

    if (this.farmerTargetDisplayHeight === null) {
      this.farmerTargetDisplayHeight = bounds.height * 0.63;
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

      // Telegraph the chosen impact point before the projectile is launched.
      // The marker is visual only; damage and target resolution remain unchanged.
      const warning = this.add.circle(targetX, targetY, 24, 0xff5b32, 0.18)
        .setStrokeStyle(4, 0xffc15c, 0.98).setDepth(54);
      const warningCore = this.add.circle(targetX, targetY, 8, 0xffe39a, 0.75)
        .setDepth(54);
      this.tweens.add({
        targets: [warning, warningCore],
        scale: 1.45,
        alpha: 0,
        duration: 520,
        ease: "Cubic.easeOut",
        onComplete: () => {
          if (warning.active) warning.destroy();
          if (warningCore.active) warningCore.destroy();
          if (this.gameOver || this.storySequenceActive || this.collectionMenuOpen || !boss.alive) return;
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


  openCollectionMenuTab(tab) {
    if (!this.collectionMenuOpen) this.toggleCollectionMenu();
    this.collectionMenuTab = tab;
    this.renderCollectionMenu();
  }



  toggleCollectionMenu() {
    if (this.gameOver) return;
    if (this.inventoryOpen) this.closeInventory();
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
        const icon = imageKey === "radish-level-1"
          ? this.add.sprite(-285, y, imageKey, 0).setDisplaySize(45.4, 54)
          : this.add.image(-285, y, imageKey).setDisplaySize(54, 54);
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
      addRow(65, "radish-level-1", locale === "ar" ? "الفجل المستوى الأول" : "Radish Level 1", "35 " + (locale === "ar" ? "طاقة" : "ENERGY"));
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

  openInventory() {
    if (this.gameOver || this.isPaused || this.inventoryOpen) return;
    if (this.collectionMenuOpen) this.closeCollectionMenu();
    this.inventoryOpen = true;
    this.inventoryTab = "plants";
    this.inventorySelectedPlant = "radish";
    this.inventoryLayer = this.add.container(560, 340).setDepth(110);
    this.inventoryLayer.add(
      this.add.rectangle(0, 0, 1120, 680, 0x101a13, 0.68).setInteractive()
    );

    // The uploaded wood frame is kept at its original aspect ratio. A parchment
    // panel sits behind it, while all inventory content stays inside its border.
    this.inventoryLayer.add(
      this.add.rectangle(0, 0, 500, 548, 0xe9d7ad, 1)
        .setStrokeStyle(4, 0x754a25, 1)
    );
    if (this.textures.exists("inventory-wood-frame")) {
      this.inventoryLayer.add(
        this.add.image(0, 0, "inventory-wood-frame").setDisplaySize(570, 620)
      );
    } else {
      this.inventoryLayer.add(
        this.add.rectangle(0, 0, 570, 620, 0x754a25, 0.18)
          .setStrokeStyle(12, 0x754a25, 1)
      );
    }

    this.inventoryLayer.add(this.add.text(0, -267, "حقيبة المزرعة  ·  INVENTORY", {
      fontFamily: "Arial", fontSize: "20px", color: "#fff1cf", fontStyle: "bold",
      stroke: "#4a2b16", strokeThickness: 5, align: "center"
    }).setOrigin(0.5));
    const close = this.add.text(230, -266, "✕", {
      fontFamily: "Arial", fontSize: "22px", color: "#fff4d8",
      backgroundColor: "#a94736", padding: { x: 8, y: 3 },
      stroke: "#4a2b16", strokeThickness: 2
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    close.on("pointerover", () => close.setScale(1.08));
    close.on("pointerout", () => close.setScale(1));
    close.on("pointerdown", () => this.closeInventory());
    this.inventoryLayer.add(close);

    this.inventoryTabs = this.add.container(0, -215);
    this.inventoryContent = this.add.container(0, -60);
    this.inventoryLayer.add([this.inventoryTabs, this.inventoryContent]);
    this.renderInventory();
  }

  closeInventory() {
    this.inventoryOpen = false;
    if (this.inventoryLayer) this.inventoryLayer.destroy(true);
    this.inventoryLayer = null;
    this.inventoryTabs = null;
    this.inventoryContent = null;
  }

  renderInventory() {
    if (!this.inventoryLayer || !this.inventoryTabs || !this.inventoryContent) return;
    this.inventoryTabs.removeAll(true);
    this.inventoryContent.removeAll(true);
    const locale = typeof window !== "undefined"
      ? window.localStorage.getItem("farmVsMonsters.language") || "ar"
      : "ar";
    const isArabic = locale === "ar";
    const tabSpecs = [
      ["plants", isArabic ? "النباتات" : "PLANTS", -100],
      ["resources", isArabic ? "الموارد" : "RESOURCES", 100]
    ];
    tabSpecs.forEach(([id, label, x]) => {
      const active = this.inventoryTab === id;
      const plate = this.add.rectangle(x, 0, 184, 40,
        active ? 0x6c9d45 : 0x9b7449, active ? 1 : 0.82)
        .setStrokeStyle(3, active ? 0x365324 : 0x70431f, 1)
        .setInteractive({ useHandCursor: true });
      const text = this.add.text(x, 0, label, {
        fontFamily: "Arial", fontSize: "16px", color: "#fff3d5",
        fontStyle: "bold", stroke: "#4a2b16", strokeThickness: 3
      }).setOrigin(0.5);
      plate.on("pointerover", () => plate.setScale(1.035));
      plate.on("pointerout", () => plate.setScale(1));
      plate.on("pointerdown", () => {
        this.inventoryTab = id;
        this.renderInventory();
      });
      this.inventoryTabs.add([plate, text]);
    });

    const content = this.inventoryContent;
    const addText = (x, y, value, size = 15, color = "#51351e") => {
      content.add(this.add.text(x, y, value, {
        fontFamily: "Arial", fontSize: size + "px", color,
        fontStyle: "bold", align: "center", stroke: "#f5e8c9",
        strokeThickness: 1, wordWrap: { width: 145 }
      }).setOrigin(0.5));
    };

    if (this.inventoryTab === "plants") {
      let unlockedIds = ["radish", "mushroom"];
      let selectedTypes = ["radish", "mushroom"];
      try {
        unlockedIds = PLAYTEST_ALL_PLANTS
          ? [...new Set([...loadUnlockedPlantIds(window.localStorage), ...ALL_PLAYTEST_PLANT_IDS])]
          : loadUnlockedPlantIds(window.localStorage);
        const saved = JSON.parse(window.localStorage.getItem("farmVsMonsters.selectedPlants") || "null");
        if (Array.isArray(saved)) selectedTypes = normalizeSeedLoadout(saved, unlockedIds, unlockedIds);
        else selectedTypes = normalizeSeedLoadout(unlockedIds, unlockedIds, unlockedIds);
      } catch {
        // Starter plants remain visible if browser storage is unavailable.
      }
      const catalog = [
        { id: "radish", title: isArabic ? "الفجل" : "Radish", image: "radish-level-1", config: RADISH_CONFIG },
        { id: "mushroom", title: isArabic ? "فطر الطاقة" : "Energy Mushroom", image: "mushroom-character", config: MUSHROOM_CONFIG },
        { id: "pumpkin", title: isArabic ? "اليقطين" : "Pumpkin", image: "pumpkin-character", config: PUMPKIN_CONFIG },
        { id: "pineapple", title: isArabic ? "الأناناس" : "Pineapple", image: "pineapple-level-1", config: PINEAPPLE_CONFIG },
        { id: "hazelnut", title: isArabic ? "البندق" : "Hazelnut", image: "hazelnut-level-1", config: HAZELNUT_CONFIG },
        { id: "mango", title: isArabic ? "المانجو" : "Mango", image: "mango-level-1", config: MANGO_CONFIG },
        { id: "snow-thrower", title: isArabic ? "قاذف الثلج" : "Snow Thrower", image: "snow-thrower-level-1", config: SNOW_THROWER_CONFIG },
        { id: "electric-mushroom", title: isArabic ? "الفطر الكهربائي" : "Electric Mushroom", image: "electric-mushroom-level-1", config: ELECTRIC_MUSHROOM_CONFIG },
      ];
      const selected = catalog.find((plant) => plant.id === this.inventorySelectedPlant) || catalog[0];
      addText(0, -112, isArabic
        ? "مجموعتك الدائمة من النباتات — النباتات المفتوحة محفوظة بين الجولات"
        : "Your permanent plant collection — unlocked plants persist between battles", 13);

      catalog.forEach((plant, index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        const x = -148 + col * 148;
        const y = -38 + row * 112;
        const unlocked = unlockedIds.includes(plant.id);
        const active = selectedTypes.includes(plant.id);
        const plantedCount = this.plants.filter((item) => item.alive && item.type === plant.id).length;
        const card = this.add.rectangle(x, y, 136, 102,
          plant.id === selected.id ? 0xf6e5bd : 0xd9c49b, 1)
          .setStrokeStyle(plant.id === selected.id ? 4 : 2,
            plant.id === selected.id ? 0x4c8b39 : 0x8a6339, 1)
          .setInteractive({ useHandCursor: true });
        content.add(card);
        if (unlocked && this.textures.exists(plant.image)) {
          const sheet = ["radish-level-1", "pineapple-level-1", "hazelnut-level-1", "mango-level-1", "snow-thrower-level-1"].includes(plant.image);
          const icon = sheet
            ? this.add.sprite(x, y - 12, plant.image, 0).setDisplaySize(48, 48)
            : this.add.image(x, y - 12, plant.image).setDisplaySize(48, 48);
          content.add(icon);
        } else if (!unlocked && this.textures.exists("seed-card-locked")) {
          const lockedSource = this.textures.get("seed-card-locked").getSourceImage();
          const lockedScale = Math.min(88 / lockedSource.width, 72 / lockedSource.height);
          content.add(this.add.image(x, y - 12, "seed-card-locked")
            .setDisplaySize(lockedSource.width * lockedScale, lockedSource.height * lockedScale));
        } else {
          addText(x, y - 12, unlocked ? "✿" : "🔒", 25, "#7b4b2a");
        }
        addText(x, y + 27, plant.title, 12);
        addText(x, y + 43, unlocked
          ? (isArabic ? (active ? "ضمن شريط البذور" : "مفتوح") : (active ? "IN SEED BAR" : "UNLOCKED"))
          : (isArabic ? "مغلق" : "LOCKED"), 10,
          unlocked ? "#356b32" : "#8b3b2d");
        card.on("pointerover", () => card.setScale(1.035));
        card.on("pointerout", () => card.setScale(1));
        card.on("pointerdown", () => {
          this.inventorySelectedPlant = plant.id;
          this.renderInventory();
        });
        if (plantedCount > 0) {
          addText(x + 48, y - 37, "×" + plantedCount, 10, "#315c2c");
        }
      });

      const selectedUnlocked = unlockedIds.includes(selected.id);
      const selectedCount = this.plants.filter((item) => item.alive && item.type === selected.id).length;
      content.add(this.add.rectangle(0, 318, 426, 68, 0xb88a50, 0.92)
        .setStrokeStyle(2, 0x70431f, 1));
      addText(-135, 301, selected.title, 15, "#fff4d9");
      addText(-135, 326, selectedUnlocked
        ? (isArabic ? "تكلفة الزراعة: " : "Plant cost: ") + selected.config.cost + (isArabic ? " طاقة" : " energy")
        : (isArabic ? "أكمل المرحلة المطلوبة لفتحها" : "Complete the required stage to unlock"), 11, "#fff4d9");
      addText(105, 301, isArabic ? "المزروع الآن" : "ON FIELD", 12, "#fff4d9");
      addText(105, 326, String(selectedCount), 19, "#fff4d9");
    } else {
      addText(0, -100, isArabic ? "مواردك الحالية في هذه المغامرة" : "Your current adventure resources", 16);
      const stats = [
        { label: isArabic ? "العملات الذهبية" : "GOLD COINS", value: this.coins.toLocaleString(), icon: "🪙" },
        { label: isArabic ? "الطاقة المتاحة" : "AVAILABLE ENERGY", value: String(this.energy), icon: "✦" },
        { label: isArabic ? "النباتات الحية" : "LIVING PLANTS", value: String(this.plants.filter((plant) => plant.alive).length), icon: "🌱" },
        { label: isArabic ? "الوحوش المهزومة" : "MONSTERS DEFEATED", value: String(this.totalDefeatedMonsters), icon: "★" }
      ];
      stats.forEach((stat, index) => {
        const x = index % 2 === 0 ? -112 : 112;
        const y = Math.floor(index / 2) * 142 + 5;
        content.add(this.add.rectangle(x, y, 205, 112, 0xe1c99d, 1)
          .setStrokeStyle(3, 0x93673c, 1));
        addText(x, y - 29, stat.icon + "  " + stat.label, 12);
        addText(x, y + 18, stat.value, 25, "#6b421f");
      });
      addText(0, 265, isArabic
        ? "العملات محفوظة محلياً وتُمنح عند هزيمة الوحوش. الطاقة تخص المعركة الحالية."
        : "Coins are saved locally and earned by defeating monsters. Energy belongs to this battle.", 12);
    }
  }




  openSettingsMenu() {
    if (this.gameOver || this.isPaused || !this.scene.isActive()) return;
    this.isPaused = true;
    this.pauseGameAudio();
    this.scene.launch("PauseScene");
    const pauseScene = this.scene.get("PauseScene");
    pauseScene.menuMode = "settings";
    pauseScene.drawCurrentMenu();
    this.scene.pause();
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
    this.input.on("pointermove", (pointer) => this.updatePlantingPreview(pointer));
    this.input.on("gameout", () => {
      this.plantingPreview?.clear();
      this.plantingPreviewCell = null;
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
      if (this.gameOver || this.storySequenceActive || this.inventoryOpen) return;
      const { col, row } = this.worldToGrid(pointer.x, pointer.y);
      if (row >= 0 && row < LANES && col >= 0 && col < COLUMNS) this.requestPlant(col, row);
    });
  }

  update(_time, delta) {
    if (this.gameOver || this.isPaused || this.collectionMenuOpen || this.inventoryOpen) return;
    // Phaser can produce a non-finite or negative frame delta during unusual
    // tab visibility/resume transitions. Never pass that into combat rules.
    const deltaMs = Number.isFinite(delta) ? Math.max(0, delta) : 0;
    const dt = deltaMs / 1000;
    this.elapsedBattleMs += deltaMs;
    this.updateSeedPacketCooldowns(deltaMs);
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
      spawnIntervalMs: this.getStageMonsterEntry(this.spawnedThisWave)?.spawnIntervalMs,
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
      const spawnedEntry = this.getStageMonsterEntry(spawnIndex);
      const nextEntry = this.getStageMonsterEntry(this.spawnedThisWave);
      if (this.stageMonsterRosterConfigured && nextEntry && nextEntry.key !== spawnedEntry?.key) {
        this.spawnTimer = Math.max(0, Number(nextEntry.firstSpawnDelayMs) || 0);
      }
      if (this.stageNumber === 1 && this.wave === this.totalWaves && this.spawnedThisWave === this.waveSize) this.beginDragonEncounter();
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

  showWaveAnnouncement(wave) {
    if (!this.waveBanner || !this.waveBannerTitle || !this.waveBannerSubtitle) return;
    const locale = typeof window !== "undefined"
      ? window.localStorage.getItem("farmVsMonsters.language") || "ar"
      : "ar";
    const majorWave = wave >= 4;
    const title = locale === "ar" ? "الموجة " + wave : "WAVE " + wave;
    const subtitles = locale === "ar"
      ? {
          1: "استعدوا! الوحوش تقترب",
          2: "موجة جديدة قادمة",
          3: "الهجوم يشتد!",
          4: "تحذير: وحش سريع ينضم للهجوم!",
          5: "تحذير: المدرع الثقيل قادم!"
        }
      : {
          1: "GET READY! MONSTERS APPROACH",
          2: "A NEW WAVE IS COMING",
          3: "THE ATTACK IS INTENSIFYING!",
          4: "WARNING: A FAST SCOUT JOINS!",
          5: "WARNING: ARMOURED BRUTE INCOMING!"
        };
    this.waveBannerTitle.setText(title);
    this.waveBannerSubtitle.setText(subtitles[wave] || (locale === "ar" ? "استعدوا للدفاع!" : "PREPARE YOUR DEFENCE!"));
    const frame = this.waveBanner.list?.[0];
    if (frame?.setFillStyle) frame.setFillStyle(majorWave ? 0x713322 : 0x3c2818, 0.97);
    this.tweens.killTweensOf(this.waveBanner);
    this.waveBanner.setVisible(true).setAlpha(0).setScale(0.82);
    this.tweens.add({
      targets: this.waveBanner,
      alpha: 1,
      scale: 1,
      duration: 260,
      ease: "Back.Out",
      hold: 1450,
      yoyo: true,
      onComplete: () => {
        if (this.waveBanner?.active) this.waveBanner.setVisible(false);
      }
    });
  }

  // Sort world characters by their ground position: lower screen Y is
  // farther away, while larger screen Y must render in front.
  getSeedPacketCooldownRemaining(type) {
    return Math.max(0, this.seedPacketCooldowns?.get(type) || 0);
  }

  updateSeedPacketCooldowns(deltaMs) {
    if (!this.seedPacketCooldowns?.size) return;
    for (const [type, remaining] of this.seedPacketCooldowns) {
      const next = Math.max(0, remaining - deltaMs);
      if (next === 0) this.seedPacketCooldowns.delete(type);
      else this.seedPacketCooldowns.set(type, next);
    }
  }

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
    const plantConfigs = { radish: RADISH_CONFIG, mushroom: MUSHROOM_CONFIG, pumpkin: PUMPKIN_CONFIG, pineapple: PINEAPPLE_CONFIG, hazelnut: HAZELNUT_CONFIG, mango: MANGO_CONFIG, "snow-thrower": SNOW_THROWER_CONFIG, "electric-mushroom": ELECTRIC_MUSHROOM_CONFIG };
    const studioPlant = this.studioPlantsByType?.[this.selectedPlant] || null;
    const plantConfig = plantConfigs[this.selectedPlant] || (studioPlant ? { cost: studioPlant.combat.energyCost, seedPacketRechargeMs: studioPlant.combat.cooldownMs } : null);
    if (this.getSeedPacketCooldownRemaining(this.selectedPlant) > 0) {
      this.setMessage("This seed packet is recharging. Wait for it to recover.");
      return;
    }
    if (!plantConfig) {
      this.setMessage("This plant is not available yet: " + this.selectedPlant + ".");
      return;
    }
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
    const studioPlant = this.studioPlantsByType?.[type] || null;
    if (!["radish", "mushroom", "pumpkin", "pineapple", "hazelnut", "mango", "snow-thrower", "electric-mushroom"].includes(type) && !studioPlant) return;
    const stagePlantEntry = this.stagePlantEntries.find(entry => entry.id === type);
    if (this.stagePlantRosterConfigured && !stagePlantEntry) {
      this.setMessage("هذه النبتة مخفية من المرحلة الحالية. يمكنك تفعيلها من استديو إدارة نباتات المراحل.");
      return;
    }
    if (stagePlantEntry && this.plants.filter(plant => plant.type === type).length >= stagePlantEntry.count) {
      this.setMessage("وصلت إلى الحد الأقصى لهذه النبتة في المرحلة: " + stagePlantEntry.count + ".");
      return;
    }
    if (!PLAYTEST_ALL_PLANTS && !studioPlant && !loadUnlockedPlantIds(window.localStorage).includes(type)) {
      this.setMessage("This plant is locked. Complete its campaign stage to unlock it.");
      return;
    }
    const placement = resolvePlantPlacement({
      energy: this.energy,
      plants: this.plants,
      type,
      col,
      row,
      columns: COLUMNS,
      rows: LANES,
      customConfig: studioPlant ? { plantingEnergyCost: studioPlant.combat.energyCost, hp: studioPlant.combat.hp } : null
    });
    if (!placement.ok) {
      this.setMessage("Planting cancelled: this cell is no longer available.");
      return;
    }
    this.recordCombatEvent("plant_placed", { type, col, row });
    const configs = { radish: RADISH_CONFIG, mushroom: MUSHROOM_CONFIG, pumpkin: PUMPKIN_CONFIG, pineapple: PINEAPPLE_CONFIG, hazelnut: HAZELNUT_CONFIG, mango: MANGO_CONFIG, "snow-thrower": SNOW_THROWER_CONFIG, "electric-mushroom": ELECTRIC_MUSHROOM_CONFIG };
    const studioProfile = studioPlant?.combat;
    const config = configs[type] || (studioProfile ? {
      cost: studioProfile.energyCost,
      plantingEnergyCost: studioProfile.energyCost,
      seedPacketRechargeMs: studioProfile.cooldownMs,
      hp: studioProfile.hp,
      cooldownMs: studioProfile.cooldownMs,
      projectileDamage: studioProfile.damage,
      projectileSpeed: studioProfile.projectileSpeed,
      projectileCollisionRadius: studioProfile.projectileCollisionRadius,
      productionInterval: studioProfile.energyIntervalMs,
      energy: studioProfile.energyAmount
    } : null);
    this.energy = placement.energy;
    this.seedPacketCooldowns.set(type, config.seedPacketRechargeMs);
    this.farmerPlanting = true;
    this.playFarmerAction("farmer-plant");
    // Pineapples sit slightly forward within their own cell. Measure the
    // actual perspective cell width from its left/right edges, then advance
    // the plant anchor by 20% of that width along the positive X axis.
    const pineappleCell = type === "pineapple" ? this.cellPolygon(col, row) : null;
    const pineappleCellWidth = pineappleCell
      ? ((pineappleCell[1].x - pineappleCell[0].x) +
         (pineappleCell[2].x - pineappleCell[3].x)) / 2
      : 0;
    const cellCenter = type === "pineapple"
      ? this.gridCellCenter(col, row)
      : this.plantingCellCenter(col, row);
    const pineappleCellHeight = pineappleCell
      ? (Math.abs(pineappleCell[3].y - pineappleCell[0].y) +
         Math.abs(pineappleCell[2].y - pineappleCell[1].y)) / 2
      : 0;
    const x = cellCenter.x + (type === "pineapple" ? pineappleCellWidth * 0.2 : 0);
    const y = cellCenter.y + (type === "pineapple" ? pineappleCellHeight * 0.1 : 0);
    const plant = {
      ...placement.plant,
      x, y,
      cooldown: 0,
      productionTimer: type === "mushroom" || studioProfile?.mode === "energy" ? config.productionInterval : undefined,
      productionCount: 0,
      ...(studioPlant ? { studioPlant } : {}),
      view: type === "mushroom" ? this.drawEnergyMushroom(x, y, row)
        : type === "radish" ? this.drawRadish(x, y)
        : this.drawCatalogPlant(type, x, y, row)
    };
    const idleProfile = getPlantAnimationProfile(type)?.idle;
    if (plant.view?.active && idleProfile?.loop) {
      plant.idleBaseScaleX = plant.view.scaleX || 1;
      plant.idleBaseScaleY = plant.view.scaleY || 1;
      plant.idlePhaseMs = ((col * 137) + (row * 223)) % Math.max(1, idleProfile.durationMs);
    }
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
      radish: "Radish Level 1 planted! It launches miniature radish bombs down this lane.",
      mushroom: "Energy Mushroom planted! It will produce collectible energy.",
      "snow-thrower": "Snow Thrower planted! Its snow bombs freeze monsters for 2.6 seconds.",
      pumpkin: "Pumpkin planted! It blocks and absorbs bites.",
      pineapple: "Pineapple Level 1 planted! It launches pineapple bombs down this lane.",
      hazelnut: "Hazelnut Level 1 planted! It fires hazelnut bombs down this lane.",
      mango: "Mango Level 1 planted! It launches curved mango bombs onto monsters in this lane.",
      "electric-mushroom": "Electric Mushroom planted! It fires bright electric bolts down this lane.",
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

    return plant;
  }

  registerStudioGridSheet(textureKey, rows = 3, columns = 3) {
    if (!this.textures.exists(textureKey)) return false;
    const texture = this.textures.get(textureKey);
    const source = texture.getSourceImage();
    const rowCount = Number(rows), columnCount = Number(columns);
    if (!source?.width || !source?.height || !Number.isInteger(rowCount) || !Number.isInteger(columnCount) ||
        rowCount < 1 || columnCount < 1 || rowCount * columnCount > 100) return false;
    const frames = getSpriteFrameRectangles(source.width, source.height, rowCount, columnCount);
    for (const frame of frames) {
      if (!texture.has(String(frame.index))) {
        texture.add(String(frame.index), 0, frame.x, frame.y, frame.width, frame.height);
      }
    }
    return true;
  }

  registerThreeByThreeSheet(textureKey) {
    if (!this.textures.exists(textureKey)) return false;
    const texture = this.textures.get(textureKey);
    const source = texture.getSourceImage();
    if (!source?.width || !source?.height) return false;

    // Match Mango's proven crop method: calculate each cell edge from the
    // actual source dimensions. This also handles dimensions not divisible by 3.
    for (let index = 0; index < 9; index += 1) {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const frameX = Math.floor((column * source.width) / 3);
      const frameY = Math.floor((row * source.height) / 3);
      const nextFrameX = Math.floor(((column + 1) * source.width) / 3);
      const nextFrameY = Math.floor(((row + 1) * source.height) / 3);
      const frameName = String(index);
      if (!texture.has(frameName)) {
        texture.add(frameName, 0, frameX, frameY, nextFrameX - frameX, nextFrameY - frameY);
      }
    }
    return true;
  }

  playStudioSkeletalRig(rig, clipId, onComplete = null) {
    const clip = rig?.profile?.clips?.find((entry) => entry.id === clipId);
    if (!clip || !rig.root?.active) return false;
    rig._animationEvent?.remove?.();
    if (!rig._animationController) {
      rig._animationController = createSkeletalAnimationController(rig.profile, clipId);
    } else if (rig._animationController.state === clipId) {
      rig._animationController.restart();
    } else {
      rig._animationController.setState(clipId, 140);
    }
    rig._activeClipId = clipId;
    rig.applyPose(rig._animationController.getPose());
    let previousAt = this.time.now;
    const event = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (!rig.root?.active) { event.remove(); return; }
        const now = this.time.now;
        const delta = Math.max(0, Math.min(80, now - previousAt));
        previousAt = now;
        rig.applyPose(rig._animationController.update(delta));
        if (onComplete && rig._animationController.elapsedMs >= clip.durationMs) {
          event.remove();
          rig._animationEvent = null;
          rig._activeClipId = null;
          onComplete();
        } else if (!clip.loop && rig._animationController.elapsedMs >= clip.durationMs) {
          event.remove();
          rig._animationEvent = null;
          rig._activeClipId = null;
        }
      }
    });
    rig._animationEvent = event;
    if (!rig._destroyListenerRegistered) {
      rig._destroyListenerRegistered = true;
      rig.root.once("destroy", () => {
        rig._animationEvent?.remove?.();
        rig._animationEvent = null;
        rig._activeClipId = null;
      });
    }
    return true;
  }

  stopStudioSkeletalRig(rig, frozen = false) {
    if (!rig) return;
    rig._animationEvent?.remove?.();
    rig._animationEvent = null;
    rig._activeClipId = frozen ? "frozen" : null;
  }

  getStudioRigAttachmentWorld(rig, parentView, attachmentId) {
    if (!rig || !parentView?.active) return null;
    const point = rig.getAttachment(attachmentId);
    if (!point) return null;
    return transformRigPointToWorld(point, parentView);
  }

  getStudioRigHitboxesWorld(rig, parentView, kind) {
    if (!rig || !parentView?.active) return [];
    return rig.profile.hitboxes.filter((item) => item.kind === kind).map((profile) =>
      transformRigHitboxToWorld(rig.getHitbox(profile.id), parentView)
    );
  }

  getStudioRigHitboxWorld(rig, parentView, kind) {
    return this.getStudioRigHitboxesWorld(rig, parentView, kind)[0] || null;
  }

  studioOrientedHitboxesOverlap(a, b) {
    return convexPolygonsOverlap(a, b);
  }

  studioProjectileHitsMonster(shot, monster, projectileX, projectileY) {
    if (!monster?.studioRig) return true;
    const hurtboxes = this.getStudioRigHitboxesWorld(monster.studioRig, monster.view, "hurt");
    if (!hurtboxes.length) return true;
    const radius = Math.max(2, Number(shot.collisionRadius) || 8);
    return hurtboxes.some((hurt) => circleIntersectsConvexPolygon(
      { x: projectileX, y: projectileY, radius },
      hurt.points
    ));
  }

  studioRigHitboxesOverlap(attackerRig, attackerView, targetRig, targetView) {
    const attacks = this.getStudioRigHitboxesWorld(attackerRig, attackerView, "attack");
    const hurts = this.getStudioRigHitboxesWorld(targetRig, targetView, "hurt");
    if (!attacks.length || !hurts.length) return true;
    return attacks.some((attack) => hurts.some((hurt) => this.studioOrientedHitboxesOverlap(attack, hurt)));
  }

  drawStudioCatalogPlant(studioPlant, x, y, row = 2) {
    const textureKey = studioPlant.textureKey || "studio-plant-published-" + studioPlant.id;
    const container = this.add.container(x, y).setDepth(11);
    const rowIndex = PhaserMath.Clamp(row, 0, LANES - 1);
    const laneGap = rowIndex < LANES - 1
      ? this.laneYs[rowIndex + 1] - this.laneYs[rowIndex]
      : this.laneYs[rowIndex] - this.laneYs[rowIndex - 1];
    const perspective = PhaserMath.Clamp(laneGap / 54, 0.62, 1.08);
    if (studioPlant.rigProfile || this.textures.exists(textureKey)) {
      const sizeFactor = PhaserMath.Clamp((Number(studioPlant.combat?.sizePercent) || 100) / 100, 0.25, 2);
      const height = 88 * perspective * sizeFactor;
      let rigRendered = false;
      if (studioPlant.rigProfile && studioPlant.rigPartTextures) {
        try {
          const rig = createPhaserSkeletalRig(this, studioPlant.rigProfile, studioPlant.rigPartTextures);
          const canvas = rig.profile.canvas;
          const width = Math.min(height * (canvas.width / canvas.height), 100 * perspective * sizeFactor);
          rig.root.setPosition(-canvas.width / 2, -canvas.height / 2 - height / 2 + 2);
          rig.root.setScale(width / canvas.width, height / canvas.height);
          container.add(rig.root);
          container.setData("studioSkeletalRig", rig);
          const idleClip = resolveSkeletalIdleClip(rig.profile) || rig.profile.clips[0];
          if (idleClip) this.playStudioSkeletalRig(rig, idleClip.id);
          rigRendered = true;
        } catch (error) {
          console.warn("Studio plant skeletal rig unavailable; preserving Sprite Sheet fallback:", studioPlant.id, error);
        }
      }
      if (!rigRendered && this.textures.exists(textureKey)) {
        const sheet = Boolean(studioPlant.spriteSheet);
        const frame = this.textures.getFrame(textureKey, sheet ? "0" : undefined);
        const width = Math.min(height * (frame.realWidth / frame.realHeight), 100 * perspective * sizeFactor);
        const idleFrame = String(studioPlant.animationProfile?.idle?.startFrame ?? 0);
        const artwork = sheet
          ? this.add.sprite(0, -height / 2 + 2, textureKey, idleFrame).setDisplaySize(width, height)
          : this.add.image(0, -height / 2 + 2, textureKey).setDisplaySize(width, height);
        artwork.setData("studioPlantSprite", true);
        if (sheet) {
          const idleAnimationKey = "studio-" + studioPlant.id + "-idle";
          if (this.anims.exists(idleAnimationKey)) artwork.play(idleAnimationKey);
        }
        container.add(artwork);
      }
    }
    container.setData("studioPlantId", studioPlant.id);
    container.setData("studioBehavior", studioPlant.combat.mode);
    this.tweens.add({ targets: container, scaleY: 1.025, duration: 1450, ease: "Sine.easeInOut", yoyo: true, repeat: -1 });
    return container;
  }

  drawCatalogPlant(type, x, y, row = 2) {
    const studioPlant = this.studioPlantsByType?.[type];
    if (studioPlant) return this.drawStudioCatalogPlant(studioPlant, x, y, row);
    const plant = this.add.container(x, y).setDepth(11);
    const texture = type === "pumpkin" ? "pumpkin-character" : type === "pineapple" ? "pineapple-level-1" : type === "hazelnut" ? "hazelnut-level-1" : type === "mango" ? "mango-level-1" : type === "snow-thrower" ? "snow-thrower-level-1" : type === "electric-mushroom" ? "electric-mushroom-level-1" : "radish-level-1";
    const rowIndex = PhaserMath.Clamp(row, 0, LANES - 1);
    const laneGap = rowIndex < LANES - 1
      ? this.laneYs[rowIndex + 1] - this.laneYs[rowIndex]
      : this.laneYs[rowIndex] - this.laneYs[rowIndex - 1];
    // The farthest row is smallest; each nearer row grows progressively.
    // Apply the same perspective to Pineapple, Hazelnut and Mango so their projectiles
    // can use the exact displayed plant scale when calculating launch offsets.
    const pineapplePerspectiveScale = type === "pineapple" || type === "hazelnut" || type === "mango" || type === "snow-thrower" || type === "electric-mushroom"
      ? PhaserMath.Clamp(0.8 + (rowIndex / Math.max(1, LANES - 1)) * 0.4, 0.8, 1.2)
      : 1;
    plant.setData("pineapplePerspectiveScale", pineapplePerspectiveScale);
    if (this.textures.exists(texture)) {
      // Pineapple Level 1 keeps its tuned base size; only its row perspective changes.
      const baseHeight = type === "pumpkin" ? 70 : type === "pineapple" ? 132 : type === "hazelnut" ? 112 : type === "mango" ? 112 : type === "snow-thrower" ? 84 : type === "electric-mushroom" ? 96 : 64;
      const height = baseHeight * pineapplePerspectiveScale;
      const plantFrame = this.textures.getFrame(texture, ["pineapple", "hazelnut", "mango", "snow-thrower", "electric-mushroom"].includes(type) ? "0" : undefined);
      const width = height * (plantFrame.realWidth / plantFrame.realHeight);
      const maxWidth = (type === "pineapple" ? 152 : type === "hazelnut" ? 116 : type === "mango" ? 116 : type === "snow-thrower" ? 84 : type === "electric-mushroom" ? 104 : 76) * pineapplePerspectiveScale;
      if (["pineapple", "hazelnut", "mango", "snow-thrower", "electric-mushroom"].includes(type)) {
        const animatedPlant = this.add.sprite(0, -height / 2 + 2, texture, "0").setDisplaySize(Math.min(width, maxWidth), height);
        const animationDataKey = type === "pineapple" ? "pineappleThrowSprite"
          : type === "hazelnut" ? "hazelnutThrowSprite"
          : type === "mango" ? "mangoThrowSprite"
          : type === "electric-mushroom" ? "electric-mushroomThrowSprite" : "snow-throwerThrowSprite";
        animatedPlant.setData(animationDataKey, true);
        plant.add(animatedPlant);
      } else {
        plant.add(this.add.image(0, -height / 2 + 2, texture).setDisplaySize(Math.min(width, maxWidth), height));
      }
    } else {
      const fallback = this.add.ellipse(0, -24, 42, 48, type === "pumpkin" ? 0xf39b32 : 0xe8e5d7, 1);
      plant.add(fallback);
    }
    return plant;
  }

  drawRadish(x, y) {
    const plant = this.add.container(x, y).setDepth(11);

    if (this.textures.exists("radish-level-1")) {
      const frame = this.textures.getFrame("radish-level-1", 0);
      const displayHeight = 72;
      const displayWidth = displayHeight * (frame.realWidth / frame.realHeight);
      const character = this.add.sprite(0, -displayHeight / 2 + 2, "radish-level-1", 0)
        .setDisplaySize(displayWidth, displayHeight)
        .setData("radishThrowSprite", true);
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

    return plant;
  }

  updatePlantIdleMotion(plant, deltaMs = 0) {
    if (!plant?.alive || !plant.view?.active) return;

    // Studio-authored plants keep their saved clip and return to idle after attacks.
    const studioPlant = plant.studioPlant;
    if (studioPlant) {
      if (plant.studioAttacking || plant.studioThrowing || plant.isAttacking) return;
      const skeletalRig = plant.view.getData?.("studioSkeletalRig");
      if (skeletalRig) {
        const idleClip = resolveSkeletalIdleClip(skeletalRig.profile);
        if (idleClip && skeletalRig._activeClipId !== idleClip.id) this.playStudioSkeletalRig(skeletalRig, idleClip.id);
        return;
      }
      const sprite = plant.view.list?.find((child) =>
        child?.active && child.getData?.("studioPlantSprite")
      );
      if (!sprite) return;
      const idleKey = "studio-" + studioPlant.id + "-idle";
      if (this.anims.exists(idleKey)) {
        if (!sprite.anims?.isPlaying || sprite.anims.currentAnim?.key !== idleKey) {
          sprite.play(idleKey);
        }
        return;
      }
      const idleFrame = String(studioPlant.animationProfile?.idle?.startFrame ?? 0);
      if (sprite.frame?.name !== idleFrame) sprite.setFrame(idleFrame);
      return;
    }

    // Built-in plants use deterministic profile-driven breathing motion.
    const elapsed = (plant.idleElapsedMs || 0) + Math.max(0, Number(deltaMs) || 0);
    const transform = getPlantIdleMotionTransform(
      plant.type,
      elapsed,
      plant.idlePhaseMs || 0,
      plant.idleBaseScaleX || 1,
      plant.idleBaseScaleY || 1
    );
    if (!transform) return;
    plant.idleElapsedMs = elapsed;
    plant.view.setScale(transform.scaleX, transform.scaleY);
  }

  updatePlants(delta) {
    const deltaMs = Number.isFinite(delta) ? Math.max(0, delta) : 0;
    for (const plant of this.plants) {
      if (!plant.alive) continue;
      this.updatePlantIdleMotion(plant, deltaMs);
      if (plant.type === "mushroom") {
        plant.productionTimer -= delta;
        if (plant.productionTimer <= 0) {
          plant.productionTimer += MUSHROOM_CONFIG.productionInterval;
          this.spawnMushroomEnergy(plant);
        }
        continue;
      }
      if (plant.type === "pumpkin") continue;
      const studioProfile = plant.studioPlant?.combat || null;
      if (studioProfile?.mode === "blocker") continue;
      if (studioProfile?.mode === "energy") {
        plant.productionTimer = Math.max(0, (plant.productionTimer ?? studioProfile.energyIntervalMs) - deltaMs);
        if (plant.productionTimer <= 0) {
          plant.productionTimer += studioProfile.energyIntervalMs;
          this.spawnStudioEnergy(plant, studioProfile.energyAmount);
        }
        continue;
      }
      const configs = { radish: RADISH_CONFIG, pineapple: PINEAPPLE_CONFIG, hazelnut: HAZELNUT_CONFIG, mango: MANGO_CONFIG, "snow-thrower": SNOW_THROWER_CONFIG, "electric-mushroom": ELECTRIC_MUSHROOM_CONFIG };
      const config = configs[plant.type] || (studioProfile ? {
        cooldownMs: studioProfile.cooldownMs,
        cooldown: studioProfile.cooldownMs,
        range: studioProfile.range,
        projectileDamage: studioProfile.damage
      } : null);
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
          Number.isFinite(monster.localX) &&
          monster.localX - plantLaneX <= (studioProfile?.range ?? GRID_WIDTH) &&
          !(plant.type === "snow-thrower" && monster.freezeStage >= 5) &&
          // Start firing the instant the monster crosses the lawn's far/right edge.
          // Keep targeting only monsters ahead of this plant in the same lane.
          monster.localX <= GRID_WIDTH / 2 && monster.localX > plantLaneX)
        .sort((a, b) => a.localX - b.localX)[0];
      if (!target) continue;
      if (studioProfile?.mode === "melee" || studioProfile?.mode === "contact") {
        if (studioProfile.mode === "contact" && !target.isEating) continue;
        const attackSprite = plant.view?.list?.find((child) => child?.getData?.("studioPlantSprite"));
        const skeletalRig = plant.view?.getData?.("studioSkeletalRig");
        const animationKey = "studio-" + plant.studioPlant.id + "-attack";
        const applyStudioHit = () => {
          if (!plant.alive || !target.alive || (studioProfile.mode === "contact" && !target.isEating) || this.gameOver) return;
          if (skeletalRig && target.studioRig && !this.studioRigHitboxesOverlap(skeletalRig, plant.view, target.studioRig, target.view)) return;
          this.applyMonsterDamage(target, studioProfile.damage, plant.type);
          this.createProjectileImpact(target.view?.x ?? plant.x, target.view?.y ?? plant.y - 22, plant.type);
          this.damageMonsterIfNeeded(target);
        };
        if (skeletalRig?.profile.clips.some((clip) => clip.id === "attack")) {
          if (plant.studioAttacking) continue;
          plant.studioAttacking = true;
          this.playStudioSkeletalRig(skeletalRig, "attack", () => {
            const idle = resolveSkeletalIdleClip(skeletalRig.profile);
            if (idle) this.playStudioSkeletalRig(skeletalRig, idle.id);
            plant.studioAttacking = false;
            applyStudioHit();
          });
        } else if (attackSprite?.active && this.anims.exists(animationKey)) {
          if (plant.studioAttacking) continue;
          plant.studioAttacking = true;
          attackSprite.play(animationKey);
          attackSprite.once("animationcomplete", () => {
            if (attackSprite.active) { const idleKey = "studio-" + plant.studioPlant.id + "-idle"; if (this.anims.exists(idleKey)) attackSprite.play(idleKey); else attackSprite.setFrame(String(plant.studioPlant.animationProfile?.idle?.startFrame ?? 0)); }
            plant.studioAttacking = false;
            applyStudioHit();
          });
        } else {
          applyStudioHit();
        }
      } else {
        this.fireThorn(plant, target);
      }
      plant.cooldown = Number.isFinite(config.cooldownMs) ? config.cooldownMs : config.cooldown;
    }
  }

  spawnStudioEnergy(plant, amount) {
    const pickupId = "pickup-" + this.nextEnergyPickupId++;
    const token = this.add.container(plant.x, plant.y - 64).setDepth(35);
    token.setSize(42, 42).setInteractive();
    if (token.input) token.input.cursor = "pointer";
    token.add([
      this.add.circle(0, 0, 17, 0x8fce70, 0.96).setStrokeStyle(3, 0xffefb0, 1),
      this.add.text(0, 0, "+" + amount, { fontFamily: "Arial", fontSize: "13px", color: "#fff8d7", fontStyle: "bold", stroke: "#38502b", strokeThickness: 3 }).setOrigin(0.5)
    ]);
    token.studioPickupId = pickupId;
    this.energyPickups.push(token);
    token.on("pointerdown", () => {
      if (!token.active || token.studioConsumed) return;
      token.studioConsumed = true;
      const collection = collectEnergy(this.energy, amount);
      this.energy = collection.energy;
      if (collection.collected > 0) {
        this.recordCombatEvent("energy_collected", { pickupId, amount: collection.collected });
        this.playEnergyCollectSound();
        this.setMessage("Collected " + collection.collected + " energy from " + (plant.studioPlant.name || plant.type) + ".");
      } else {
        this.recordCombatEvent("energy_discarded", { pickupId });
        this.setMessage("Energy is full. Spend energy before collecting more.");
      }
      this.energyPickups = this.energyPickups.filter((pickup) => pickup !== token);
      if (token.expiryTimer) token.expiryTimer.remove(false);
      token.destroy();
      this.refreshHud();
    });
    this.tweens.add({ targets: token, y: token.y - 9, duration: 700, ease: "Sine.easeInOut", yoyo: true, repeat: -1 });
    token.expiryTimer = this.time.delayedCall(MUSHROOM_PICKUP_TTL_MS, () => {
      if (token.active) {
        this.energyPickups = this.energyPickups.filter((pickup) => pickup !== token);
        this.recordCombatEvent("energy_discarded", { pickupId });
        token.destroy();
      }
    });
    this.recordCombatEvent("energy_spawned", { sourceCol: plant.col, sourceRow: plant.row, pickupId, amount });
  }


  spawnStudioEnergy(plant, amount) {
    const pickupId = "pickup-" + this.nextEnergyPickupId++;
    const token = this.add.container(plant.x, plant.y - 64).setDepth(35);
    token.setSize(42, 42).setInteractive();
    if (token.input) token.input.cursor = "pointer";
    token.add([
      this.add.circle(0, 0, 17, 0x8fce70, 0.96).setStrokeStyle(3, 0xffefb0, 1),
      this.add.text(0, 0, "+" + amount, { fontFamily: "Arial", fontSize: "13px", color: "#fff8d7", fontStyle: "bold", stroke: "#38502b", strokeThickness: 3 }).setOrigin(0.5)
    ]);
    token.studioPickupId = pickupId;
    this.energyPickups.push(token);
    token.on("pointerdown", () => {
      if (!token.active || token.studioConsumed) return;
      token.studioConsumed = true;
      const collection = collectEnergy(this.energy, amount);
      this.energy = collection.energy;
      if (collection.collected > 0) {
        this.recordCombatEvent("energy_collected", { pickupId, amount: collection.collected });
        this.playEnergyCollectSound();
        this.setMessage("Collected " + collection.collected + " energy from " + (plant.studioPlant.name || plant.type) + ".");
      } else {
        this.recordCombatEvent("energy_discarded", { pickupId });
        this.setMessage("Energy is full. Spend energy before collecting more.");
      }
      this.energyPickups = this.energyPickups.filter((pickup) => pickup !== token);
      if (token.expiryTimer) token.expiryTimer.remove(false);
      token.destroy();
      this.refreshHud();
    });
    this.tweens.add({ targets: token, y: token.y - 9, duration: 700, ease: "Sine.easeInOut", yoyo: true, repeat: -1 });
    token.expiryTimer = this.time.delayedCall(MUSHROOM_PICKUP_TTL_MS, () => {
      if (token.active) {
        this.energyPickups = this.energyPickups.filter((pickup) => pickup !== token);
        this.recordCombatEvent("energy_discarded", { pickupId });
        token.destroy();
      }
    });
    this.recordCombatEvent("energy_spawned", { sourceCol: plant.col, sourceRow: plant.row, pickupId, amount });
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

  fireThorn(plant, target, electricCharged = false) {
    if (plant.studioPlant) {
      const animationKey = "studio-" + plant.studioPlant.id + "-attack";
      const sprite = plant.view?.list?.find((child) => child?.getData?.("studioPlantSprite"));
      const skeletalRig = plant.view?.getData?.("studioSkeletalRig");
      if (skeletalRig?.profile.clips.some((clip) => clip.id === "attack")) {
        if (plant.studioThrowing) return;
        plant.studioThrowing = true;
        this.playStudioSkeletalRig(skeletalRig, "attack", () => {
          const idle = resolveSkeletalIdleClip(skeletalRig.profile);
          if (idle) this.playStudioSkeletalRig(skeletalRig, idle.id);
          plant.studioThrowing = false;
          if (plant.alive && target?.alive && !this.gameOver) this.fireThornProjectile(plant, target);
        });
      } else if (sprite?.active && this.anims.exists(animationKey)) {
        if (plant.studioThrowing) return;
        plant.studioThrowing = true;
        sprite.play(animationKey);
        sprite.once("animationcomplete", () => {
          if (sprite.active) { const idleKey = "studio-" + plant.studioPlant.id + "-idle"; if (this.anims.exists(idleKey)) sprite.play(idleKey); else sprite.setFrame(String(plant.studioPlant.animationProfile?.idle?.startFrame ?? 0)); }
          plant.studioThrowing = false;
          if (plant.alive && target?.alive && !this.gameOver) this.fireThornProjectile(plant, target);
        });
      } else this.fireThornProjectile(plant, target);
      return;
    }
    // Electric Mushroom compresses and releases its cap before the bolt is created.
    // The short vertical anticipation is kept separate from idle scale breathing.
    if (plant.type === "electric-mushroom" && !electricCharged && plant.view?.active) {
      const baseY = plant.view.y;
      plant.preAttackTween?.stop?.();
      plant.preAttackTween = this.tweens.add({
        targets: plant.view,
        y: baseY - 3,
        duration: 95,
        ease: "Sine.easeOut",
        yoyo: true,
        onComplete: () => {
          if (plant.view?.active) plant.view.y = baseY;
          plant.preAttackTween = null;
          if (plant.alive && target?.alive && !this.gameOver) this.fireThorn(plant, target, true);
        }
      });
      return;
    }
    // Pineapple projectiles must not exist until the throw animation reaches
    // its final frame. This keeps the visual action and the actual launch in sync.
    if (["radish", "pineapple", "hazelnut", "mango", "snow-thrower", "electric-mushroom"].includes(plant.type) && plant.view?.active) {
      const animationType = plant.type;
      const throwingKey = `${animationType}Throwing`;
      if (plant[throwingKey]) return;
      const throwSprite = plant.view.list.find((child) => child?.getData?.(`${animationType}ThrowSprite`));
      const animationKey = `${animationType}-level-1-throw`;
      const textureKey = `${animationType}-level-1`;
      if (throwSprite && this.anims.exists(animationKey)) {
        plant[throwingKey] = true;
        const motion = getPlantAnimationProfile(plant.type);
        if (motion && Number.isFinite(plant.view.y)) {
          const baseY = plant.view.y;
          plant.preAttackTween?.stop?.();
          plant.preAttackTween = this.tweens.add({
            targets: plant.view,
            y: baseY - motion.anticipationPx,
            duration: Math.max(50, Math.round(motion.anticipationMs * 0.45)),
            ease: "Sine.easeOut",
            yoyo: true,
            hold: Math.max(0, Math.round(motion.anticipationMs * 0.1)),
            onComplete: () => {
              if (plant.view?.active) plant.view.y = baseY;
              plant.preAttackTween = null;
            }
          });
        }
        throwSprite.stop();
        throwSprite.setTexture(textureKey, 0);
        throwSprite.play(animationKey);
        throwSprite.once("animationcomplete", () => {
          if (throwSprite.active) throwSprite.setTexture(textureKey, 0);
          this.time.delayedCall(0, () => {
            plant[throwingKey] = false;
            if (plant.alive && target?.alive && !this.gameOver) {
              this.fireThornProjectile(plant, target);
            }
          });
        });
        return;
      }
    }
    this.fireThornProjectile(plant, target);
  }




  fireThornProjectile(plant, target) {
    if (plant.studioPlant?.combat?.mode === "projectile") {
      const lane = this.worldToLane(plant);
      const localX = lane.localX;
      const row = plant.row;
      const profile = plant.studioPlant.combat;
      const laneOrigin = this.lanePoint(localX, row);
      const skeletalRig = plant.view?.getData?.("studioSkeletalRig");
      const muzzle = skeletalRig?.profile.attachments.some((item) => item.id === "muzzle")
        ? this.getStudioRigAttachmentWorld(skeletalRig, plant.view, "muzzle") : null;
      if (skeletalRig && !muzzle) {
        console.error("Rigged projectile plant has no valid muzzle attachment:", plant.studioPlant.id);
        return;
      }
      const launchPoint = muzzle
        ? { x: muzzle.x, y: muzzle.y }
        : getProjectileLaunchPoint({ laneX: laneOrigin.x, laneY: laneOrigin.y, offsetX: profile.projectileLaunchOffsetX, offsetY: profile.projectileLaunchOffsetY });
      const launchOffsetX = launchPoint.x - laneOrigin.x;
      const launchOffsetY = launchPoint.y - laneOrigin.y;
      const view = this.add.container(launchPoint.x, launchPoint.y).setDepth(16);
      const textureKey = plant.studioPlant.projectileTextureKey || "studio-projectile-published-" + plant.studioPlant.id;
      if (this.textures.exists(textureKey)) {
        const projectile = plant.studioPlant.combat.projectile || {};
        const hasFrames = Number(projectile.frameCount) > 1 && this.anims.exists("studio-projectile-" + plant.studioPlant.id);
        const sprite = this.add.sprite(0, 0, textureKey, hasFrames ? "0" : undefined);
        const frame = this.textures.getFrame(textureKey, hasFrames ? "0" : undefined);
        const width = Math.min(38, 28 * (frame.realWidth / frame.realHeight));
        sprite.setDisplaySize(width, 28);
        if (hasFrames) sprite.play("studio-projectile-" + plant.studioPlant.id);
        view.add(sprite);
      } else {
        view.add(this.add.circle(0, 0, 11, 0xffc247, 1).setStrokeStyle(2, 0xffefc2, 1));
      }
      const effectColor = /^#[0-9a-f]{6}$/i.test(profile.projectileEffectColor || "")
        ? Number.parseInt(profile.projectileEffectColor.slice(1), 16)
        : 0xffc247;
      view.setRotation((Number(profile.projectileRotation) || 0) * Math.PI / 180);
      this.projectiles.push({
        view, localX, row, target, startLocalX: localX, targetLocalX: Math.max(localX + 1, target.localX),
        launchOffsetX, launchOffsetY, speed: profile.projectileSpeed,
        projectileTrajectoryType: profile.projectileTrajectoryType || "arc",
        projectileCurveX: Number(profile.projectileCurveX) || 0, projectileCurveY: Number(profile.projectileCurveY) || 110,
        projectileTargetOffsetX: Number(profile.projectileTargetOffsetX) || 0, projectileTargetOffsetY: Number(profile.projectileTargetOffsetY) || 0,
        projectilePathPoints: Array.isArray(profile.projectilePathPoints) ? profile.projectilePathPoints : null,
        damage: profile.damage, freeze: false, freezeDurationMs: 0,
        collisionRadius: profile.projectileCollisionRadius, dropSpeed: profile.projectileSpeed * 1.5,
        projectileHeight: profile.projectileHeight || 0, projectileEffectColor: effectColor,
        dropPhase: "horizontal", alive: true, trailTimer: 0,
        plantType: plant.type, studioPlantId: plant.studioPlant.id
      });
      this.playThornSound();
      return;
    }
    // Radish Level 1 launches its dedicated miniature radish bomb from the
    // forward hand pose. Keep the canonical lane, speed, damage and collision rules.
    const lane = this.worldToLane(plant);
    const localX = lane.localX;
    const row = plant.row;
    const targetRow = plant.row;
    const targetLocalX = Math.max(localX + 1, target.localX);
    // Pineapple, Hazelnut and Mango travel on the same raised lane. Their launch
    // offsets are measured from that lane so the complete curved trajectory
    // retains the exact launch position instead of snapping on its first tick.
    const usesRaisedBombLane = ["pineapple", "hazelnut", "mango", "snow-thrower"].includes(plant.type);
    const laneOrigin = usesRaisedBombLane
      ? this.pineappleLanePoint(localX, row)
      : this.lanePoint(localX, row);
    let launchOffsetX = 0;
    let launchOffsetY = 0;
    if (plant.type === "radish") {
      const frame = this.textures.getFrame("radish-level-1", 0);
      const displayHeight = 72;
      const displayWidth = displayHeight * (frame.realWidth / frame.realHeight);
      // Launch from the radish's forward hand, not from the soil-cell center.
      launchOffsetX = displayWidth * 0.32;
      launchOffsetY = -(displayHeight * 0.48);
    } else if (plant.type === "pineapple") {
      const frame = this.textures.getFrame("pineapple-level-1");
      const perspectiveScale = plant.view?.getData?.("pineapplePerspectiveScale") || 1;
      const displayHeight = 105.6 * perspectiveScale;
      const displayWidth = Math.min(displayHeight * (frame.realWidth / frame.realHeight), 121.6 * perspectiveScale);
      launchOffsetX = displayWidth / 2;
      // Preserve the pineapple's already-tuned launch position.
      launchOffsetY = -(displayHeight / 2) - 8;
    } else if (plant.type === "snow-thrower") {
      const frame = this.textures.getFrame("snow-thrower-level-1", "0");
      const perspectiveScale = plant.view?.getData?.("pineapplePerspectiveScale") || 1;
      const displayHeight = 84 * perspectiveScale;
      const displayWidth = Math.min(displayHeight * (frame.realWidth / frame.realHeight), 84 * perspectiveScale);
      launchOffsetX = displayWidth / 2;
      // Lower the snow bomb by half the plant's displayed height from its previous launch point.
      launchOffsetY = -(displayHeight * 0.35);
    } else if (plant.type === "hazelnut" || plant.type === "mango") {
      const frame = this.textures.getFrame(`${plant.type}-level-1`, plant.type === "mango" ? 0 : undefined);
      const perspectiveScale = plant.view?.getData?.("pineapplePerspectiveScale") || 1;
      const displayHeight = 112 * perspectiveScale;
      const displayWidth = Math.min(
        displayHeight * (frame.realWidth / frame.realHeight),
        116 * perspectiveScale
      );
      // Start at the center of the planted Hazelnut's displayed height,
      // then move right by half its displayed width.
      const midpointY = plant.y - displayHeight / 2 + 2;
      launchOffsetX = displayWidth / 2;
      launchOffsetY = midpointY - laneOrigin.y;
    } else if (plant.type === "electric-mushroom") {
      const frame = this.textures.exists("electric-mushroom-level-1")
        ? this.textures.getFrame("electric-mushroom-level-1", "0")
        : null;
      const perspectiveScale = plant.view?.getData?.("pineapplePerspectiveScale") || 1;
      const displayHeight = 96 * perspectiveScale;
      const displayWidth = frame
        ? Math.min(displayHeight * (frame.realWidth / frame.realHeight), 104 * perspectiveScale)
        : 96 * perspectiveScale;
      // Launch the electric bolt from the cap's forward upper edge.
      launchOffsetX = displayWidth * 0.28;
      launchOffsetY = -(displayHeight * 0.68);
    }
    const launchX = laneOrigin.x + launchOffsetX;
    const launchY = laneOrigin.y + launchOffsetY;
    const view = this.add.container(launchX, launchY).setDepth(16);
    const projectileVFX = getProjectileVFXProfile(plant.type);
    const projectileTint = projectileVFX?.tint ?? 0xffc247;
    // Keep the projectile at the adjusted half-height launch point. Do not
    // ease its vertical offset toward the lane center:
    // that creates the unwanted immediate downward drop.

    const halo = this.add.circle(0, 0, 18, projectileTint, 0.13);
    const outerGlow = this.add.circle(0, 0, 13, projectileTint, 0.2);
    const innerGlow = this.add.circle(0, 0, 9, projectileTint, 0.28);
    view.add([halo, outerGlow, innerGlow]);

    const projectileTexture = plant.type === "electric-mushroom" ? null : projectileVFX?.texture || (plant.type === "radish" ? "radish-level-1-bomb"
      : plant.type === "pineapple" ? "pineapple-level-1-bomb"
      : plant.type === "hazelnut" ? "hazelnut-level-1-bomb"
      : plant.type === "snow-thrower" ? "snow-thrower-bomb-level-1"
      : "mango-level-1-bomb");
    if (projectileTexture && this.textures.exists(projectileTexture)) {
      const plantProjectile = this.add.image(0, 0, projectileTexture);
      if (plant.type === "pineapple" || plant.type === "hazelnut" || plant.type === "mango") {
        const bombSize = plant.type === "hazelnut" ? 31 : plant.type === "mango" ? 30 : 34;
        plantProjectile.setDisplaySize(bombSize, plant.type === "hazelnut" ? 30 : plant.type === "mango" ? 30 : 21);
      } else if (plant.type === "radish") {
        plantProjectile.setDisplaySize(27, 31).setRotation(-Math.PI / 2);
      } else {
        plantProjectile.setDisplaySize(30, 30);
      }
      view.add(plantProjectile);
    } else if (plant.type === "electric-mushroom") {
      // A compact lightning glyph keeps the projectile readable without borrowing another plant's art.
      const electricGlow = this.add.circle(0, 0, 12, 0x65d9ff, 0.24);
      const bolt = this.add.graphics();
      bolt.lineStyle(8, 0x35bfff, 0.72);
      bolt.beginPath();
      bolt.moveTo(-5, 11); bolt.lineTo(2, 2); bolt.lineTo(-2, -1); bolt.lineTo(7, -12);
      bolt.strokePath();
      bolt.lineStyle(3, 0xf1fdff, 1);
      bolt.beginPath();
      bolt.moveTo(-5, 11); bolt.lineTo(2, 2); bolt.lineTo(-2, -1); bolt.lineTo(7, -12);
      bolt.strokePath();
      view.add([electricGlow, bolt]);
    } else if (plant.type === "snow-thrower") {
      // Keep a snow-colored fallback if the uploaded projectile texture fails.
      const snowball = this.add.circle(0, 0, 12, 0xb9efff, 1)
        .setStrokeStyle(2, 0xf4fdff, 1);
      const glint = this.add.circle(-4, -4, 3, 0xffffff, 0.95);
      const snowflake = this.add.text(0, 0, "❄", {
        fontFamily: "Arial", fontSize: "15px", color: "#267ca8",
        stroke: "#e9fbff", strokeThickness: 1
      }).setOrigin(0.5);
      view.add([snowball, glint, snowflake]);
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

    const chargeEffectId = getPlantVFXProfile(plant.type)?.charge;
    const chargePlayed = chargeEffectId && this.vfxManager?.play(chargeEffectId, launchX, launchY, {
      tint: projectileTint, count: 6, durationMs: 135, endScale: 1.8, depth: 15
    });
    if (!chargePlayed) {
      const muzzleFlash = this.add.circle(launchX, launchY, 13, projectileTint, 0.8).setDepth(15);
      this.tweens.add({
        targets: muzzleFlash,
        alpha: 0,
        scale: 2.1,
        duration: 135,
        onComplete: () => muzzleFlash.destroy()
      });
    }

    const projectileConfig = plant.type === "pineapple" ? PINEAPPLE_CONFIG
      : plant.type === "hazelnut" ? HAZELNUT_CONFIG
      : plant.type === "mango" ? MANGO_CONFIG
      : plant.type === "snow-thrower" ? SNOW_THROWER_CONFIG
      : plant.type === "electric-mushroom" ? ELECTRIC_MUSHROOM_CONFIG
      : RADISH_CONFIG;
    this.projectiles.push({
      view, localX, row, startRow: row, targetRow, target, plantType: plant.type,
      startLocalX: localX, targetLocalX,
      launchOffsetX, launchOffsetY,
      speed: projectileConfig.projectileSpeed,
      damage: projectileConfig.projectileDamage || 0,
      freeze: Boolean(projectileConfig.freezeProjectile),
      freezeDurationMs: projectileConfig.freezeDurationMs || 0,
      collisionRadius: projectileConfig.projectileCollisionRadius,
      dropSpeed: Math.max(360, projectileConfig.projectileSpeed * 1.5),
      dropPhase: "horizontal",
      alive: true, trailTimer: 0
    });
    this.playThornSound();
  }

  createFreezeImpact(x, y, plantType = "snow-thrower") {
    const effectId = getPlantVFXProfile(plantType)?.impact;
    if (effectId && this.vfxManager?.play(effectId, x, y, { tint: 0xbcecff, count: 9, durationMs: 320, endScale: 1.8 })) return;
    const burst = this.add.container(x, y).setDepth(25);
    const core = this.add.circle(0, 0, 11, 0xe9fbff, 0.95);
    const ring = this.add.circle(0, 0, 22, 0x72d9ff, 0.72).setStrokeStyle(3, 0xe6fbff, 0.95);
    const shards = [];
    for (let index = 0; index < 6; index += 1) {
      const angle = index * Math.PI / 3;
      shards.push(this.add.triangle(Math.cos(angle) * 22, Math.sin(angle) * 22, 0, -6, 5, 5, -5, 5, 0xc9f2ff, 0.95).setRotation(angle));
    }
    burst.add([ring, core, ...shards]);
    this.tweens.add({ targets: burst, scale: 1.8, alpha: 0, duration: 320, ease: "Cubic.easeOut", onComplete: () => burst.destroy() });
  }

  createProjectileImpact(x, y, plantType = "radish", customTint = null) {
    const effectId = getPlantVFXProfile(plantType)?.impact;
    const tint = Number.isInteger(customTint) ? customTint : null;
    if (effectId && this.vfxManager?.play(effectId, x, y, { ...(tint === null ? {} : { tint }), count: 8, durationMs: 220, endScale: 2.1 })) return;
    if (plantType === "electric-mushroom") {
      const burst = this.add.container(x, y).setDepth(24);
    const flash = this.add.circle(0, 0, 10, tint ?? 0xfff4f7, 0.96);
    const sparks = [];
    const colors = tint === null ? [0xff7185, 0x8bd66f, 0xffc7d0, 0x65bd62, 0xffffff, 0xffa4b2] : [tint, tint, 0xffffff, tint, 0xffffff, tint];
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
  }

  createProjectileTrail(x, y, plantType = "radish", customTint = null) {
    const effectId = getPlantVFXProfile(plantType)?.trail;
    const tint = Number.isInteger(customTint) ? customTint : null;
    if (effectId && this.vfxManager?.playProjectileTrail(effectId, x, y, { ...(tint === null ? {} : { tint }), count: 3, durationMs: 180, endScale: 1.6 })) return;
    const fallbackTint = tint ?? getProjectileVFXProfile(plantType)?.tint ?? 0xffc247;
    const spark = this.add.circle(x, y, PhaserMath.Between(2, 4), fallbackTint, 0.72).setDepth(14);
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

  getStageWaveEntries(wave) {
    return this.stageMonsterEntries.filter(entry => Number(entry.wave) === wave);
  }

  getStageWaveSize(wave) {
    if (!this.stageMonsterRosterConfigured) return PHASE_ONE_WAVE_SIZES[wave - 1] || 0;
    return Math.min(500, this.getStageWaveEntries(wave).reduce((sum, entry) => sum + Math.max(1, Number(entry.count) || 1), 0));
  }

  getStageMonsterEntry(spawnIndex = 0) {
    if (!this.stageMonsterRosterConfigured) return null;
    let offset = Math.max(0, spawnIndex);
    for (const entry of this.getStageWaveEntries(this.wave)) {
      const count = Math.max(1, Number(entry.count) || 1);
      if (offset < count) return entry;
      offset -= count;
    }
    return null;
  }

  monsterArchetypeFor(spawnIndex) {
    return resolveMonsterArchetype(this.wave, spawnIndex);
  }

  selectStudioMonsterForSpawn() {
    return selectWeightedStudioMonster(
      (this.studioMonsters || []).filter((monster) => monster.runtimeReady && this.textures.exists(monster.textureKey)),
      this.wave,
      (min, max) => this.simulationRandom.nextInt(min, max)
    );
  }

  createHyenaAnimations() {
    // These four authored sheets are the required monster artwork. Hit and
    // death are optional single-pose sheets and must never disable the hyenas.
    const requiredDefinitions = [
      ["hyena-idle", 4, 5, -1],
      ["hyena-walk", 9, 9, -1],
      ["hyena-run", 7, 14, -1],
      ["hyena-bite", 5, 9, -1]
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
        // The revised bite artwork is a single horizontal strip of eight
        // 180x180 poses. All eight frames belong to the authored bite cycle.
        const startFrame = 0;
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
    if (monster?.studioMonster?.rigProfile && monster.studioRig) {
      const action = key === "hyena-death" ? "death"
        : key === "hyena-hit" ? "hit"
        : key === "hyena-bite" ? "attack"
        : ["hyena-walk", "hyena-run"].includes(key) ? "move" : "idle";
      if (action === "attack" && !force && monster.hitAnimUntil > this.time.now) return;
      const rig = monster.studioRig;
      const activeId = rig._activeClipId;
      const protectedAction = (activeId === "death" && action !== "death")
        || (activeId === "frozen" && !["frozen", "death"].includes(action))
        || ((monster.freezeStage || 0) > 0 && !["frozen", "death"].includes(action))
        || (["attack", "hit"].includes(activeId) && ["idle", "move"].includes(action));
      if (protectedAction && (activeId === "death" || activeId === "frozen" || (monster.freezeStage || 0) > 0 || !force)) return;
      const clip = rig.profile.clips.find((entry) => entry.id === action)
        || (action === "hit" ? rig.profile.clips.find((entry) => entry.id === "attack") : null)
        || resolveSkeletalIdleClip(rig.profile);
      if (clip && !force && activeId === clip.id) return;
      if (clip) {
        const returnsToIdle = ["attack", "hit"].includes(action);
        const onComplete = returnsToIdle ? () => {
          if (!monster.alive || (monster.freezeStage || 0) > 0 || rig._activeClipId !== null) return;
          const idle = resolveSkeletalIdleClip(rig.profile);
          if (idle) this.playStudioSkeletalRig(rig, idle.id);
        } : null;
        this.playStudioSkeletalRig(rig, clip.id, onComplete);
      }
      return;
    }
    const sprite = monster && monster.hyenaSprite;
    if (!sprite || !sprite.active) return;
    if (monster.studioMonster) {
      const action = ["hyena-bite", "hyena-hit", "hyena-death"].includes(key) ? "attack" : ["hyena-walk", "hyena-run"].includes(key) ? "move" : "idle";
      const animationKey = "studio-monster-" + monster.studioMonster.id + "-" + action;
      if (action === "attack" && !force && monster.hitAnimUntil > this.time.now) return;
      if (this.anims.exists(animationKey)) {
        const currentKey = sprite.anims.currentAnim?.key;
        if (force || currentKey !== animationKey || !sprite.anims.isPlaying) sprite.play(animationKey);
      } else if (action === "move" && this.anims.exists("studio-monster-" + monster.studioMonster.id + "-idle")) {
        sprite.play("studio-monster-" + monster.studioMonster.id + "-idle");
      } else if (action === "idle") {
        sprite.setFrame(String(monster.studioMonster.animationProfile?.idle?.startFrame ?? 0));
      }
      return;
    }
    if (!this.hyenaAnimationsReady || !this.anims.exists(key)) return;
    if (!force && monster.hitAnimUntil > this.time.now && key !== "hyena-hit") return;
    const currentKey = sprite.anims.currentAnim?.key;
    if (!force && currentKey === key && sprite.anims.isPlaying) return;
    sprite.play(key);
  }

  createMonsterArrivalEffect(spawn, laneGap, archetype) {
    const accent = archetype === "stonehide" ? 0x8fb9ff
      : archetype === "dust-skitter" ? 0xb9e7f4
      : archetype === "alpha-brute" ? 0xffc45e
      : 0xd6b27a;
    const scale = PhaserMath.Clamp(laneGap / 108, 0.28, 0.62);
    const cue = this.add.container(spawn.x + 4, spawn.y + 2).setDepth(9 + spawn.y / 1000);
    const shadow = this.add.ellipse(0, 0, 54 * scale, 16 * scale, 0x20180f, 0.36);
    const outer = this.add.ellipse(0, -4 * scale, 58 * scale, 25 * scale, accent, 0);
    outer.setStrokeStyle(Math.max(2, 4 * scale), accent, 0.92);
    const inner = this.add.ellipse(0, -4 * scale, 38 * scale, 15 * scale, 0xffffff, 0);
    inner.setStrokeStyle(Math.max(1, 2 * scale), 0xfff0c7, 0.8);
    cue.add([shadow, outer, inner]);
    cue.setAlpha(0.95).setScale(0.45);
    this.tweens.add({
      targets: cue,
      scale: 1.5,
      alpha: 0,
      duration: archetype === "dust-skitter" ? 280 : 420,
      ease: "Cubic.easeOut",
      onComplete: () => cue.destroy()
    });

    // A few inexpensive dust puffs sell the arrival without loading new art.
    for (let i = 0; i < 3; i += 1) {
      const puff = this.add.ellipse(
        spawn.x + PhaserMath.Between(-12, 12) * scale,
        spawn.y - PhaserMath.Between(0, 8) * scale,
        10 * scale, 6 * scale, accent, 0.5
      ).setDepth(9 + spawn.y / 1000);
      this.tweens.add({
        targets: puff,
        x: puff.x + PhaserMath.Between(-22, 22) * scale,
        y: puff.y - PhaserMath.Between(10, 24) * scale,
        alpha: 0,
        scale: 0.2,
        duration: 300 + i * 45,
        ease: "Quad.easeOut",
        onComplete: () => puff.destroy()
      });
    }
  }

  spawnMonster(spawnIndex = this.spawnedThisWave) {
    const row = this.simulationRandom.nextInt(0, LANES - 1);
    const stageEntry = this.getStageMonsterEntry(spawnIndex);
    const studioMonster = stageEntry ? (this.studioMonstersById?.[stageEntry.id] || null) : this.selectStudioMonsterForSpawn();
    const knownArchetypes = ["cave-brute", "dust-skitter", "stonehide", "alpha-brute"];
    const archetype = studioMonster?.monsterProfile?.baseArchetype || (knownArchetypes.includes(stageEntry?.id) ? stageEntry.id : this.monsterArchetypeFor(spawnIndex));
    try { recordMonsterDiscovery(window.localStorage, archetype); } catch { /* Bestiary tracking must never interrupt battle. */ }
    const baseProfile = getMonsterCombatStats(archetype, this.wave);
    const resolvedProfile = studioMonster
      ? resolveStudioMonsterRuntimeProfile(baseProfile, studioMonster.monsterProfile)
      : baseProfile;
    const profile = stageEntry ? {
      ...resolvedProfile,
      hp: Math.max(1, Math.round(resolvedProfile.hp * (Number(stageEntry.hpMultiplier) || 1))),
      maxHp: Math.max(1, Math.round(resolvedProfile.maxHp * (Number(stageEntry.hpMultiplier) || 1))),
      speed: resolvedProfile.speed * (Number(stageEntry.speedMultiplier) || 1),
      plantDamage: Math.max(1, Math.round(resolvedProfile.plantDamage * (Number(stageEntry.damageMultiplier) || 1))),
      attackIntervalMs: Math.max(100, Math.round(resolvedProfile.attackIntervalMs * (Number(stageEntry.attackIntervalMultiplier) || 1)))
    } : resolvedProfile;
    const hp = profile.hp;
    const speed = profile.speed;
    const spawn = this.monsterLanePoint(SPAWN_LOCAL_X, row);
    const view = this.add.container(spawn.x, spawn.y).setDepth(10 + spawn.y / 1000);
    view.setAlpha(0);

    // Scale each creature against the measured gap of its perspective lane.
    const laneGap = row < LANES - 1
      ? this.laneYs[row + 1] - this.laneYs[row]
      : this.laneYs[row] - this.laneYs[row - 1];
    const monsterScale = PhaserMath.Clamp(laneGap / 108, 0.28, 0.62);
    const finalScaleX = monsterScale * profile.widthScale;
    const finalScaleY = monsterScale * profile.heightScale;
    view.setScale(finalScaleX * 0.72, finalScaleY * 0.72);
    this.createMonsterArrivalEffect(spawn, laneGap, archetype);
    this.tweens.add({
      targets: view,
      alpha: 1,
      scaleX: finalScaleX,
      scaleY: finalScaleY,
      duration: archetype === "dust-skitter" ? 260 : archetype === "stonehide" ? 520 : 400,
      ease: archetype === "dust-skitter" ? "Cubic.easeOut" : "Back.Out"
    });

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
    let studioRig = null;
    if (studioMonster?.rigProfile && studioMonster.rigPartTextures) {
      try {
        studioRig = createPhaserSkeletalRig(this, studioMonster.rigProfile, studioMonster.rigPartTextures);
        const canvas = studioRig.profile.canvas;
        studioRig.root.setPosition(-canvas.width / 2, -canvas.height);
        studioRig.root.setScale(0.918 * 360 / canvas.width, 0.918 * 298 / canvas.height);
        view.add(studioRig.root);
        view.setData("studioSkeletalRig", studioRig);
        const idleClip = resolveSkeletalIdleClip(studioRig.profile) || studioRig.profile.clips[0];
        if (idleClip) this.playStudioSkeletalRig(studioRig, idleClip.id);
      } catch (error) {
        console.warn("Studio monster skeletal rig unavailable; preserving Sprite Sheet fallback:", studioMonster.id, error);
        studioRig = null;
      }
    }
    const customMonsterTexture = studioMonster?.textureKey;
    const customMonsterIdleFrame = String(studioMonster?.animationProfile?.idle?.startFrame ?? 0);
    const hyenaSprite = studioRig ? null : customMonsterTexture && this.textures.exists(customMonsterTexture)
      ? this.add.sprite(0, 0, customMonsterTexture, customMonsterIdleFrame).setOrigin(0.5, 1).setFlipX(true).setScale(0.918)
      : this.hyenaAnimationsReady
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
      if (studioMonster) {
        const idleKey = "studio-monster-" + studioMonster.id + "-idle";
        if (this.anims.exists(idleKey)) hyenaSprite.play(idleKey);
        hyenaSprite.on("animationcomplete", (animation) => {
          if (!monsterRecord || !monsterRecord.alive) return;
          if (animation.key === "studio-monster-" + studioMonster.id + "-attack") this.playHyenaAnimation(monsterRecord, "hyena-idle", true);
        });
      } else {
        hyenaSprite.play("hyena-idle");
        hyenaSprite.on("animationcomplete", (animation) => {
          if (!monsterRecord || !monsterRecord.alive) return;
          if (animation.key === "hyena-bite" || animation.key === "hyena-hit") this.playHyenaAnimation(monsterRecord, "hyena-idle", true);
        });
      }
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
      studioMonster,
      studioRig,
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
      attackCooldown: 0, freezeRemainingMs: 0, freezeStage: 0, freezeFrameIndex: 0,
      freezeFullHoldMs: 0, freezeRecoveryMs: 0, iceBiteCooldownMs: 3600, frozenTextureKey: null,
      frozenAnimationKey: null, frozenSpriteSize: null, alive: true, view, dustTimer: 0,
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
    // A living hyena directly behind a fully frozen friend stops to chew the
    // ice. Each bite removes one freeze layer at the Snow Thrower's 3.6s rate.
    const iceEaters = new Map();
    for (const frozen of this.monsters) {
      if (!frozen.alive || frozen.freezeStage < 1) continue;
      const eater = this.monsters
        .filter((candidate) => candidate.alive && candidate !== frozen &&
          candidate.freezeStage === 0 && candidate.row === frozen.row &&
          candidate.localX > frozen.localX &&
          candidate.localX - frozen.localX <= 92)
        .sort((a, b) => a.localX - b.localX)[0];
      if (eater) iceEaters.set(eater, frozen);
    }

    for (const [eater, frozen] of iceEaters) {
      eater.isEatingIce = true;
      eater.iceTargetId = frozen.combatId;
      eater.attackCooldown = 0;
      if (eater.hyenaSprite?.active || eater.studioRig) this.playHyenaAnimation(eater, "hyena-bite");
      frozen.iceBiteCooldownMs = (frozen.iceBiteCooldownMs ?? 0) - delta;
      if (frozen.iceBiteCooldownMs <= 0) {
        frozen.freezeStage = Math.max(0, frozen.freezeStage - 1);
        frozen.freezeFrameIndex = frozen.freezeStage > 0 ? (frozen.freezeStage - 1) * 2 : 0;
        if (frozen.hyenaSprite?.active && frozen.frozenTextureKey) {
          frozen.hyenaSprite.setFrame(String(frozen.freezeFrameIndex));
        }
        frozen.iceBiteCooldownMs = 3600;
        if (frozen.freezeStage === 0) {
          this.restoreMonsterAfterFreeze(frozen);
          frozen.iceBiteCooldownMs = 0;
        } else {
          // Friend-assisted thawing replaces the normal 30s hold and slow melt.
          frozen.freezeFullHoldMs = 0;
          frozen.freezeRecoveryMs = 0;
        }
      }
    }

    for (const monster of this.monsters) {
      if (!monster.alive) continue;
      if (!iceEaters.has(monster)) {
        monster.isEatingIce = false;
        monster.iceTargetId = null;
      }
      if (monster.isEatingIce) continue;
      if (monster.freezeStage > 0) {
        if (monster.freezeStage >= 5 && !iceEaters.size) {
          if (monster.freezeFullHoldMs > 0) {
            monster.freezeFullHoldMs = Math.max(0, monster.freezeFullHoldMs - delta);
            if (monster.freezeFullHoldMs === 0) monster.freezeRecoveryMs = 10000;
          } else if (monster.freezeRecoveryMs > 0) {
            monster.freezeRecoveryMs -= delta;
            if (monster.freezeRecoveryMs <= 0) {
              // Thaw one atlas frame at a time, walking backwards from frame 9.
              monster.freezeFrameIndex = Math.max(0, (monster.freezeFrameIndex ?? 8) - 1);
              if (monster.hyenaSprite?.active) monster.hyenaSprite.setFrame(String(monster.freezeFrameIndex));
              if (monster.freezeFrameIndex > 0) monster.freezeRecoveryMs = 10000;
              else {
                monster.freezeStage = 0;
                this.restoreMonsterAfterFreeze(monster);
              }
            }
          }
        }
        if (monster.freezeStage > 0) continue;
      }
      monster.attackCooldown = advanceCooldown(monster.attackCooldown, delta);
      if (monster.hyenaSprite && !this.gameOver) {
        monster.voiceCooldown -= delta;
        if (monster.voiceCooldown <= 0) {
          if (Math.random() < 0.42) this.playHyenaVoice(Math.random() < 0.58 ? "laugh" : "growl", 0.38);
          monster.voiceCooldown = PhaserMath.Between(6500, 12500);
        }
      }
      // Every living plant blocks monsters in its own lane. A monster must
      // finish eating that plant before it can continue toward the farmhouse.
      const monsterHalfWidth = monster.hyenaSprite
        ? monster.hyenaSprite.width * monster.hyenaSprite.scaleX * monster.view.scaleX * 0.5
        : monster.view.getBounds().width * 0.5;
      const widestBlockingPlantHalfWidth = this.plants.reduce((widest, plant) => {
        if (!plant.alive || plant.row !== monster.row || !plant.view?.active) return widest;
        return Math.max(widest, plant.view.getBounds().width * 0.5);
      }, 0);
      // Include a plant that the monster has just crossed by a few pixels.
      // Without this overlap allowance, the strict "plant ahead" query drops
      // the blocker and the monster walks straight through it.
      const blocker = selectLaneBlocker({
        plants: this.plants.map((plant) => ({
          plant,
          localX: plant.alive && plant.row === monster.row
            ? this.worldToLane(plant).localX
            : null
        })),
        row: monster.row,
        monsterLocalX: monster.localX,
        maxOvershoot: monsterHalfWidth + widestBlockingPlantHalfWidth + 10
      });
      const blockerLocalX = blocker ? this.worldToLane(blocker).localX : -Infinity;
      // Calculate a real visual clearance from both rendered bounds, then
      // convert screen pixels back into this lane's local movement units.
      const lanePixelStep = blocker
        ? Math.abs(this.monsterLanePoint(blockerLocalX + 1, monster.row).x -
          this.monsterLanePoint(blockerLocalX, monster.row).x)
        : 1;
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
        // Align the monster's visual center with the plant while chewing,
        // instead of freezing with its head at the plant's outer edge.
        monster.localX = blockerLocalX;
        const bitePosition = this.monsterLanePoint(monster.localX, monster.row);
        monster.x = bitePosition.x;
        monster.y = bitePosition.y;
        monster.view.setPosition(bitePosition.x, bitePosition.y);
        if (monster.hyenaSprite?.active) monster.hyenaSprite.y = jumpOffset;
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
        if ((monster.hyenaSprite || monster.studioRig) && monster.hitAnimUntil <= this.time.now) {
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
          const plantRig = blocker.view?.getData?.("studioSkeletalRig");
          if (monster.studioRig && plantRig && !this.studioRigHitboxesOverlap(monster.studioRig, monster.view, plantRig, blocker.view)) continue;
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
        const jumpWillStart = !monster.isJumping && monster.jumpCooldown - delta <= 0;
        const jumpWillLand = monster.isJumping && monster.jumpElapsed + delta >= monster.jumpDuration;
        const burstWillStart = monster.burstCooldown - delta <= 0 && monster.burstRemaining <= 0;
        const motion = resolveDustSkitterMotionStep({
          isJumping: monster.isJumping,
          jumpCooldownMs: monster.jumpCooldown,
          jumpElapsedMs: monster.jumpElapsed,
          jumpDurationMs: monster.jumpDuration,
          deltaMs: delta,
          jumpSpeedMultiplier: profile.jumpSpeedMultiplier,
          jumpVisualHeight: 34,
          visualScale: monster.view.scaleY,
          nextJumpDurationMs: jumpWillStart
            ? this.simulationRandom.nextInt(profile.jumpDurationMinMs, profile.jumpDurationMaxMs)
            : null,
          nextJumpResetCooldownMs: jumpWillLand
            ? this.simulationRandom.nextInt(profile.jumpResetCooldownMinMs, profile.jumpResetCooldownMaxMs)
            : null,
          burstCooldownMs: monster.burstCooldown,
          burstRemainingMs: monster.burstRemaining,
          burstDurationMs: profile.burstDurationMs,
          burstSpeedMultiplier: profile.burstSpeedMultiplier,
          nextBurstCooldownMs: burstWillStart
            ? this.simulationRandom.nextInt(profile.burstCooldownMinMs, profile.burstCooldownMaxMs)
            : null,
          enableJump: true
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
      if ((monster.hyenaSprite || monster.studioRig) && monster.hitAnimUntil <= this.time.now) {
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

  freezeMonster(monster) {
    if (!monster?.alive || monster.freezeStage >= 5) return false;
    const wasAlreadyFrozen = (monster.freezeStage || 0) > 0;
    monster.freezeStage = Math.min(5, (monster.freezeStage || 0) + 1);
    monster.braced = false;
    monster.isEating = false;
    if (monster.view?.active) this.tweens.killTweensOf(monster.view);
    if (monster.braceCue?.active) monster.braceCue.setVisible(false);
    const sprite = monster.hyenaSprite;
    if (monster.studioRig && !wasAlreadyFrozen) {
      const rig = monster.studioRig;
      monster.frozenAnimationKey = rig._activeClipId || "move";
      if (rig.profile.clips.some((clip) => clip.id === "frozen")) this.playStudioSkeletalRig(rig, "frozen");
      else this.stopStudioSkeletalRig(rig, true);
    }
    if (sprite?.active) {
      if (!monster.frozenTextureKey && !monster.studioMonster) {
        const preferred = this.wave >= 4 ? "frozen-hyena-level-2" : "frozen-hyena-level-1";
        const fallback = preferred === "frozen-hyena-level-2" ? "frozen-hyena-level-1" : "frozen-hyena-level-2";
        monster.frozenTextureKey = this.textures.exists(preferred) ? preferred : this.textures.exists(fallback) ? fallback : null;
        monster.frozenAnimationKey = sprite.anims.currentAnim?.key || (monster.kind === "dust-skitter" ? "hyena-run" : "hyena-walk");
        monster.frozenSpriteSize = { width: sprite.displayWidth, height: sprite.displayHeight };
      }
      if (monster.studioMonster && !monster.frozenAnimationKey) {
        monster.frozenAnimationKey = "hyena-idle";
        monster.frozenSpriteSize = { width: sprite.displayWidth, height: sprite.displayHeight };
      }
      sprite.stop();
      if (monster.frozenTextureKey) {
        sprite.setTexture(monster.frozenTextureKey);
        monster.freezeFrameIndex = (monster.freezeStage - 1) * 2;
        sprite.setFrame(String(monster.freezeFrameIndex));
        sprite.setOrigin(0.5, 1);
        if (monster.frozenSpriteSize?.width > 0 && monster.frozenSpriteSize?.height > 0) sprite.setDisplaySize(monster.frozenSpriteSize.width, monster.frozenSpriteSize.height);
        sprite.clearTint();
      } else if (monster.studioMonster) {
        sprite.setTint(0x9feaff);
      }
    }
    if (monster.freezeStage === 5) {
      monster.freezeFullHoldMs = 30000;
      monster.freezeRecoveryMs = 0;
      this.setMessage("The hyena is completely frozen. It will begin thawing in 30 seconds.");
    } else this.setMessage("SNOW HIT! Freeze stage " + monster.freezeStage + " of 5.");
    return true;
  }

  restoreMonsterAfterFreeze(monster) {
    const sprite = monster?.hyenaSprite;
    if (monster?.studioRig) {
      const rig = monster.studioRig;
      const restoreClip = rig.profile.clips.find((clip) => clip.id === monster.frozenAnimationKey)?.id
        || rig.profile.clips.find((clip) => clip.id === "move")?.id
        || resolveSkeletalIdleClip(rig.profile)?.id
        || rig.profile.clips[0]?.id;
      if (restoreClip) this.playStudioSkeletalRig(rig, restoreClip);
    }
    if (sprite?.active) {
      sprite.setTint(monster.tierTint ?? 0xffffff);
      sprite.setScale(0.918);
      sprite.setOrigin(0.5, 1);
      this.playHyenaAnimation(monster, monster.frozenAnimationKey || (monster.kind === "dust-skitter" ? "hyena-run" : "hyena-walk"), true);
    }
    if (monster.kind !== "dust-skitter" && monster.view?.active) {
      this.tweens.add({
        targets: monster.view, angle: { from: -2.5, to: 2.5 },
        duration: monster.combatProfile.wobbleDurationMs, ease: "Sine.easeInOut",
        yoyo: true, repeat: -1
      });
    }
    monster.frozenAnimationKey = null;
    monster.frozenSpriteSize = null;
    monster.frozenTextureKey = null;
    monster.freezeFullHoldMs = 0;
    monster.freezeRecoveryMs = 0;
    monster.freezeFrameIndex = 0;
    monster.freezeRemainingMs = 0;
  }

  updateProjectiles(dt) {
    for (const shot of this.projectiles) {
      if (!shot.alive) continue;
      const pineappleTarget = ["pineapple", "hazelnut", "mango"].includes(shot.plantType) &&
        shot.target?.alive && shot.target.row === shot.row &&
        shot.target.view?.active;
      if (["pineapple", "hazelnut", "mango"].includes(shot.plantType) && shot.dropPhase === "dropping" && !pineappleTarget) {
        shot.alive = false;
        shot.view.destroy();
        continue;
      }
      if (["pineapple", "hazelnut", "mango"].includes(shot.plantType) && shot.dropPhase === "dropping" && pineappleTarget) {
        // Follow the monster's live bounds while tracing a quadratic arc to
        // the top-center of its head, regardless of the monster's rendered size.
        const bounds = shot.target.view.getBounds();
        const endX = bounds.centerX;
        const endY = bounds.top - 0.5;
        const startX = shot.dropStartX;
        const startY = shot.dropStartY;
        const remainingDistance = Math.max(1, Math.hypot(endX - startX, endY - startY));
        shot.dropProgress = Math.min(1, shot.dropProgress + (shot.dropSpeed * dt) / remainingDistance);
        const t = shot.dropProgress;
        const controlX = (startX + endX) / 2;
        const arcHeight = Math.max(26, Math.min(82, Math.abs(endX - startX) * 0.16));
        const controlY = Math.min(startY, endY) - arcHeight;
        const inverseT = 1 - t;
        const nextX = inverseT * inverseT * startX + 2 * inverseT * t * controlX + t * t * endX;
        const nextY = inverseT * inverseT * startY + 2 * inverseT * t * controlY + t * t * endY;
        shot.view.setPosition(nextX, nextY);
        shot.localX = shot.target.localX;
        shot.trailTimer -= dt * 1000;
        if (shot.trailTimer <= 0) {
          this.createProjectileTrail(nextX - 5, nextY, shot.plantType);
          shot.trailTimer = 48;
        }
        if (t >= 1) {
          this.createProjectileImpact(endX, bounds.top, shot.plantType);
          this.playThornImpactSound();
          this.applyMonsterDamage(shot.target, shot.damage * this.incomingMonsterDamageMultiplier(shot.target), shot.plantType);
          this.damageMonsterIfNeeded(shot.target);
          shot.alive = false;
          shot.view.destroy();
        }
        continue;
      }

      const previousShotLocalX = shot.localX;
      shot.localX = resolveProjectileLaneStep({ localX: shot.localX, speed: shot.speed, deltaSeconds: dt });
      // Keep every projectile in its plant's original lane. Aim follows the
      // live target, while pineapple bombs switch to a vertical head drop.
      if (shot.target && shot.target.alive && shot.target.row === shot.row &&
          Number.isFinite(shot.target.localX)) {
        shot.targetLocalX = Math.max(shot.startLocalX + 1, shot.target.localX);
      }

      shot.currentRow = shot.row;
      const position = ["pineapple", "hazelnut", "mango", "snow-thrower"].includes(shot.plantType)
        ? this.pineappleLanePoint(shot.localX, shot.row)
        : this.lanePoint(shot.localX, shot.row);
      const studioProgress = shot.studioPlantId
        ? PhaserMath.Clamp((shot.localX - shot.startLocalX) / Math.max(1, shot.targetLocalX - shot.startLocalX), 0, 1)
        : 0;
      const studioOffset = shot.studioPlantId
        ? getProjectileTrajectoryOffset({type:shot.projectileTrajectoryType,progress:studioProgress,height:shot.projectileHeight,curveX:shot.projectileCurveX,curveY:shot.projectileCurveY,targetX:shot.projectileTargetOffsetX,targetY:shot.projectileTargetOffsetY,points:shot.projectilePathPoints})
        : {x:0,y:0};
      const launchPoint = getProjectileLaunchPoint({ laneX: position.x, laneY: position.y, offsetX: shot.launchOffsetX, offsetY: shot.launchOffsetY });
      let projectileX = launchPoint.x + studioOffset.x;
      let projectileY = launchPoint.y - studioOffset.y;

      // Studio-authored trajectories terminate at the live monster's head.
      // Preserve the authored curve, then progressively correct its endpoint
      // so the final frame lands exactly on the head instead of the lane center.
      let studioHeadTarget = null;
      if (shot.studioPlantId) {
        if (!shot.target?.alive || !shot.target.view?.active) {
          shot.alive = false;
          shot.view.destroy();
          continue;
        }
        const targetBounds = shot.target.view.getBounds();
        const headX = targetBounds.centerX;
        const headY = targetBounds.top + Math.min(24, targetBounds.height * 0.2);
        const targetLanePosition = ["pineapple", "hazelnut", "mango", "snow-thrower"].includes(shot.plantType)
          ? this.pineappleLanePoint(shot.targetLocalX, shot.row)
          : this.lanePoint(shot.targetLocalX, shot.row);
        const endOffset = getProjectileTrajectoryOffset({
          type: shot.projectileTrajectoryType,
          progress: 1,
          height: shot.projectileHeight,
          curveX: shot.projectileCurveX,
          curveY: shot.projectileCurveY,
          targetX: shot.projectileTargetOffsetX,
          targetY: shot.projectileTargetOffsetY,
          points: shot.projectilePathPoints
        });
        const targetLaunchPoint = getProjectileLaunchPoint({ laneX: targetLanePosition.x, laneY: targetLanePosition.y, offsetX: shot.launchOffsetX, offsetY: shot.launchOffsetY });
        const authoredEndX = targetLaunchPoint.x + endOffset.x;
        const authoredEndY = targetLaunchPoint.y - endOffset.y;
        const headCorrection = getProjectileHeadCorrection({
          progress: studioProgress,
          targetX: headX,
          targetY: headY,
          trajectoryEndX: authoredEndX,
          trajectoryEndY: authoredEndY
        });
        projectileX += headCorrection.x;
        projectileY += headCorrection.y;
        studioHeadTarget = { x: headX, y: headY, progress: studioProgress };
      }
      let trailPositionY = projectileY;

      // Give the outgoing pineapple bomb a smooth launch arc. Progress is
      // measured along its lane, while the arc height adapts to travel distance.
      if (["pineapple", "hazelnut", "mango"].includes(shot.plantType) && pineappleTarget) {
        const targetBounds = shot.target.view.getBounds();
        const travelSpan = Math.max(1, shot.targetLocalX - shot.startLocalX);
        const arcProgress = Phaser.Math.Clamp((shot.localX - shot.startLocalX) / travelSpan, 0, 1);
        const launchPosition = this.pineappleLanePoint(shot.startLocalX, shot.row);
        const launchScreenX = launchPosition.x + (shot.launchOffsetX || 0);
        const launchScreenY = launchPosition.y + (shot.launchOffsetY || 0);
        const arcHeight = Math.max(34, Math.min(90, Math.abs(targetBounds.centerX - launchScreenX) * 0.18));
        const arcedY = projectileY - Math.sin(Math.PI * arcProgress) * arcHeight;
        trailPositionY = arcedY;
        if (projectileX >= targetBounds.centerX - 4) {
          shot.dropPhase = "dropping";
          shot.dropStartX = projectileX;
          shot.dropStartY = arcedY;
          shot.dropProgress = 0;
          shot.view.setPosition(projectileX, arcedY);
          continue;
        }
        shot.view.setPosition(projectileX, arcedY);
      } else {
        shot.view.setPosition(projectileX, projectileY);
      }

      if (studioHeadTarget && studioHeadTarget.progress >= 1) {
        shot.view.setPosition(studioHeadTarget.x, studioHeadTarget.y);
        this.createProjectileImpact(studioHeadTarget.x, studioHeadTarget.y, shot.plantType, shot.projectileEffectColor);
        this.playThornImpactSound();
        this.applyMonsterDamage(
          shot.target,
          shot.damage * this.incomingMonsterDamageMultiplier(shot.target),
          shot.plantType
        );
        this.damageMonsterIfNeeded(shot.target);
        shot.alive = false;
        shot.view.destroy();
        continue;
      }

      shot.trailTimer -= dt * 1000;
      if (shot.trailTimer <= 0) {
        this.createProjectileTrail(projectileX - 5, trailPositionY, shot.plantType, shot.projectileEffectColor);
        shot.trailTimer = 48;
      }

      // Studio-authored shots are resolved only at their authored head endpoint;
      // do not let the legacy lane-radius collision detonate them against the torso.
      if (shot.studioPlantId) continue;

      // A Radish projectile can damage monsters in its own lane only.
      let hit = null;
      let firstSnowHitLocalX = Infinity;
      const projectileCandidates = this.monsters.filter((monster) =>
        monster?.alive &&
        monster.row === shot.row &&
        Number.isFinite(monster.localX) &&
        this.studioProjectileHitsMonster(shot, monster, projectileX, projectileY)
      );
      if (shot.freeze) {
        // Snow shots travel toward increasing lane X. Test the whole swept
        // segment so a fast frame cannot skip a hyena between two positions.
        // If it crosses more than one, freeze the first one along the path.
        for (const monster of projectileCandidates) {
          if (monster.freezeStage >= 5) continue;
          const hitRadius = (shot.collisionRadius || PHASE_ONE_PLANTS.radish.projectileCollisionRadius) * (monster.widthScale || 1);
          const sweptStart = previousShotLocalX - hitRadius;
          const sweptEnd = shot.localX + hitRadius;
          if (monster.localX < sweptStart || monster.localX > sweptEnd ||
              monster.localX >= firstSnowHitLocalX) continue;
          hit = monster;
          firstSnowHitLocalX = monster.localX;
        }
      } else {
        hit = selectProjectileTarget({
          monsters: projectileCandidates,
          row: shot.row,
          localX: shot.localX,
          collisionRadius: shot.collisionRadius || PHASE_ONE_PLANTS.radish.projectileCollisionRadius
        });
      }

      if (hit) {
        if (shot.freeze) {
          this.createFreezeImpact(projectileX, projectileY, shot.plantType);
          this.freezeMonster(hit);
          shot.alive = false;
          shot.view.destroy();
          continue;
        }
        this.createProjectileImpact(projectileX, projectileY, shot.plantType, shot.projectileEffectColor);
        this.playThornImpactSound();
        this.applyMonsterDamage(
          hit, shot.damage * this.incomingMonsterDamageMultiplier(hit), shot.plantType
        );
        if (hit.view && hit.view.active) {
          this.tweens.add({
            targets: hit.view,
            x: hit.view.x - 3,
            duration: 65,
            yoyo: true,
            ease: "Sine.easeOut"
          });
          this.createStoneHitDust(projectileX, projectileY + 4, hit.view.scaleY);
        }
        this.damageMonsterIfNeeded(hit);
        shot.alive = false;
        shot.view.destroy();
        continue;
      }

      if (shot.localX > shot.targetLocalX + (shot.collisionRadius || PHASE_ONE_PLANTS.radish.projectileCollisionRadius) ||
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

  createMonsterDefeatMotes(monster) {
    const bounds = monster?.view?.getBounds?.();
    if (!bounds) return;
    const x = bounds.centerX;
    const y = bounds.centerY;
    const depth = (monster.view.depth ?? 0) + 5;
    const colors = [0xb9e879, 0xe6d98a, 0xffd477, 0xf4efc0];
    const count = 8;

    // Gentle upward-drifting motes replace the fiery death explosion.
    for (let i = 0; i < count; i += 1) {
      const startX = x + (Math.random() - 0.5) * bounds.width * 0.48;
      const startY = y + (Math.random() - 0.5) * bounds.height * 0.28;
      const mote = this.add.circle(
        startX,
        startY,
        1.2 + Math.random() * 1.2,
        colors[i % colors.length],
        0.78
      );
      mote.setDepth(depth);
      this.tweens.add({
        targets: mote,
        x: startX + (Math.random() - 0.5) * 22,
        y: startY - 18 - Math.random() * 22,
        alpha: 0,
        scale: 0.25,
        duration: 480 + Math.random() * 220,
        delay: i * 24,
        ease: "Sine.easeOut",
        onComplete: () => mote.destroy()
      });
    }
  }

  flashMonsterOnHit(monster, plantType = "radish") {
    if (!monster || !monster.alive || monster.freezeStage > 0) return;

    // Keep the monster artwork unchanged. A restrained projectile-colored
    // glow traces only its silhouette; recoil and squash are reduced by half.
    const sprite = monster.hyenaSprite;
    const hitColor = getProjectileVFXProfile(plantType)?.tint ?? 0x9bdc72;
    const reaction = getMonsterReactionProfile(monster.kind);
    if (sprite?.active || monster.studioRig?.root?.active) {
      monster.hitAnimUntil = this.time.now + reaction.hitDurationMs;
      this.playHyenaAnimation(monster, monster.studioRig ? "hyena-hit" : "hyena-idle", true);

      if (sprite?.active) {
        if (monster.hitGlowEffect && sprite.postFX?.remove) {
          sprite.postFX.remove(monster.hitGlowEffect);
          monster.hitGlowEffect = null;
        }
        if (sprite.postFX?.addGlow) {
          monster.hitGlowEffect = sprite.postFX.addGlow(hitColor, reaction.glowRadius, 0, false, 0.1, 12);
        }
        this.tweens.killTweensOf(sprite);
        const baseX = Number.isFinite(monster.hitRecoilBaseX) ? monster.hitRecoilBaseX : sprite.x;
        monster.hitRecoilBaseX = baseX;
        sprite.x = baseX;
        sprite.setScale(0.918);
        this.tweens.add({
          targets: sprite,
          x: baseX + reaction.recoilPx,
          scaleX: reaction.squashX,
          scaleY: reaction.squashY,
          duration: Math.max(45, Math.round(reaction.hitDurationMs * 0.32)),
          ease: "Quad.easeOut",
          yoyo: true,
          onComplete: () => {
            if (sprite.active) {
              sprite.x = baseX;
              sprite.setScale(0.918);
            }
          }
        });
      }
    }

    const graphic = monster.hitFlashGraphic;
    if (graphic?.active) graphic.setBlendMode(1);

    if (monster.hitFlashTimer) monster.hitFlashTimer.remove(false);
    monster.hitFlashTimer = this.time.delayedCall(150, () => {
      if (sprite?.active) {
        if (monster.hitGlowEffect && sprite.postFX?.remove) {
          sprite.postFX.remove(monster.hitGlowEffect);
          monster.hitGlowEffect = null;
        }
        if (Number.isFinite(monster.hitRecoilBaseX)) sprite.x = monster.hitRecoilBaseX;
        sprite.setScale(0.918);
      }
      if (graphic?.active) graphic.setBlendMode(0);
      monster.hitFlashTimer = null;
    });
  }

  applyMonsterDamage(monster, amount, plantType = "radish") {
    if (!monster || !monster.alive || amount <= 0) return;
    monster.hp = applyHitPointsDamage(monster.hp, amount).hp;
    this.playMonsterHitSound();
    if (monster.hyenaSprite) this.playHyenaVoice("yelp", 0.82);
    this.flashMonsterOnHit(monster, plantType);
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
    this.createMonsterDefeatMotes(monster);
    this.playMonsterDefeatSound();
    if (monster.hyenaSprite) this.playHyenaVoice("yelp", 0.88);
    this.playCoinRewardSound();
    // Play the authored death sequence before removing the creature. The
    // reward and wave counters are still granted immediately and exactly once.
    if (monster.view && monster.view.active) {
      this.tweens.killTweensOf(monster.view);
      if ((monster.hyenaSprite && monster.hyenaSprite.active) || monster.studioRig?.root?.active) {
        this.playHyenaAnimation(monster, "hyena-death", true);
        this.tweens.add({
          targets: monster.view,
          alpha: 0,
          scale: (monster.view.scaleX || 1) * 0.82,
          duration: 760,
          delay: 120,
          ease: "Cubic.easeIn",
          onComplete: () => {
            if (monster.view && monster.view.active) monster.view.destroy(true);
          }
        });
      } else {
        this.tweens.add({
          targets: monster.view,
          alpha: 0,
          scale: (monster.view.scaleX || 1) * 0.82,
          duration: 430,
          ease: "Cubic.easeIn",
          onComplete: () => {
            if (monster.view && monster.view.active) monster.view.destroy(true);
          }
        });
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
      pumpkin: "The pumpkin guard has been destroyed!",
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
      // Stage one owns the dragon rescue encounter; other configured stages end after their waves.
      if (this.stageNumber !== 1) {
        this.endGame(true);
        return;
      }
      // The dragon is a separate boss and is never included in ordinary wave counts.
      if (!this.dragonBoss) {
        this.beginDragonEncounter();
        return;
      }
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
    this.waveSize = this.getStageWaveSize(this.wave);
    const nextStageMonster = this.getStageMonsterEntry(0);
    this.waveIntermissionMs = PHASE_ONE_TIMING.waveIntermissionMs;
    this.spawnTimer = this.stageMonsterRosterConfigured && nextStageMonster ? Math.max(0, Number(nextStageMonster.firstSpawnDelayMs) || 0) : PHASE_ONE_TIMING.nextWaveSpawnDelayMs;
    this.setMessage(
      "Wave " + clearedWave + " cleared. Prepare for wave " + this.wave +
      ": " + this.waveSize + " monsters in 5 seconds."
    );
    this.showWaveAnnouncement(this.wave);
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
    won = Boolean(won && (this.stageNumber !== 1 || this.phaseOneStoryState === "complete"));
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
    if (won && this.stageNumber === 1) {
      try {
        unlockNextStage(window.localStorage, 1);
        unlockPlantReward(window.localStorage, 1);
      } catch {
        // The victory remains valid even if local progression storage is unavailable.
      }
    }
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
      this.add.text(560, 355, locale === "ar" ? "تم فتح المرحلة الثانية ونبتة Pumpkin!" : "STAGE 2 + PUMPKIN UNLOCKED!", {
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
      "🪙 " + this.coins,
      this.houseHealth + "%",
      "🌱 " + this.livingPlantCount(),
      "👾 " + this.totalDefeatedMonsters + "/" + this.totalConfiguredMonsters,
    ];
    if (this.energyValueText) this.energyValueText.setText(String(this.energy));
    if (this.hudValueTexts) {
      this.hudValueTexts.forEach((text, index) => text.setText(values[index]));
    }
    if (this.waveText) {
      this.waveText.setText(Math.min(this.wave, this.totalWaves) + "/" + this.totalWaves);
    }
    if (this.waveProgressFill && this.waveProgressTrack) {
      // Progress reflects defeated enemies, not merely how many have spawned.
      const defeated = Math.min(this.waveDefeatedMonsters || 0, this.waveSize);
      const progress = this.waveSize > 0 ? PhaserMath.Clamp(defeated / this.waveSize, 0, 1) : 0;
      const trackWidth = 158;
      const fillWidth = Math.max(2, trackWidth * progress);
      this.waveProgressFill.setDisplaySize(fillWidth, 10);
      this.waveProgressMarker?.setX(731 + trackWidth * progress);
      this.waveProgressLabel?.setText("DEFEATED " + defeated + "/" + this.waveSize);
    }
    for (const [type, panel] of Object.entries(this.plantCardsByType || {})) {
      const remaining = this.getSeedPacketCooldownRemaining(type);
      const overlay = panel.getData("cooldownOverlay");
      const label = panel.getData("cooldownLabel");
      if (overlay?.active) overlay.setVisible(remaining > 0);
      if (label?.active) {
        label.setVisible(remaining > 0);
        if (remaining > 0) label.setText(String(Math.ceil(remaining / 1000)));
      }
    }
  }
}
