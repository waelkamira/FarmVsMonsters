import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { PHASE_ONE_PLANTS } from "../game/rules/phaseOneCombatContract.mjs";
import { STAGE_ONE_PLANTS } from "../game/data/stageOnePlants.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const localeProvider = readFileSync(resolve(here, "../app/LocaleProvider.jsx"), "utf8");
const howToPlay = readFileSync(resolve(here, "../app/how-to-play/page.js"), "utf8");

test("localized campaign summary matches the authoritative Stage 1 wave schedule", () => {
  assert.match(localeProvider, /30 ordinary monsters across five waves: 3, 5, 6, 7, and 9/);
  assert.match(localeProvider, /٣٠ وحشاً عادياً موزعين على خمس موجات: ٣، ٥، ٦، ٧، و٩/);
  assert.match(localeProvider, /"30 MONSTERS": "٣٠ وحشاً"/);
  assert.doesNotMatch(localeProvider, /100 monsters across five waves/);
  assert.doesNotMatch(localeProvider, /"100 MONSTERS"/);
});

test("the How to Play screen explains that the Stage 1 dragon is separate from ordinary monsters", () => {
  assert.match(howToPlay, /30 ordinary monsters/);
  assert.match(howToPlay, /dragon.*counted separately as the boss/i);
  assert.match(howToPlay, /التنين.*بشكل منفصل عن الوحوش العادية/);
});

test("Radish planting cost stays aligned across combat rules and player instructions", () => {
  assert.equal(PHASE_ONE_PLANTS.radish.plantingEnergyCost, 35);
  assert.equal(STAGE_ONE_PLANTS.find((plant) => plant.id === "radish")?.energyCost, 35);
  assert.match(localeProvider, /Radish card \(35 energy\)/);
  assert.match(howToPlay, /الفجل \(٣٥ طاقة\)/);
});
