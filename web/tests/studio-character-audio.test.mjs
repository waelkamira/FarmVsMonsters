import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { cloneStudioAsset, createStudioAssetRevision, restoreStudioAssetRevision, snapshotStudioAsset } from "../game/studio/assetVersions.mjs";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Studio attaches a validated optional audio file to plant and monster records", async () => {
  const route = await read("../app/api/studio/assets/route.js");
  const page = await read("../app/studio/page.js");
  assert.match(route, /audioFile=form\.get\("audioFile"\)/);
  assert.match(route, /validStudioAudioBytes/);
  assert.match(route, /createImmutableAssetPath\("audio"/);
  assert.match(route, /publish character audio/);
  assert.match(route, /audio:asset\.audio/);
  assert.match(page, /الصوت الخاص بهذه الشخصية/);
  assert.match(page, /form\.set\("audioFile",audioFile\)/);
  assert.match(page, /editingAsset\?\.audio\?\.previewUrl/);
});

test("Studio permanent delete removes catalog entries and safely deletes unshared GitHub files", async () => {
  const route = await read("../app/api/studio/assets/route.js");
  const page = await read("../app/studio/page.js");
  assert.match(route, /operation==="delete"/);
  assert.match(route, /getAssetDependents\(registry\.assets,id\)/);
  assert.match(route, /githubDeleteIfExists/);
  assert.match(route, /catalog\[catalogKey\]=catalog\[catalogKey\]\.filter\(item=>item\.id!==id\)/);
  assert.match(route, /referenced\.has\(assetPath\)/);
  assert.match(page, /حذف نهائي/);
  assert.match(page, /لا يمكن التراجع عن هذه العملية/);
  assert.match(page, /transitionAsset\(a,"delete"\)/);
});

test("Phaser loads plant and monster character audio and plays it on their attacks", async () => {
  const battle = await read("../game/scenes/BattleScene.js");
  assert.equal((battle.match(/load\.audio\("studio-character-audio-/g) || []).length, 2);
  assert.match(battle, /plant\.studioPlant\.audioKey/);
  assert.match(battle, /monster\.studioMonster\.audioKey/);
  assert.match(battle, /playSfx\(\(plant\.studioPlant\.audioKey/);
  assert.match(battle, /playSfx\(\(monster\.studioMonster\.audioKey/);
});

test("character audio metadata survives snapshots, revisions, restores and clones", () => {
  const audio = { filename: "corn-voice.mp3", path: "/assets/audio/corn-voice-a1.mp3", mimeType: "audio/mpeg" };
  const original = { id: "corn-monster", type: "plant", name: "Corn Monster", path: "/assets/plants/corn.png", audio, revision: 1, versions: [] };
  assert.deepEqual(snapshotStudioAsset(original, 1).audio, audio);
  const changed = createStudioAssetRevision(original, { ...original, audio: null, revision: undefined, versions: undefined });
  assert.deepEqual(changed.versions[0].audio, audio);
  const restored = restoreStudioAssetRevision(changed, 1);
  assert.deepEqual(restored.audio, audio);
  assert.deepEqual(cloneStudioAsset(original, "corn-monster-copy", "Corn Monster Copy").audio, audio);
});
