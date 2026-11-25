import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_PLANT_EFFECTS, EFFECT_LIBRARY, EFFECT_SHAPES, EFFECT_TRIGGERS, MAX_EFFECTS_PER_ASSET,
  getEffect, isKnownEffectId, listEffects, normalizeEffectIds
} from "../game/vfx/effects/effectLibrary.mjs";
import { effectsForTrigger, resolveAssignedEffectIds, validateEffectSelection } from "../game/vfx/effects/effectAssignments.mjs";

const PUBLIC = path.resolve("public");
const manifest = JSON.parse(fs.readFileSync("game/data/effect-sound-assets.json", "utf8"));
const LAYER_TYPES = new Set(["burst", "rise", "ring", "flash", "bolt", "tint", "shake", "squash", "orbit", "slash"]);
const ARABIC = /[\u0600-\u06FF]/;

test("the library ships a meaningful set of effects with unique ids", () => {
  assert.ok(EFFECT_LIBRARY.length >= 20);
  assert.equal(new Set(EFFECT_LIBRARY.map((e) => e.id)).size, EFFECT_LIBRARY.length);
  for (const id of ["electric-shock", "freeze", "burn", "explosion", "poison", "lightning-strike"]) assert.ok(isKnownEffectId(id), id);
});

test("every effect has an Arabic name, a short Arabic description and a valid trigger", () => {
  for (const effect of EFFECT_LIBRARY) {
    assert.match(effect.nameAr, ARABIC, effect.id);
    assert.match(effect.descriptionAr, ARABIC, effect.id);
    assert.ok(effect.descriptionAr.length <= 140, `${effect.id} description is not short`);
    assert.ok(EFFECT_TRIGGERS[effect.trigger], `${effect.id} trigger`);
    assert.ok(effect.appliesTo.length > 0);
    assert.ok(effect.layers.length > 0, `${effect.id} has no layers`);
  }
});

test("layers only use supported types and known particle shapes", () => {
  for (const effect of EFFECT_LIBRARY) {
    for (const layer of effect.layers) {
      assert.ok(LAYER_TYPES.has(layer.type), `${effect.id}: ${layer.type}`);
      if (layer.shape) assert.ok(EFFECT_SHAPES[layer.shape], `${effect.id}: shape ${layer.shape}`);
      if (layer.type === "burst" || layer.type === "rise") assert.ok(layer.colors.length > 0 && layer.count > 0);
      assert.ok(layer.life > 0 || layer.type === "shake", `${effect.id}: life`);
    }
  }
});

test("every effect has an icon file and a matching sound file listed in the manifest", () => {
  const keys = new Map(manifest.assets.map((a) => [a.key, a]));
  for (const effect of EFFECT_LIBRARY) {
    assert.ok(fs.existsSync(path.join(PUBLIC, effect.iconPath)), `icon missing: ${effect.iconPath}`);
    assert.ok(fs.existsSync(path.join(PUBLIC, effect.soundPath)), `sound missing: ${effect.soundPath}`);
    const entry = keys.get(effect.sound.key);
    assert.ok(entry, `manifest lacks ${effect.sound.key}`);
    assert.equal(entry.path, effect.soundPath);
    assert.ok(effect.sound.volume > 0 && effect.sound.volume <= 1);
  }
});

test("sound files are real, small Ogg files and the manifest is CC0", () => {
  assert.equal(manifest.license, "CC0-1.0");
  for (const asset of manifest.assets) {
    const bytes = fs.readFileSync(path.join(PUBLIC, asset.path));
    assert.equal(bytes.subarray(0, 4).toString("latin1"), "OggS", asset.key);
    assert.ok(bytes.length > 1500 && bytes.length < 60000, `${asset.key} size ${bytes.length}`);
  }
});

test("icons are valid standalone SVGs without duplicated attributes", () => {
  for (const effect of EFFECT_LIBRARY) {
    const svg = fs.readFileSync(path.join(PUBLIC, effect.iconPath), "utf8");
    assert.ok(svg.startsWith("<svg"), effect.id);
    for (const tag of svg.match(/<[a-z]+\s[^>]*>/g) || []) {
      const names = [...tag.matchAll(/\s([a-z-]+)=/g)].map((m) => m[1]);
      assert.equal(new Set(names).size, names.length, `${effect.id}: duplicate attribute in ${tag.slice(0, 80)}`);
    }
  }
});

test("normalizeEffectIds drops unknown and duplicate ids and caps the list", () => {
  assert.deepEqual(normalizeEffectIds(["freeze", "freeze", "nope", 7, "burn"]), ["freeze", "burn"]);
  assert.deepEqual(normalizeEffectIds("freeze"), []);
  assert.equal(normalizeEffectIds(EFFECT_LIBRARY.map((e) => e.id)).length, MAX_EFFECTS_PER_ASSET);
});

test("validateEffectSelection accepts good input and rejects bad input with an Arabic reason", () => {
  assert.deepEqual(validateEffectSelection("plant", ["freeze", "burn"]), { ok: true, effects: ["freeze", "burn"] });
  assert.equal(validateEffectSelection("monster", []).ok, true);
  for (const bad of [
    validateEffectSelection("item", ["freeze"]),
    validateEffectSelection("plant", "freeze"),
    validateEffectSelection("plant", ["not-real"]),
    validateEffectSelection("plant", EFFECT_LIBRARY.slice(0, 5).map((e) => e.id))
  ]) {
    assert.equal(bad.ok, false);
    assert.match(bad.error, ARABIC);
  }
});

test("studio entries use their own list; built-in plants use defaults; others get none", () => {
  assert.deepEqual(resolveAssignedEffectIds({ studioEntry: { effects: ["burn", "ghost"] } }), ["burn"]);
  assert.deepEqual(resolveAssignedEffectIds({ studioEntry: { effects: [] }, builtinPlantType: "snow-thrower" }), []);
  assert.deepEqual(resolveAssignedEffectIds({ builtinPlantType: "snow-thrower" }), ["freeze"]);
  assert.deepEqual(resolveAssignedEffectIds({ studioEntry: {} }), []);
  assert.deepEqual(resolveAssignedEffectIds({ builtinPlantType: "mushroom" }), []);
  for (const ids of Object.values(DEFAULT_PLANT_EFFECTS)) for (const id of ids) assert.ok(getEffect(id));
});

test("effectsForTrigger and listEffects filter by trigger and target type", () => {
  assert.deepEqual(effectsForTrigger(["freeze", "recoil-pop"], "hit"), ["freeze"]);
  assert.ok(listEffects({ trigger: "aura" }).every((e) => e.trigger === "aura"));
  assert.ok(listEffects({ appliesTo: "monster" }).length > 0);
  for (const trigger of Object.keys(EFFECT_TRIGGERS)) assert.ok(listEffects({ trigger }).length > 0, trigger);
});

test("the Studio exposes the picker and the library without touching gameplay stats", () => {
  const detail = fs.readFileSync("app/studio/assets/[id]/page.js", "utf8");
  assert.match(detail, /EffectPicker/);
  assert.match(fs.readFileSync("app/studio/page.js", "utf8"), /\/studio\/effects/);
  // الواجهة تحفظ عبر عملية مخصصة فقط، ولا تلمس combat أو monsterProfile.
  const picker = fs.readFileSync("app/studio/EffectPicker.jsx", "utf8");
  assert.match(picker, /operation: "set-effects"/);
  assert.doesNotMatch(picker, /combat|monsterProfile/);
});
