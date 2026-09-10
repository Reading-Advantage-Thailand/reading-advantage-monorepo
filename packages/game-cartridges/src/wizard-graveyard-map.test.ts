import { describe, expect, it } from "vitest";

import {
  WIZARD_GRAVEYARD_MAP,
  isPointInsideWizardGraveyardSolid,
  isWizardGraveyardPointReachable,
} from "./wizard-graveyard-map.js";

describe("Wizard graveyard map", () => {
  it("keeps the player, zombies, and four answer clearings outside solids", () => {
    const points = [
      WIZARD_GRAVEYARD_MAP.playerSpawn,
      ...WIZARD_GRAVEYARD_MAP.enemySpawns,
      ...WIZARD_GRAVEYARD_MAP.clearings.map((clearing) => clearing.center),
    ];
    expect(WIZARD_GRAVEYARD_MAP.clearings).toHaveLength(4);
    for (const candidate of points) expect(isPointInsideWizardGraveyardSolid(candidate, 12)).toBe(false);
  });

  it("connects the entrance, each answer clearing, and every zombie spawn", () => {
    const destinations = [
      ...WIZARD_GRAVEYARD_MAP.clearings.map((clearing) => clearing.center),
      ...WIZARD_GRAVEYARD_MAP.enemySpawns,
    ];
    for (const destination of destinations) {
      expect(isWizardGraveyardPointReachable(WIZARD_GRAVEYARD_MAP.playerSpawn, destination)).toBe(true);
    }
  });

  it("keeps each visible path centerline outside solid footprints", () => {
    for (const path of WIZARD_GRAVEYARD_MAP.paths) {
      for (let index = 1; index < path.points.length; index += 1) {
        const start = path.points[index - 1]!;
        const end = path.points[index]!;
        const distance = Math.hypot(end.x - start.x, end.y - start.y);
        const samples = Math.ceil(distance / 8);
        for (let sample = 0; sample <= samples; sample += 1) {
          const progress = sample / samples;
          const candidate = {
            x: start.x + (end.x - start.x) * progress,
            y: start.y + (end.y - start.y) * progress,
          };
          expect(isPointInsideWizardGraveyardSolid(candidate, 4)).toBe(false);
        }
      }
    }
  });

  it("provides graveyard landmarks, varied graves, paths, and alternate loops", () => {
    const kinds = WIZARD_GRAVEYARD_MAP.decor.map((item) => item.kind);
    const graveAssets = new Set(WIZARD_GRAVEYARD_MAP.decor
      .filter((item) => item.kind === "grave")
      .map((item) => item.assetKey));
    expect(kinds).toEqual(expect.arrayContaining(["entrance", "fence", "grave", "memorial", "mausoleum", "dead-tree", "lantern"]));
    expect(graveAssets.size).toBeGreaterThanOrEqual(3);
    expect(WIZARD_GRAVEYARD_MAP.paths).toHaveLength(7);
    expect(WIZARD_GRAVEYARD_MAP.paths.filter((path) => path.id.endsWith("loop"))).toHaveLength(2);
  });

  it("preserves the mausoleum ratio and repeats fence frames", () => {
    const mausoleum = WIZARD_GRAVEYARD_MAP.decor.find((item) => item.kind === "mausoleum");
    const fences = WIZARD_GRAVEYARD_MAP.decor.filter((item) => item.kind === "fence");
    expect(mausoleum).toMatchObject({ displayWidth: 96, displayHeight: 128 });
    expect(fences).toHaveLength(5);
    expect(fences.every((item) => item.repeat === "x" && item.displayHeight === 32)).toBe(true);
  });

  it("keeps the crypt floor, gate, and coffin inside the crypt footprint", () => {
    const mausoleum = WIZARD_GRAVEYARD_MAP.decor.find((item) => item.kind === "mausoleum")!;
    const crypt = {
      left: mausoleum.position.x - mausoleum.displayWidth / 2,
      right: mausoleum.position.x + mausoleum.displayWidth / 2,
      top: mausoleum.position.y - mausoleum.displayHeight / 2,
      bottom: mausoleum.position.y + mausoleum.displayHeight / 2,
    };
    const insideCrypt = (x: number, y: number): boolean =>
      x >= crypt.left && x <= crypt.right && y >= crypt.top && y <= crypt.bottom;
    const kinds = WIZARD_GRAVEYARD_MAP.decor.map((item) => item.kind);
    expect(kinds).toContain("crypt-floor");
    expect(WIZARD_GRAVEYARD_MAP.terrain.some((layer) => layer.assetKey === "wizard-floor")).toBe(true);
    expect(insideCrypt(480, 188)).toBe(true);
    const coffin = WIZARD_GRAVEYARD_MAP.decor.find((item) => item.kind === "enemy-spawn")!;
    expect(insideCrypt(coffin.position.x, coffin.position.y)).toBe(true);
  });
});
