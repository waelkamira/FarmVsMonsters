# Farm Vs Monsters — Story and Campaign Design

**Status:** Approved narrative direction; detailed level content remains to be designed.
**Repository:** `waelkamira/FarmVsMonsters`
**Branch:** `main`

This document records the approved central story and the intended emotional structure of the campaign. It complements, and does not replace, the gameplay implementation roadmap.

## 1. The central story

The hero is a farmer who lives happily with his wife. A succession of evil final enemies rules over different territories and commands armies of monsters. Each final enemy kidnaps the farmer's wife and holds her captive while its monsters attack the farmer's land.

The farmer sets out to defeat the final enemy and its monster army and rescue his wife. Every completed stage ends with a real rescue and a moment of reunion. The next stage introduces a different final enemy, a different territory, a different monster force, and new plants and tactical challenges. The next kidnapping happens only after the previous rescue has been given time and emotional weight; it must not interrupt the reunion immediately.

The long-term promise to the player is:

**Defeat every final enemy, rescue your wife from each captor, and ultimately free the land from the final enemies' rule.**

The wife may be presented visually as a princess or royal heroine if that suits the world's art direction, but the story relationship is fixed: she is the farmer's wife. Do not silently turn her into an unrelated princess.

## 2. The structure of an individual stage

Each stage is a complete rescue story with a beginning, escalation, climax, and resolution.

1. **final enemy's introduction:** Establish the new territory and show its final enemy, its monster followers, and the captive wife held behind the enemy front. The player should immediately understand who the captor is and whom they are trying to rescue.
2. **Monster assault:** The farmer defends using the starter plants available in the first stage. The waves begin gently and increase in pressure gradually; early enemies are few, slow, and easy to understand. Do not overwhelm a new player before they learn the controls and plant roles.
4. **Boss climax:** Once all ordinary followers have been defeated, the final enemy remains alone as the final boss. The farmer automatically fires stones from his ranged attack when the final enemy is within range; this requires no player clicking and does not happen before the final enemy appears. The final enemy and all required followers must be defeated before victory.
5. **Rescue:** The final enemy is defeated, the wife's restraints are released, and the farmer reunites with her. This is a distinct victory beat, not an instantly skipped transition.
6. **Reward and celebration:** Present the stage result and earned reward. Preserve the approved treasure-cave ritual: the farmer carries the stage's gold to the cave, opens it with “Open Sesame” / «افتح يا سمسم», and deposits the reward exactly once.
7. **Breathing room:** Let the player enjoy the rescue and victory before the next threat is introduced.
8. **Next-stage setup:** Transition to a new land. Introduce a different final enemy and its own monster army; that final enemy becomes the next captor and the next rescue objective.

The wife is rescued at the end of **every** successfully completed stage. She is not held captive continuously across the entire campaign.

## 3. Stage victory and defeat

### Stage victory

A stage is complete only when all of the following are true:

- All required monster waves have finished spawning.
- All surviving ordinary monsters and final enemy followers have been defeated.
- The stage's final encounter has been defeated.
- The farmhouse objective remains above zero health.
- The victory/rescue sequence is triggered once, and the stage reward is credited once.

The rescue is the narrative confirmation of victory. Do not show the wife being rescued while the final enemy or required enemies are still alive.

### Stage defeat

- The player loses the stage when the farmhouse objective health reaches zero under the battle rules.
- The wife remains captive; do not treat her as the battle's health bar or imply she is killed when the farmhouse is damaged.
- Stop battle simulation and show a clear defeat result with a retry option.
- Retrying the same stage must not grant duplicate coins, treasure, unlocks, or rescue progress.

The exact way the final enemy damages the battlefield, how its boss health is displayed, and how the player can counter its attacks must be designed and tested before the final enemy is implemented.

## 4. Campaign progression and variety

The campaign is organized into themed territories. A territory may contain one or more stages; the number of stages per territory is not fixed by this story document.

