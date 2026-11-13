# Core gameplay roles and battle rules

These are the definitive gameplay rules. They supersede older descriptions that allowed the caveman to fight while plants remained alive.

## Plants — stationary defenders
- Plants are rooted to their selected cells and never walk, chase, dodge, or relocate themselves.
- Idle motion is limited to gentle breathing, leaf movement, blinking, and expression changes.
- Each plant attacks from its fixed position using its own anatomy: mouth-fired thorns/seeds, arm/fist punches, spores, fruit, sap, or another distinctive attack.
- Only the required body parts animate during an attack. Plants take damage and die in place.
- Plant animation sheets must not include a Walk cycle.

## Monsters — advancing attackers
- Monsters enter from the side opposite the farmhouse and move through lanes toward the protected end.
- Opening-stage movement is deliberately slow and heavy, with alternating steps, body/head sway, and loose arm movement, evoking the broad feel of classic cartoon zombie walking without copying protected art or animation.
- Monster speed increases gradually across waves. Fast archetypes are introduced as special later-stage threats.
- Monsters stop to attack/eat valid targets in their lane, then continue when those targets are destroyed.

## Caveman farmer — planter and last line of defense
- The caveman plants defensive plants and performs farm interactions.
- While at least one living defensive plant remains, the caveman cannot damage monsters. No auto-attacks, club hits, or combat targeting are allowed.
- When the final living defensive plant dies, emergency mode enables direct club combat.
- The caveman's emergency weapon is a physical club swing only.
- Successfully planting a new defensive plant immediately exits emergency mode and disables caveman combat again.
- The caveman may move and perform farm interactions while plants are alive; movement does not grant permission to attack.

## Protected objective
- The farmhouse and princess stay at the protected end of the field.
- Monsters enter from the opposite end.
- The farmhouse protection objective is the final defeat condition; clearing the planned waves is victory.

## Animation sheet contracts
- Plant: Idle/Breathing, Attack, Hurt, Death, optional Special. No Walk.
- Monster: Idle, slow Walk, Attack/Eat, Hurt, Death, optional Special.
- Caveman: Idle, Walk, Plant/Interact, Club Attack, Hurt, Death.
- Use entity-specific sheet layouts; do not force every character into one universal atlas.
