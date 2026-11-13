import Phaser from "phaser";

const LANES = 5;
const COLUMNS = 8;
const GRID_LEFT = 225;
const GRID_TOP = 150;
const CELL_W = 82;
const CELL_H = 94;
const HOME_X = 118;
const SPAWN_X = 1090;

const PLANT_TYPES = {
  cactus: { label: "Cactus", cost: 50, hp: 100, cooldown: 1650, range: 390 },
  punch: { label: "Punchroot", cost: 65, hp: 145, cooldown: 1150, range: 92 },
  sunflower: { label: "Sunflower", cost: 45, hp: 85, cooldown: 0, range: 0 }
};

export default class BattleScene extends Phaser.Scene {
  constructor() {
    super("BattleScene");
  }

  create() {
    this.energy = 150;
    this.houseHealth = 100;
    this.wave = 1;
    this.spawnedThisWave = 0;
    this.waveSize = 7;
    this.spawnTimer = 1200;
    this.energyTimer = 0;
    this.selectedPlant = "cactus";
    this.plants = [];
    this.monsters = [];
    this.projectiles = [];
    this.laneYs = Array.from({ length: LANES }, (_, row) => GRID_TOP + row * CELL_H + CELL_H / 2);
    this.emergencyMode = false;
    this.hasPlantedDefender = false;
    this.facing = 1;

    this.drawField();
    this.createHud();
    this.createCaveman();
    this.bindInput();
    this.refreshHud();
    this.setMessage("The first monsters are approaching. Plant your defenders!");
  }

  drawField() {
    const g = this.add.graphics();
    g.fillGradientStyle(0xb9d98a, 0xb9d98a, 0x8dbb69, 0x8dbb69, 1);
    g.fillRect(0, 0, 1120, 680);
    g.fillStyle(0x8a603b, 1);
    g.fillRoundedRect(185, 115, 690, 500, 24);
    g.fillStyle(0x9c7047, 1);
    g.fillRoundedRect(195, 125, 670, 480, 18);

    for (let row = 0; row < LANES; row += 1) {
      const y = GRID_TOP + row * CELL_H;
      g.fillStyle(row % 2 === 0 ? 0xb88b5b : 0xad8050, 1);
      g.fillRoundedRect(GRID_LEFT - 8, y, COLUMNS * CELL_W, CELL_H - 5, 8);
      for (let col = 0; col < COLUMNS; col += 1) {
        const x = GRID_LEFT + col * CELL_W;
        g.lineStyle(2, 0xe4c18b, 0.65);
        g.strokeRoundedRect(x, y, CELL_W - 3, CELL_H - 7, 7);
      }
    }

    // The protected farmhouse and princess remain at the left end.
    g.fillStyle(0xe8d5a8, 1);
    g.fillRoundedRect(28, 385, 132, 150, 12);
    g.fillStyle(0x9b573c, 1);
    g.fillTriangle(18, 390, 94, 320, 170, 390);
    g.fillStyle(0x65452f, 1);
    g.fillRect(78, 465, 34, 70);
    g.fillStyle(0xf5d86c, 1);
    g.fillCircle(145, 354, 15);
    this.add.text(94, 555, "FARMHOUSE", {
      fontFamily: "Arial", fontSize: "13px", color: "#fff3d4", fontStyle: "bold"
    }).setOrigin(0.5);

    this.add.text(1000, 95, "MONSTER GATE", {
      fontFamily: "Arial", fontSize: "13px", color: "#563c2c", fontStyle: "bold"
    }).setOrigin(0.5);
  }

  createHud() {
    this.add.rectangle(560, 34, 1080, 56, 0x263c2b, 0.92).setStrokeStyle(2, 0xe4d5a5);
    this.hudText = this.add.text(28, 18, "", {
      fontFamily: "Arial", fontSize: "17px", color: "#fff7df", fontStyle: "bold"
    });
    this.waveText = this.add.text(1090, 18, "", {
      fontFamily: "Arial", fontSize: "17px", color: "#fff7df", fontStyle: "bold"
    }).setOrigin(1, 0);
    this.messageText = this.add.text(560, 645, "", {
      fontFamily: "Arial", fontSize: "16px", color: "#fff7df",
      backgroundColor: "#263c2b", padding: { x: 14, y: 7 }, align: "center"
    }).setOrigin(0.5, 1);
    this.add.text(22, 105, "DEFENDERS", {
      fontFamily: "Arial", fontSize: "12px", color: "#fff5d7", fontStyle: "bold"
    });
    this.selectionText = this.add.text(22, 126, "1 Cactus  ·  2 Punchroot  ·  3 Sunflower", {
      fontFamily: "Arial", fontSize: "12px", color: "#fff5d7"
    });
  }