Every new stage must offer meaningful changes rather than simply increasing enemy health. Difficulty must climb in small, fair steps across the campaign; teach each new mechanic before testing it under pressure. The first stage must be forgiving enough to make a new player want to continue, not punish them with an immediate swarm. The approved ordinary-monster totals are 30 in Stage 1, 31 in Stage 2, 32 in Stage 3, then +1 per subsequent stage (Stage N = 29 + N). These are totals across all waves in each stage; final encounters are tracked separately. Wave-by-wave distribution remains a balancing decision. Do not add new plant types until the battlefield environment, stage composition, buttons/controls, and menus are finalized; introduce additional plants gradually afterward.


- A distinct territory, battlefield background, atmosphere, and environmental identity.
- A different final enemy design, personality, attack pattern, and boss behavior.
- A monster force with its own recognizable composition and tactical roles.
- New plants or newly unlocked plant choices, with genuinely different abilities and strategic uses.
- A difficulty increase based on combinations, timing, and tactical pressure—not only inflated statistics.
- A unique introduction, boss climax, rescue moment, and reward presentation.

Possible territory themes for exploration (not a finalized sequence): green farm country, enchanted forest, volcanic lands, frozen lands, and the final enemies' fortress. final enemy colors, names, powers, plant rosters, and the final number of territories remain to be approved during campaign design.

## 5. The final enemy roster and narrative escalation

- Each stage features a different final enemy captor. Do not reuse the same final enemy with only a palette swap and larger health bar.
- Each final enemy needs a memorable silhouette, personality, animation, sound identity, signature ability, readable telegraphs, strengths, and counterplay.
- The final enemy and its monster followers should feel like one faction, with related visual and gameplay themes.
- The campaign should escalate toward a final final enemy ruler or leader. The final stage should resolve the wider threat to the land, not merely repeat an ordinary rescue.
- The exact relationship between the final enemies (allies, lieutenants, siblings, or a ruling hierarchy) is open for a later story decision. Do not invent definitive lore before it is approved.

## 6. The wife as a recurring character

The wife is an active part of the story, not just a prop in the background.

- Show her clearly beside/behind the final enemy and behind the enemy front at the beginning of a stage, without making her overlap the active battle lanes or become confused with a gameplay target.
- Give each rescue a short, distinct, emotionally satisfying reunion beat.
- Between stages, allow a calm interval before the next final enemy's kidnapping is revealed.
- Over the campaign, she may communicate clues, discover information about the final enemies, or help the farmer prepare. These are future narrative opportunities, not implemented features.
- Do not depict repeated rescues as meaningless or make the next abduction happen immediately during the reunion.

## 7. The treasure-cave reward ritual

The previously approved treasure-cave feature remains part of the post-stage celebration. It follows the rescue/result beat in the stage flow. The player sees the exact earned reward deposited once and the accumulated treasure total increase. The cave artwork will be supplied by the user; do not invent or replace its final art. Before implementation, decide whether the displayed treasure is the spendable Coin wallet or a separate lifetime-wealth statistic.

## 8. Production boundaries

- The current first battle remains the immediate implementation priority, but Stage 1's final enemy and rescue are part of completing this first playable stage—not deferred campaign extras.
- Keep five waves in Stage 1. Its approved target is 30 ordinary monsters total; Stage 2 has 31; Stage 3 has 32; each subsequent stage adds one ordinary monster. final encounters are additional and not included in these ordinary-monster totals. The old 100-monster target is replaced.
- Stage 1 is the smallest complete proof of the story: one territory, its monster force, one small ordinary final enemy, the captive wife, automatic ranged attack counterplay, and a clear rescue ending.
- The user's original art assets remain authoritative. Do not crop, recolor, resize, replace, or generate final character/background assets without an explicit request.
- Preserve all fixed gameplay constraints in the master plan, including no shadows beneath characters, the plant/monster lane rules, and exact-once reward accounting.

## 9. Decisions still open

These details require separate approval; this document does not assume answers:

- Whether each territory contains one stage or a sequence of stages.
- Whether the next final enemy kidnaps the wife on-screen or the kidnapping is revealed in a short transition.
- The exact hierarchy and shared motive of the final enemies.
- The final number and names of final enemies, territories, plants, and monster factions.
- The final encounter's exact battlefield entry, health model, attack phases, and counter mechanics.
- Whether the wife has any gameplay support role during a stage, or remains a narrative character in the background.


