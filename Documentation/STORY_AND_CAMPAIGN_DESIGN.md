> **Current implementation — 2026-11-25:** Stage 1 contains five waves of Monster 01 only and ends when the waves are cleared. No separate boss encounter is active.

# Farm Vs Monsters — Story and Campaign Design

**Status:** Approved narrative direction; detailed level content remains to be designed.
**Repository:** `waelkamira/FarmVsMonsters`
**Branch:** `main`

This document records the approved central story and the intended emotional structure of the campaign. It complements, and does not replace, the gameplay implementation roadmap.

## 1. The central story



The long-term promise to the player is:


The wife may be presented visually as a princess or royal heroine if that suits the world's art direction, but the story relationship is fixed: she is the farmer's wife. Do not silently turn her into an unrelated princess.

## 2. The structure of an individual stage

Each stage is a complete rescue story with a beginning, escalation, climax, and resolution.

2. **Monster assault:** The farmer defends using the starter plants available in the first stage. The waves begin gently and increase in pressure gradually; early enemies are few, slow, and easy to understand. Do not overwhelm a new player before they learn the controls and plant roles.
6. **Reward and celebration:** Present the stage result and earned reward. Preserve the approved treasure-cave ritual: the farmer carries the stage's gold to the cave, opens it with “Open Sesame” / «افتح يا سمسم», and deposits the reward exactly once.
7. **Breathing room:** Let the player enjoy the rescue and victory before the next threat is introduced.

The wife is rescued at the end of **every** successfully completed stage. She is not held captive continuously across the entire campaign.

## 3. Stage victory and defeat

### Stage victory

A stage is complete only when all of the following are true:

- All required monster waves have finished spawning.
- The farmhouse objective remains above zero health.
- The victory/rescue sequence is triggered once, and the stage reward is credited once.


### Stage defeat

- The player loses the stage when the farmhouse objective health reaches zero under the battle rules.
- The wife remains captive; do not treat her as the battle's health bar or imply she is killed when the farmhouse is damaged.
- Stop battle simulation and show a clear defeat result with a retry option.
- Retrying the same stage must not grant duplicate coins, treasure, unlocks, or rescue progress.


## 4. Campaign progression and variety

The campaign is organized into themed territories. A territory may contain one or more stages; the number of stages per territory is not fixed by this story document.



- A distinct territory, battlefield background, atmosphere, and environmental identity.
- A monster force with its own recognizable composition and tactical roles.
- New plants or newly unlocked plant choices, with genuinely different abilities and strategic uses.
- A difficulty increase based on combinations, timing, and tactical pressure—not only inflated statistics.
- A unique introduction, boss climax, rescue moment, and reward presentation.




## 6. The wife as a recurring character

The wife is an active part of the story, not just a prop in the background.

- Give each rescue a short, distinct, emotionally satisfying reunion beat.
- Do not depict repeated rescues as meaningless or make the next abduction happen immediately during the reunion.

## 7. The treasure-cave reward ritual

The previously approved treasure-cave feature remains part of the post-stage celebration. It follows the rescue/result beat in the stage flow. The player sees the exact earned reward deposited once and the accumulated treasure total increase. The cave artwork will be supplied by the user; do not invent or replace its final art. Before implementation, decide whether the displayed treasure is the spendable Coin wallet or a separate lifetime-wealth statistic.

## 8. Production boundaries

- The user's original art assets remain authoritative. Do not crop, recolor, resize, replace, or generate final character/background assets without an explicit request.
- Preserve all fixed gameplay constraints in the master plan, including no shadows beneath characters, the plant/monster lane rules, and exact-once reward accounting.

## 9. Decisions still open

These details require separate approval; this document does not assume answers:

- Whether each territory contains one stage or a sequence of stages.
- Whether the wife has any gameplay support role during a stage, or remains a narrative character in the background.


