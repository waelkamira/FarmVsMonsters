import test from "node:test";
import assert from "node:assert/strict";
import { PHASE_ONE_PLANTS } from "../game/rules/phaseOneCombatContract.mjs";

test("every unlocked plant defines a positive seed packet recharge", () => {
  const rechargeTimes = [
    PHASE_ONE_PLANTS.radish.seedPacketRechargeMs,
    PHASE_ONE_PLANTS.energyMushroom.seedPacketRechargeMs,
    PHASE_ONE_PLANTS.pumpkin.seedPacketRechargeMs,
    PHASE_ONE_PLANTS.pineapple.seedPacketRechargeMs,
    PHASE_ONE_PLANTS.hazelnut.seedPacketRechargeMs,
    PHASE_ONE_PLANTS.mango.seedPacketRechargeMs,
    PHASE_ONE_PLANTS.snowThrower.seedPacketRechargeMs
  ];

  assert.equal(rechargeTimes.length, 7);
  for (const rechargeMs of rechargeTimes) {
    assert.ok(Number.isInteger(rechargeMs));
    assert.ok(rechargeMs > 0);
  }
});

test("durable defensive plants recharge more slowly than basic attackers", () => {
  assert.ok(
    PHASE_ONE_PLANTS.pumpkin.seedPacketRechargeMs >
    PHASE_ONE_PLANTS.radish.seedPacketRechargeMs
  );
  assert.ok(
    PHASE_ONE_PLANTS.snowThrower.seedPacketRechargeMs >
    PHASE_ONE_PLANTS.radish.seedPacketRechargeMs
  );
});

test("seed packet recharge values are explicit and stable for the stage-one roster", () => {
  assert.deepEqual(
    {
      radish: PHASE_ONE_PLANTS.radish.seedPacketRechargeMs,
      mushroom: PHASE_ONE_PLANTS.energyMushroom.seedPacketRechargeMs,
      pumpkin: PHASE_ONE_PLANTS.pumpkin.seedPacketRechargeMs,
      pineapple: PHASE_ONE_PLANTS.pineapple.seedPacketRechargeMs,
      hazelnut: PHASE_ONE_PLANTS.hazelnut.seedPacketRechargeMs,
      mango: PHASE_ONE_PLANTS.mango.seedPacketRechargeMs,
      snowThrower: PHASE_ONE_PLANTS.snowThrower.seedPacketRechargeMs
    },
    {
      radish: 5000,
      mushroom: 8000,
      pumpkin: 20000,
      pineapple: 10000,
      hazelnut: 9000,
      mango: 12000,
      snowThrower: 18000
    }
  );
});