  createCaveman() {
    this.caveman = this.add.container(145, this.laneYs[2]);
    const body = this.add.graphics();
    body.fillStyle(0x7a4c2c, 1);
    body.fillEllipse(0, 16, 38, 52);
    body.fillStyle(0xe7ad75, 1);
    body.fillCircle(0, -17, 21);
    body.fillStyle(0x382b22, 1);
    body.fillRoundedRect(-20, -38, 40, 13, 6);
    body.fillStyle(0xffffff, 1);
    body.fillCircle(-7, -20, 5);
    body.fillCircle(7, -20, 5);
    body.fillStyle(0x2b211c, 1);
    body.fillCircle(-7, -20, 2);
    body.fillCircle(7, -20, 2);
    body.lineStyle(7, 0x80512e, 1);
    body.lineBetween(15, 0, 35, -25);
    body.lineStyle(10, 0x68452a, 1);
    body.lineBetween(32, -29, 48, -40);
    this.caveman.add(body);
    this.caveman.setDepth(20);
    this.add.text(145, this.laneYs[2] + 47, "CAVEMAN", {
      fontFamily: "Arial", fontSize: "10px", color: "#fff4d4", fontStyle: "bold"
    }).setOrigin(0.5);
  }

  bindInput() {
    this.keys = this.input.keyboard.addKeys({
      one: Phaser.Input.Keyboard.KeyCodes.ONE,
      two: Phaser.Input.Keyboard.KeyCodes.TWO,
      three: Phaser.Input.Keyboard.KeyCodes.THREE,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE
    });

    this.input.on("pointerdown", (pointer) => {
      if (pointer.y < GRID_TOP - 8 || pointer.x < GRID_LEFT - 8) return;
      const col = Math.floor((pointer.x - GRID_LEFT) / CELL_W);
      const row = Math.floor((pointer.y - GRID_TOP) / CELL_H);
      if (row >= 0 && row < LANES && col >= 0 && col < COLUMNS) {
        this.tryPlant(col, row);
      }
    });
  }

  update(_time, delta) {
    const dt = delta / 1000;
    this.handleControls(dt);
    this.energyTimer += delta;
    if (this.energyTimer >= 1000) {
      this.energyTimer -= 1000;
      this.energy = Math.min(300, this.energy + 2);
    }

    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0 && this.spawnedThisWave < this.waveSize) {
      this.spawnMonster();
      this.spawnedThisWave += 1;
      this.spawnTimer = Math.max(1850, 4600 - this.wave * 130);
    }

