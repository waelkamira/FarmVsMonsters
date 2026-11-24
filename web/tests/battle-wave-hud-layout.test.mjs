import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const scene = readFileSync(new URL("../game/scenes/BattleScene.js", import.meta.url), "utf8");

test("attack counter and defeated-progress bar share the monster counter top HUD row", () => {
  assert.match(scene, /const waveHud = \{ barX: 690, barY: 16, barStartX: 611, labelY: 39, iconX: 824, badgeX: 884 \}/);
  assert.match(scene, /this\.waveProgressFrame = this\.add\.image\(waveHud\.barX, waveHud\.barY, "hud-wave-frame"\)/);
  assert.match(scene, /this\.waveProgressTrack = this\.add\.rectangle\(waveHud\.barX, waveHud\.barY, 158, 10/);
  assert.match(scene, /this\.waveProgressFill = this\.add\.image\(waveHud\.barStartX, waveHud\.barY, "hud-wave-fill"\)/);
  assert.match(scene, /this\.waveProgressMarker = this\.add\.image\(waveHud\.barStartX, waveHud\.barY, "hud-wave-marker"\)/);
  assert.match(scene, /this\.waveIcon = this\.add\.image\(waveHud\.iconX, waveHud\.barY, "hud-wave-icon"\)/);
  assert.match(scene, /this\.waveBadge = this\.add\.image\(waveHud\.badgeX, waveHud\.barY, "hud-wave-badge"\)/);
  assert.match(scene, /this\.waveText = this\.add\.text\(waveHud\.badgeX, waveHud\.barY, "1\/5"/);
  assert.match(scene, /this\.waveProgressMarker\?\.setX\(611 \+ trackWidth \* progress\)/);
  assert.match(scene, /counter\.x \+ width \/ 2 - 2, 16, width, 27/);
});
