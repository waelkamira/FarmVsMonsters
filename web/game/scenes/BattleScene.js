import { Scene, Input, Math as PhaserMath } from "phaser";

const LANES = 5;
const COLUMNS = 8;
// The generated background already contains a perspective 8 × 5 planting board.
 // These four corners follow the visible outer seams in the uploaded 1080 × 576 art,
 // mapped to the aspect-preserving 1120 × 597.33 background inside the 1120 × 680 view.
const GRID_CORNERS = {
  tl: { x: 388, y: 360 },
  tr: { x: 824, y: 362 },
  br: { x: 887, y: 578 },
  bl: { x: 259, y: 579 },
};
const GRID_WIDTH = 600;
const GRID_HEIGHT = 230;
const GRID_CENTER_X = 560;
const GRID_CENTER_Y = 469.5;
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
    this.laneYs = Array.from({ length: LANES }, (_, row) => this.gridToWorld(0, row).y);
    this.emergencyMode = false;
    this.hasPlantedDefender = false;
    this.facing = 1;
    this.plantingTarget = null;
    this.gameOver = false;

    this.drawField();
    this.createFarmBackground();
    this.drawPlantingGrid();
    this.createHud();
    this.createCaveman();
    this.bindInput();
    this.refreshHud();
    this.setMessage(this.textures.exists("farm-battlefield")
      ? "Choose the radish icon, then click an empty soil cell."
      : "Temporary farm art active. Add farm-battlefield.jpeg when your background is ready.");
  }

  drawField() {
    const g = this.add.graphics().setDepth(-10);
    g.fillGradientStyle(0xb9d98a, 0xb9d98a, 0x8dbb69, 0x8dbb69, 1);
    g.fillRect(0, 0, 1120, 680);
    g.fillStyle(0x8a603b, 1); g.fillRoundedRect(185, 115, 690, 500, 24);
    g.fillStyle(0x9c7047, 1); g.fillRoundedRect(195, 125, 670, 480, 18);
    for (let row = 0; row < LANES; row += 1) {
      const y = GRID_TOP + row * CELL_H;
      g.fillStyle(row % 2 === 0 ? 0xb88b5b : 0xad8050, 1);
      g.fillRoundedRect(GRID_LEFT - 8, y, COLUMNS * CELL_W, CELL_H - 5, 8);
      for (let col = 0; col < COLUMNS; col += 1) {
        g.lineStyle(2, 0xe4c18b, 0.65);
        g.strokeRoundedRect(GRID_LEFT + col * CELL_W, y, CELL_W - 3, CELL_H - 7, 7);
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

  // Bilinear mapping onto the actual perspective board painted into the background.
  // u and v are normalized board coordinates: 0..1 across columns and lanes.
  boardPoint(u, v) {
    const { tl, tr, br, bl } = GRID_CORNERS;
    return {
      x: (1-u)*(1-v)*tl.x + u*(1-v)*tr.x + u*v*br.x + (1-u)*v*bl.x,
      y: (1-u)*(1-v)*tl.y + u*(1-v)*tr.y + u*v*br.y + (1-u)*v*bl.y,
    };
  }

  boardCoordinates(x, y) {
    // Newton iteration inverts the bilinear mapping, including its perspective skew.
    let u = PhaserMath.Clamp((x - GRID_CORNERS.bl.x) / GRID_WIDTH, 0, 1);
    let v = PhaserMath.Clamp((y - GRID_CORNERS.tl.y) / GRID_HEIGHT, 0, 1);
    for (let i = 0; i < 8; i += 1) {
      const p = this.boardPoint(u, v);
      const du = this.boardPoint(u + 0.001, v);
      const dv = this.boardPoint(u, v + 0.001);
      const ax = (du.x - p.x) / 0.001;
      const ay = (du.y - p.y) / 0.001;
      const bx = (dv.x - p.x) / 0.001;
      const by = (dv.y - p.y) / 0.001;
      const ex = x - p.x;
      const ey = y - p.y;
      const det = ax * by - bx * ay;
      if (Math.abs(det) < 0.0001) break;
      u = PhaserMath.Clamp(u + (ex * by - ey * bx) / det, -0.2, 1.2);
      v = PhaserMath.Clamp(v + (ey * ax - ex * ay) / det, -0.2, 1.2);
    }
    return { u, v };
  }

  gridToWorld(col, row, offsetX = 0, offsetY = 0) {
    return this.boardPoint(
      (col + offsetX / CELL_W) / COLUMNS,
      (row + offsetY / CELL_H) / LANES,
    );
  }

  worldToGrid(x, y) {
    const { u, v } = this.boardCoordinates(x, y);
    return { col: Math.floor(u * COLUMNS), row: Math.floor(v * LANES) };
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
    // The cell grid is already painted into the background. Do not draw a duplicate.
    // Pointer hit-testing uses boardCoordinates() against these same four corners.
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
    if (!this.plantingTarget && (dx !== 0 || dy !== 0)) {
      this.caveman.x = PhaserMath.Clamp(this.caveman.x + dx * 170 * dt, 105, 1010);
      this.caveman.y = PhaserMath.Clamp(this.caveman.y + dy * 170 * dt, this.laneYs[0] - 22, this.laneYs[LANES - 1] + 22);
      if (dx !== 0) this.facing = Math.sign(dx);
      this.caveman.scaleX = this.facing;
    }
    this.updatePlantingMovement(dt);
    if (Input.Keyboard.JustDown(this.keys.space)) {
      if (this.livingPlantCount() > 0) this.setMessage("The radishes are alive and defending. The caveman cannot fight yet.");
      else if (this.hasPlantedDefender) this.clubAttack();
      else this.setMessage("Plant a radish first. The caveman's club is an emergency defense only.");
    }
  }

  requestPlant(col, row) {
    if (!this.selectedPlant) { this.setMessage("Choose the radish icon first."); return; }
    if (this.plantingTarget) { this.setMessage("The caveman is already on his way to a planting spot."); return; }
    if (this.plants.some((p) => p.alive && p.col === col && p.row === row)) { this.setMessage("That soil cell is occupied."); return; }
    if (this.energy < RADISH.cost) { this.setMessage("Not enough energy to plant a radish."); return; }
    const { x, y } = this.gridToWorld(col, row, CELL_W / 2, CELL_H / 2);
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

  plantRadish(col, row) {
    if (this.energy < RADISH.cost || this.plants.some((p) => p.alive && p.col === col && p.row === row)) {
      this.setMessage("Planting cancelled: this cell is no longer available."); return;
    }
    this.energy -= RADISH.cost;
    this.hasPlantedDefender = true;
    const { x, y } = this.gridToWorld(col, row, CELL_W / 2, CELL_H / 2);
    this.plants.push({
      type: "radish", col, row, x, y, hp: RADISH.hp, alive: true,
      cooldown: PhaserMath.Between(250, 650), view: this.drawRadish(x, y)
    });
    this.updateEmergencyMode();
    this.tweens.add({ targets: this.caveman, scaleY: 0.82, duration: 120, yoyo: true });
    this.setMessage("The caveman planted a radish! It is rooted in place and will defend this lane.");
  }

  drawRadish(x, y) {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x4b8c45, 1); g.fillEllipse(0, -39, 27, 30);
    g.fillStyle(0x3e783b, 1);
    g.fillTriangle(-9, -51, -18, -72, -2, -57);
    g.fillTriangle(0, -52, 10, -74, 13, -51);
    g.fillStyle(0xc83e45, 1); g.fillTriangle(-24, -34, 24, -34, 0, 24);
    g.fillStyle(0xf5d8b6, 1); g.fillEllipse(0, -30, 29, 17);
    g.fillStyle(0x2a3026, 1); g.fillCircle(-8, -31, 3); g.fillCircle(8, -31, 3);
    g.lineStyle(2, 0x63332f, 1); g.beginPath(); g.arc(0, -24, 7, 0.2, Math.PI - 0.2); g.strokePath();
    g.fillStyle(0x3f7f3c, 1); g.fillEllipse(-22, -8, 18, 9); g.fillEllipse(22, -8, 18, 9);
    c.add(g); c.setDepth(10);
    this.tweens.add({ targets: c, scaleY: 1.035, duration: 1350, ease: "Sine.easeInOut", yoyo: true, repeat: -1 });
    return c;
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

  fireThorn(plant, target) {
    const view = this.add.triangle(plant.x + 20, plant.y - 22, -7, 5, 7, 0, -7, -5, 0xf0e2ad);
    view.setStrokeStyle(2, 0x456b35);
    this.projectiles.push({ view, x: plant.x + 20, y: plant.y - 22, target, speed: 320, damage: 25, alive: true });
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
        if (monster.attackCooldown <= 0) {
          this.houseHealth = Math.max(0, this.houseHealth - 8); monster.attackCooldown = 1250;
          if (this.houseHealth <= 0) this.endGame(false);
        }
        continue;
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
      if (!shot.target || !shot.target.alive) { shot.alive = false; shot.view.destroy(); continue; }
      const dx = shot.target.x - shot.x; const dy = shot.target.y - 22 - shot.y;
      const distance = Math.hypot(dx, dy); const step = shot.speed * dt;
      if (distance <= step + 12) {
        shot.target.hp -= shot.damage; this.damageMonsterIfNeeded(shot.target);
        shot.alive = false; shot.view.destroy();
      } else {
        shot.x += dx / distance * step; shot.y += dy / distance * step; shot.view.setPosition(shot.x, shot.y);
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.alive);
  }

  damageMonsterIfNeeded(monster) {
    if (monster.hp > 0 || !monster.alive) return;
    monster.alive = false; monster.view.destroy(); this.energy = Math.min(300, this.energy + 8);
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
    const local = this.worldToLane({ x: this.caveman.x, y });
    return PhaserMath.Clamp(Math.floor((local.localY + LANES * CELL_H / 2) / CELL_H), 0, LANES - 1);
  }

  checkWaveProgress() {
    if (this.spawnedThisWave >= this.waveSize && this.monsters.length === 0) {
      this.wave += 1; this.spawnedThisWave = 0; this.spawnTimer = 3200;
      this.waveSize = Math.min(12, 5 + this.wave);
      this.setMessage("Wave " + (this.wave - 1) + " cleared. More monsters are approaching.");
    }
  }

  endGame(won) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.setMessage(won ? "VICTORY! The farm is safe." : "DEFEAT! The farmhouse has fallen.");
    this.add.rectangle(560, 340, 520, 150, 0x263c2b, 0.94).setStrokeStyle(3, 0xe4d5a5).setDepth(60);
    this.add.text(560, 340, won ? "VICTORY" : "FARM LOST", {
      fontFamily: "Arial", fontSize: "42px", color: "#fff2c8", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(61);
  }

  setMessage(message) { this.messageText.setText(message); }

  refreshHud() {
    this.hudText.setText("ENERGY  " + this.energy + "     HOUSE  " + this.houseHealth + "%     RADISHES  " + this.livingPlantCount());
    this.waveText.setText("WAVE " + this.wave + (this.emergencyMode ? "  ·  EMERGENCY" : ""));
  }
}