    this.updatePlants(delta);
    this.updateMonsters(dt, delta);
    this.updateProjectiles(dt);
    this.checkWaveProgress();
    this.refreshHud();
  }

  handleControls(dt) {
    if (Phaser.Input.Keyboard.JustDown(this.keys.one)) this.selectPlant("cactus");
    if (Phaser.Input.Keyboard.JustDown(this.keys.two)) this.selectPlant("punch");
    if (Phaser.Input.Keyboard.JustDown(this.keys.three)) this.selectPlant("sunflower");

    let dx = 0;
    let dy = 0;
    if (this.keys.a.isDown || this.keys.left.isDown) dx -= 1;
    if (this.keys.d.isDown || this.keys.right.isDown) dx += 1;
    if (this.keys.w.isDown || this.keys.up.isDown) dy -= 1;
    if (this.keys.s.isDown || this.keys.down.isDown) dy += 1;

    if (dx !== 0 || dy !== 0) {
      this.caveman.x = Phaser.Math.Clamp(this.caveman.x + dx * 170 * dt, 105, 300);
      this.caveman.y = Phaser.Math.Clamp(this.caveman.y + dy * 170 * dt, 140, 570);
      if (dx !== 0) this.facing = Math.sign(dx);
      this.caveman.scaleX = this.facing;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.space)) {
      if (this.livingPlantCount() > 0) {
        this.setMessage("The plants are still defending. The caveman saves his club for the emergency!");
      } else {
        this.clubAttack();
      }
    }
  }

  selectPlant(type) {
    this.selectedPlant = type;
    this.setMessage(`${PLANT_TYPES[type].label} selected — click an empty soil cell to plant it.`);
    this.refreshHud();
  }

  tryPlant(col, row) {
    const type = PLANT_TYPES[this.selectedPlant];
    if (this.plants.some((plant) => plant.col === col && plant.row === row && plant.alive)) {
      this.setMessage("That soil cell is already occupied.");
      return;
    }
    if (this.energy < type.cost) {
      this.setMessage("Not enough energy. Wait for energy or collect more from sunflowers.");
      return;
    }

    this.energy -= type.cost;
    this.hasPlantedDefender = true;
    const x = GRID_LEFT + col * CELL_W + CELL_W / 2;
    const y = this.laneYs[row];
    const plant = {
      type: this.selectedPlant, col, row, x, y,
      hp: type.hp, maxHp: type.hp, alive: true,
      cooldown: Phaser.Math.Between(100, 450),
      energyCooldown: 8000,
      view: this.drawPlant(this.selectedPlant, x, y)
    };
    this.plants.push(plant);
    this.updateEmergencyMode();
    this.setMessage(`${type.label} planted. It stays rooted and defends from this cell.`);
  }

  drawPlant(type, x, y) {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    if (type === "cactus") {
      g.fillStyle(0x347b43, 1);
      g.fillRoundedRect(-19, -33, 38, 60, 18);
      g.fillRoundedRect(-31, -16, 17, 34, 9);
      g.fillRoundedRect(14, -23, 17, 34, 9);
      g.fillStyle(0xffe2a2, 1);
      g.fillEllipse(0, -20, 22, 14);
      g.fillStyle(0x1d3425, 1);
      g.fillCircle(-6, -21, 2);
      g.fillCircle(6, -21, 2);
      g.lineStyle(2, 0xe8e5c5, 1);
      for (let i = -2; i <= 2; i += 1) g.lineBetween(i * 7, -6, i * 7 + 4, -13);
    } else if (type === "punch") {
      g.fillStyle(0x5c9a3e, 1);
      g.fillEllipse(0, -5, 52, 54);
      g.fillStyle(0xe5c64f, 1);
      g.fillCircle(0, -37, 23);
      g.fillStyle(0x243326, 1);
      g.fillCircle(-8, -39, 3);
      g.fillCircle(8, -39, 3);
      g.lineStyle(11, 0x5c9a3e, 1);
      g.lineBetween(-20, -5, -38, 5);
      g.lineBetween(20, -5, 38, 5);
      g.fillStyle(0xf0d5a1, 1);
      g.fillCircle(-39, 6, 10);
      g.fillCircle(39, 6, 10);
    } else {
      g.fillStyle(0x3c8543, 1);
      for (let i = 0; i < 8; i += 1) {
        const a = (Math.PI * 2 * i) / 8;
        g.fillEllipse(Math.cos(a) * 22, -26 + Math.sin(a) * 22, 20, 12);
      }
      g.fillStyle(0xf3c94e, 1);
      g.fillCircle(0, -26, 18);
      g.fillStyle(0x342d22, 1);
      g.fillCircle(-6, -29, 2);
      g.fillCircle(6, -29, 2);
      g.fillStyle(0x6a9d48, 1);
      g.fillRoundedRect(-10, -5, 20, 31, 8);
    }
    c.add(g);
    c.setDepth(10);
    this.tweens.add({
      targets: c, scaleY: 1.035, duration: 1350,
      ease: "Sine.easeInOut", yoyo: true, repeat: -1
    });
    return c;
  }

  updatePlants(delta) {
    for (const plant of this.plants) {
      if (!plant.alive) continue;
      if (plant.type === "sunflower") {
        plant.energyCooldown -= delta;
        if (plant.energyCooldown <= 0) {
          this.energy = Math.min(300, this.energy + 20);
          plant.energyCooldown = 8000;
          this.setMessage("A sunflower produced 20 energy.");
        }
        continue;
      }

      plant.cooldown -= delta;
      if (plant.cooldown > 0) continue;
      const target = this.monsters
        .filter((monster) => monster.alive && monster.row === plant.row &&
          monster.x > plant.x && monster.x - plant.x <= PLANT_TYPES[plant.type].range)
        .sort((a, b) => a.x - b.x)[0];

      if (!target) continue;
      if (plant.type === "cactus") {
        this.fireThorn(plant, target);
        plant.cooldown = PLANT_TYPES.cactus.cooldown;
      } else if (plant.type === "punch") {
        if (target.x - plant.x <= PLANT_TYPES.punch.range) {
          target.hp -= 28;
          this.tweens.add({ targets: plant.view, scaleX: 1.18, duration: 90, yoyo: true });
          this.damageMonsterIfNeeded(target);
          plant.cooldown = PLANT_TYPES.punch.cooldown;
        } else {
          plant.cooldown = 180;
        }
      }
    }
  }

  fireThorn(plant, target) {
    const graphic = this.add.circle(plant.x + 20, plant.y - 22, 7, 0xf0e2ad);
    graphic.setStrokeStyle(2, 0x456b35);
    this.projectiles.push({
      view: graphic, x: plant.x + 20, y: plant.y - 22,
      target, speed: 300, damage: 24, alive: true
    });
  }

  spawnMonster() {
    const row = Phaser.Math.Between(0, LANES - 1);
    const hp = 65 + Math.floor(this.wave * 4);
    const container = this.add.container(SPAWN_X, this.laneYs[row]);
    const g = this.add.graphics();
    const tint = this.wave % 4 === 0 ? 0x748b64 : 0x7b9872;
    g.fillStyle(tint, 1);
    g.fillEllipse(0, 16, 42, 58);
    g.fillStyle(0x9cae88, 1);
    g.fillCircle(0, -22, 25);
    g.fillStyle(0xeee7c9, 1);
    g.fillCircle(-9, -25, 8);
    g.fillCircle(9, -25, 8);
    g.fillStyle(0x29362a, 1);
    g.fillCircle(-8, -24, 3);
    g.fillCircle(10, -24, 3);
    g.lineStyle(7, tint, 1);
    g.lineBetween(-18, 0, -33, 15);
    g.lineBetween(18, 0, 33, 15);
    g.lineStyle(8, 0x51422e, 1);
    g.lineBetween(-10, 39, -18, 55);
    g.lineBetween(10, 39, 18, 55);
    container.add(g);
    container.setDepth(8);
    this.tweens.add({
      targets: container, angle: { from: -2.5, to: 2.5 },
      y: this.laneYs[row] + 2, duration: 460,
      ease: "Sine.easeInOut", yoyo: true, repeat: -1
    });

    const monster = {
      row, x: SPAWN_X, y: this.laneYs[row], hp, maxHp: hp,
      speed: Math.min(48, 14 + (this.wave - 1) * 2.1),
      attackCooldown: 0, alive: true, view: container
    };
    this.monsters.push(monster);
  }

  updateMonsters(dt, delta) {
    for (const monster of this.monsters) {
      if (!monster.alive) continue;
      monster.attackCooldown -= delta;
      const blocker = this.plants
        .filter((plant) => plant.alive && plant.row === monster.row && plant.x < monster.x)
        .sort((a, b) => b.x - a.x)[0];

      if (blocker && monster.x - blocker.x <= 43) {
        if (monster.attackCooldown <= 0) {
          blocker.hp -= 16;
          monster.attackCooldown = 1150;
          this.tweens.add({ targets: monster.view, x: monster.view.x - 4, duration: 90, yoyo: true });
          if (blocker.hp <= 0) this.destroyPlant(blocker);
        }
        continue;
      }

      if (!blocker && monster.x <= HOME_X + 34) {
        if (monster.attackCooldown <= 0) {
          this.houseHealth = Math.max(0, this.houseHealth - 8);
          monster.attackCooldown = 1250;
          if (this.houseHealth <= 0) this.setMessage("The farmhouse has fallen. The battle is lost.");
        }
        continue;
      }

      monster.x -= monster.speed * dt;
      monster.view.x = monster.x;
    }
    this.monsters = this.monsters.filter((monster) => monster.alive);
  }

  updateProjectiles(dt) {
    for (const shot of this.projectiles) {
      if (!shot.alive) continue;
      if (!shot.target || !shot.target.alive) {
        shot.alive = false;
        shot.view.destroy();
        continue;
      }
      const dx = shot.target.x - shot.x;
      const dy = shot.target.y - 22 - shot.y;
      const distance = Math.hypot(dx, dy);
      const step = shot.speed * dt;
      if (distance <= step + 12) {
        shot.target.hp -= shot.damage;
        this.damageMonsterIfNeeded(shot.target);
        shot.alive = false;
        shot.view.destroy();
      } else {
        shot.x += (dx / distance) * step;
        shot.y += (dy / distance) * step;
        shot.view.setPosition(shot.x, shot.y);
      }
    }
    this.projectiles = this.projectiles.filter((shot) => shot.alive);
  }

  damageMonsterIfNeeded(monster) {
    if (monster.hp > 0 || !monster.alive) return;
    monster.alive = false;
    monster.view.destroy();
    this.energy = Math.min(300, this.energy + 8);
  }

  destroyPlant(plant) {
    if (!plant.alive) return;
    plant.alive = false;
    plant.view.destroy();
    this.setMessage("A defender has fallen!");
    this.updateEmergencyMode();
  }

  livingPlantCount() {
    return this.plants.filter((plant) => plant.alive).length;
  }

  updateEmergencyMode() {
    const active = this.hasPlantedDefender && this.livingPlantCount() === 0;
    if (active && !this.emergencyMode) {
      this.emergencyMode = true;
      this.setMessage("EMERGENCY! The last plant has fallen. Move the caveman and press SPACE to swing his club!");
    } else if (!active && this.emergencyMode) {
      this.emergencyMode = false;
      this.setMessage("A new plant has rooted. The plants have taken over defense; the caveman stops fighting.");
    }
  }

  clubAttack() {
    if (!this.emergencyMode || this.livingPlantCount() > 0) return;
    const target = this.monsters
      .filter((monster) => monster.alive && monster.row === this.nearestLane(this.caveman.y) &&
        Math.abs(monster.x - this.caveman.x) <= 112)
      .sort((a, b) => Math.abs(a.x - this.caveman.x) - Math.abs(b.x - this.caveman.x))[0];

    this.tweens.add({ targets: this.caveman, angle: this.facing * 22, duration: 100, yoyo: true });
    if (target) {
      target.hp -= 42;
      this.damageMonsterIfNeeded(target);
      this.setMessage("Club hit!");
    } else {
      this.setMessage("No monster is close enough for the club.");
    }
  }

  nearestLane(y) {
    let best = 0;
    let distance = Infinity;
    this.laneYs.forEach((laneY, index) => {
      const d = Math.abs(laneY - y);
      if (d < distance) { best = index; distance = d; }
    });
    return best;
  }

  checkWaveProgress() {
    if (this.spawnedThisWave >= this.waveSize && this.monsters.length === 0) {
      this.wave += 1;
      this.spawnedThisWave = 0;
      this.spawnTimer = 3200;
      this.waveSize = Math.min(14, 7 + this.wave);
      this.setMessage(`Wave ${this.wave - 1} cleared. The next wave is approaching — monsters become a little faster.`);
    }
  }

  setMessage(message) {
    this.messageText.setText(message);
  }

  refreshHud() {
    this.hudText.setText(
      `ENERGY  ${this.energy}     HOUSE  ${this.houseHealth}%     PLANTS  ${this.livingPlantCount()}     SELECTED  ${PLANT_TYPES[this.selectedPlant].label}`
    );
    this.waveText.setText(`WAVE ${this.wave}${this.emergencyMode ? "  ·  EMERGENCY" : ""}`);
  }
}
