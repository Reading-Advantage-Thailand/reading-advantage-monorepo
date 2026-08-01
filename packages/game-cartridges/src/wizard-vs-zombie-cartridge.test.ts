import { describe, expect, it } from "vitest";

import { createWizardVsZombieMechanic } from "./wizard-vs-zombie-cartridge.js";

describe("Wizard vs Zombie cartridge", () => {
  it("keeps one correct orb, three decoys, correct healing, and incorrect reshuffles without host completion", () => {
    const mechanic = createWizardVsZombieMechanic([{ term: "run", translation: "correr" }, { term: "jump", translation: "saltar" }]);

    expect(mechanic.snapshot()).toMatchObject({ status: "playing", health: 100, activeOrbCount: 4, decoyCount: 3, completionSupported: false });
    mechanic.collectOrb(-1);
    mechanic.hordeHit();
    mechanic.hordeHit();
    mechanic.collectOrb(0);

    expect(mechanic.snapshot()).toMatchObject({ health: 100, shockwaveCharges: 1, invulnerabilityRemainingMs: 500, score: 10, reshuffleCount: 1, completionSupported: false });
  });

  it("uses the source gameover status after repeated horde damage without emitting a result", () => {
    const mechanic = createWizardVsZombieMechanic([{ term: "run", translation: "correr" }]);

    for (let hit = 0; hit < 10; hit += 1) {
      mechanic.hordeHit();
      mechanic.advanceTime(500);
    }

    expect(mechanic.snapshot()).toMatchObject({ status: "gameover", health: 0, completionSupported: false });
  });
});
