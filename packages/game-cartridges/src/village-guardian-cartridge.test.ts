import { describe, expect, it } from "vitest";

import { createVillageGuardianMechanic } from "./village-guardian-cartridge.js";

describe("Village Guardian cartridge", () => {
  it("retains playing/defeat state, wrong-order timer addition, trail reset, and sanctuary level progression without victory", () => {
    const mechanic = createVillageGuardianMechanic([{ term: "safe home", translation: "บ้านปลอดภัย" }]);

    mechanic.rescueVillager(1);
    expect(mechanic.snapshot()).toMatchObject({ status: "playing", wrongAnswers: 1, timeRemainingMs: 32_000, completionSupported: false });
    mechanic.rescueVillager(0);
    mechanic.rescueVillager(1);
    mechanic.monsterAttack(1);
    expect(mechanic.snapshot()).toMatchObject({ targetIndex: 1, processionCount: 1, status: "playing" });
    mechanic.rescueVillager(1);
    mechanic.reachSanctuary(true);
    expect(mechanic.snapshot()).toMatchObject({ status: "playing", level: 2, targetIndex: 0, completionSupported: false });
  });

  it("sets defeat only from the source timer branch and does not send a completion result", () => {
    const mechanic = createVillageGuardianMechanic([{ term: "guard", translation: "ปกป้อง" }]);
    mechanic.advanceTime(30_000);

    expect(mechanic.snapshot()).toMatchObject({ status: "defeat", timeRemainingMs: 0, completionSupported: false });
  });
});
