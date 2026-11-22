# Auto-Rig Starter Clip Review Finding — 2026-11-22

Static source review identified a probable starter-animation classification defect in `web/game/studio/autoRigBuilder.mjs` on `feat/studio-ai-auto-rig-builder`:

```js
const arms = visible.filter((bone) => /^(arm|hand)\\\\./.test(roles.get(bone.id) || ""));
```

The source pattern contains an escaped backslash before the wildcard dot (two backslashes in the regex literal), so it does not match semantic roles such as `arm.left`, `arm.right`, `hand.left`, and `hand.right` as intended. The likely intended expression is `/^(arm|hand)\\./` (single escaped dot in the regex literal).

Consequences: starter clips that depend on this classification may omit arm/hand bones from their animation tracks. This is a static-review finding only; it has not been reproduced in runtime.

Before porting:
- correct the regex;
- add regression assertions for all four role strings and negative controls;
- review the generated clip tracks and parent-relative transform behavior;
- then port this module with the focused tests as a single integration slice.
