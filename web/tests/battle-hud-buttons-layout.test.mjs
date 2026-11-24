import test from "node:test";
import assert from "node:assert/strict";
import { BATTLE_HUD_BUTTONS, BATTLE_HUD_BUTTON_X, layoutBattleHudButtons } from "../game/scenes/BattleHudButtons.js";

test("every battle action button occupies one vertical column on the right", () => {
  assert.equal(BATTLE_HUD_BUTTON_X, 1080);
  assert.equal(BATTLE_HUD_BUTTONS.length, 9);
  assert.deepEqual(BATTLE_HUD_BUTTONS.map(({ y }) => y), [82, 130, 178, 226, 274, 322, 370, 418, 466]);
  const keys = BATTLE_HUD_BUTTONS.map(({ key }) => key);
  assert.deepEqual(keys, [
    "pauseControl", "settingsControl", "speedControl", "audioButton",
    "collectionMenuControl", "inventoryControl", "quickPlantsButton",
    "quickAdventuresButton", "quickMonstersButton"
  ]);
  assert.equal(new Set(keys).size, keys.length, "each action must appear exactly once");
});

test("the layout positions all existing controls and moves the audio menu inward", () => {
  const positioned = [];
  const makeControl = () => ({
    active: true,
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setDepth(depth) { this.depth = depth; return this; }
  });
  const scene = Object.fromEntries(BATTLE_HUD_BUTTONS.map(({ key }) => [key, makeControl()]));
  scene.audioMenu = makeControl();

  const result = layoutBattleHudButtons(scene);

  assert.equal(result.length, BATTLE_HUD_BUTTONS.length);
  for (const { key, y } of BATTLE_HUD_BUTTONS) {
    assert.equal(scene[key].x, 1080);
    assert.equal(scene[key].y, y);
    assert.equal(scene[key].depth, 72);
  }
  assert.deepEqual([scene.audioMenu.x, scene.audioMenu.y], [930, 350]);
  assert.deepEqual(scene.audioMenuBounds, { left: 800, right: 1060, top: 230, bottom: 470 });
  assert.deepEqual(scene.audioButtonBounds, { left: 1056, right: 1120, top: 202, bottom: 250 });
});

test("layout tolerates controls that are not present yet", () => {
  const scene = {};
  assert.deepEqual(layoutBattleHudButtons(scene), []);
  assert.deepEqual(scene.audioButtonBounds, { left: 1056, right: 1120, top: 202, bottom: 250 });
});


test("attack progress bar and attack counter are anchored at the extreme upper-right", async () => {
  const { readFileSync } = await import("node:fs");
  const scene = readFileSync(new URL("../game/scenes/BattleScene.js", import.meta.url), "utf8");
  assert.match(scene, /waveProgressFrame = this\.add\.image\(883, 68, "hud-wave-frame"\)/);
  assert.match(scene, /waveProgressTrack = this\.add\.rectangle\(883, 68, 158, 10/);
  assert.match(scene, /waveIcon = this\.add\.image\(1027, 68, "hud-wave-icon"\)/);
  assert.match(scene, /waveBadge = this\.add\.image\(1080, 68, "hud-wave-badge"\)/);
  assert.match(scene, /waveText = this\.add\.text\(1080, 68, "1\/5"/);
  assert.match(scene, /waveProgressMarker\?\.setX\(804 \+ trackWidth \* progress\)/);
});

test("seed packets show a draggable seven-slot scrollbar only above seven active plants", async () => {
  const { readFileSync } = await import("node:fs");
  const scene = readFileSync(new URL("../game/scenes/BattleScene.js", import.meta.url), "utf8");
  assert.match(scene, /const hasScrollableSeedBank = selectedTypes\.length > 7/);
  assert.match(scene, /const seedViewportWidth = 7 \* 78/);
  assert.match(scene, /this\.seedPacketLayer\.setMask\(seedMaskGraphics\.createGeometryMask\(\)\)/);
  assert.match(scene, /this\.input\.setDraggable\(thumb\)/);
  assert.match(scene, /thumb\.on\("drag",/);
  assert.match(scene, /track\.on\("pointerdown",/);
  assert.match(scene, /if \(hasScrollableSeedBank\) \{/);
});
