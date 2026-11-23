/**
 * Battle HUD button layout.
 *
 * Keep every in-battle action shortcut in this one registry so the right-side
 * column can be reordered or resized without hunting through BattleScene.
 * Coordinates are in the fixed 1120 × 680 Phaser game-space.
 */
export const BATTLE_HUD_BUTTONS = Object.freeze([
  { key: "pauseControl", label: "pause", y: 82 },
  { key: "settingsControl", label: "settings", y: 130 },
  { key: "speedControl", label: "speed", y: 178 },
  { key: "audioButton", label: "audio", y: 226 },
  { key: "collectionMenuControl", label: "farm-journal", y: 274 },
  { key: "inventoryControl", label: "inventory", y: 322 },
  { key: "quickPlantsButton", label: "plants", y: 370 },
  { key: "quickAdventuresButton", label: "adventures", y: 418 },
  { key: "quickMonstersButton", label: "monsters", y: 466 }
]);

export const BATTLE_HUD_BUTTON_X = 1080;

export function layoutBattleHudButtons(scene) {
  if (!scene) return [];

  const positioned = [];
  for (const definition of BATTLE_HUD_BUTTONS) {
    const button = scene[definition.key];
    if (!button?.active) continue;
    button.setPosition(BATTLE_HUD_BUTTON_X, definition.y);
    button.setDepth?.(72);
    positioned.push(definition.key);
  }

  // The audio popover opens inward, left of the button column. Keep its
  // dismissal hit area aligned with the relocated speaker button.
  if (scene.audioMenu?.active) {
    scene.audioMenu.setPosition(930, 350);
  }
  scene.audioMenuBounds = { left: 800, right: 1060, top: 230, bottom: 470 };
  scene.audioButtonBounds = { left: 1056, right: 1120, top: 202, bottom: 250 };

  return positioned;
}
