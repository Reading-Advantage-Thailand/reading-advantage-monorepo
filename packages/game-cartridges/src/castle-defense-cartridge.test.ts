import { describe, expect, it } from "vitest";

import { createCastleDefenseMechanic } from "./castle-defense-cartridge.js";

describe("Castle Defense cartridge", () => {
  it("preserves current-source ordered collection, exact six-wave composition, and two-second transitions without a result callback", () => {
    const mechanic = createCastleDefenseMechanic([{ term: "hold fast", translation: "ยืนหยัด" }]);

    mechanic.collectWord(1);
    expect(mechanic.snapshot()).toMatchObject({ targetIndex: 0, sentenceComplete: false, completionSupported: false });
    mechanic.collectWord(0);
    mechanic.collectWord(1);
    mechanic.buildTower(true);

    expect(mechanic.snapshot()).toMatchObject({
      status: "playing",
      towersBuilt: 1,
      wave: 1,
      waveComposition: { soldiers: 10, tanks: 0, bosses: 0 },
    });

    for (let index = 0; index < 10; index += 1) mechanic.spawnNextEnemy();
    for (let index = 0; index < 10; index += 1) mechanic.defeatEnemy();
    expect(mechanic.snapshot()).toMatchObject({ waveMessageRemainingMs: 2_000, wavesCleared: 0 });
    mechanic.advanceWaveTransition(1_999);
    expect(mechanic.snapshot().waveMessageRemainingMs).toBe(1);
    mechanic.advanceWaveTransition(1);
    expect(mechanic.snapshot()).toMatchObject({ wave: 2, wavesCleared: 1, towersBuilt: 0, completionSupported: false });
  });

  it("applies only typed source-backed enemy damage and never emits a completion result", () => {
    const mechanic = createCastleDefenseMechanic([{ term: "defend", translation: "ป้องกัน" }]);
    mechanic.collectWord(0);
    mechanic.buildTower(true);

    mechanic.spawnNextEnemy();
    mechanic.enemyReachedBase("soldier");
    mechanic.spawnNextEnemy();
    mechanic.enemyReachedBase("tank");
    mechanic.spawnNextEnemy();
    mechanic.enemyReachedBase("boss");

    expect(mechanic.snapshot()).toMatchObject({ status: "playing", baseHealth: 45, activeEnemies: 0, completionSupported: false });
  });
});
