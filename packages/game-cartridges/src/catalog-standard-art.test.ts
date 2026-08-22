import { describe, expect, it } from "vitest";
import { validateEdition } from "@reading-advantage/advantage-play-kit/editions";
import { APK_RUNTIME_API_VERSION } from "@reading-advantage/advantage-play-kit/runtime";

import { cartridgeCatalog } from "./catalog.js";
import {
  createCatalogStandardEdition,
  listCatalogStandardArtDecisions,
} from "./catalog-standard-art.js";

describe("catalog standard art", () => {
  it("records ground, prop, player, and enemy reuse decisions for every catalog title", () => {
    const decisions = listCatalogStandardArtDecisions();
    for (const entry of cartridgeCatalog) {
      const ground = decisions.find((decision) => decision.titleId === entry.id && decision.role === "ground");
      const player = decisions.find((decision) => decision.titleId === entry.id && decision.role === "player");
      const enemy = decisions.find((decision) => decision.titleId === entry.id && decision.role === "enemy");
      expect(ground).toMatchObject({ state: "static", decision: "reuse-canonical" });
      expect(player).toMatchObject({ state: "idle", decision: "reuse-canonical" });
      expect(enemy).toMatchObject({ state: "idle", decision: "reuse-canonical" });
    }
  });

  it("builds a selected-union edition with distinct player and enemy files", () => {
    const edition = createCatalogStandardEdition(
      ["legacy-catalog/castle-defense/fortress", "legacy-catalog/wizard-vs-zombie/zombie-orbs"],
      "/assets/apk/standard-pack-qc/",
    );
    expect(edition.pack.files["player-idle"]?.path).toBe("asset-6aeab3f50c0f6be4.png");
    expect(edition.pack.files["enemy-idle"]?.path).toBe("asset-0edfb7ed11f9c4cf.png");
    expect(edition.pack.files["player-idle"]?.sha256).not.toBe(edition.pack.files["enemy-idle"]?.sha256);
    expect(edition.bindings["player:idle"]?.file).toBe("player-idle");
    expect(edition.bindings["enemy:idle"]?.file).toBe("enemy-idle");
    expect(edition.bindings["world:ground"]?.file).toBe("tile-grass");
    expect(edition.bindings["legacy-catalog/castle-defense/fortress"]?.file).toBe("player-idle");
    expect(edition.bindings["legacy-catalog/wizard-vs-zombie/zombie-orbs"]?.file).toBe("enemy-idle");
    expect(() => validateEdition(
      edition,
      ["legacy-catalog/castle-defense/fortress", "player:idle", "enemy:idle", "world:ground"],
      APK_RUNTIME_API_VERSION,
    )).not.toThrow();
  });

  it("assigns grass, a dirt road, keep, gate, towers, and a knight to Castle Defense", () => {
    const edition = createCatalogStandardEdition(
      ["legacy-catalog/castle-defense/fortress"],
      "/assets/apk/standard-pack-qc/",
      "castle-defense",
    );
    expect(edition.bindings["world:ground"]?.file).toBe("tile-grass");
    expect(edition.bindings["world:road"]?.file).toBe("tile-dirt");
    expect(edition.bindings["prop:keep"]?.file).toBe("prop-keep");
    expect(edition.bindings["prop:gate"]?.file).toBe("prop-gate");
    expect(edition.bindings["prop:tower"]?.file).toBe("prop-tower");
    expect(edition.bindings["prop:tree"]?.file).toBe("prop-tree");
    expect(edition.bindings["prop:prisoner"]?.file).toBe("player-mage");
    expect(edition.bindings["player:idle"]?.file).toBe("player-knight");
    expect(edition.bindings["enemy:idle"]?.file).toBe("enemy-beast");
  });

  it("assigns grass, dirt platforms, trees, a knight, and a beast to RPG Battle", () => {
    const edition = createCatalogStandardEdition(
      ["legacy-catalog/rpg-battle/arena"],
      "/assets/apk/standard-pack-qc/",
      "rpg-battle",
    );
    expect(edition.bindings["world:ground"]?.file).toBe("tile-grass");
    expect(edition.bindings["world:platform"]?.file).toBe("tile-dirt");
    expect(edition.bindings["prop:tree"]?.file).toBe("prop-tree");
    expect(edition.bindings["player:idle"]?.file).toBe("player-knight");
    expect(edition.bindings["enemy:idle"]?.file).toBe("enemy-beast");
  });

  it("uses the slime as the Devourer Slime player and a knight as the enemy", () => {
    const edition = createCatalogStandardEdition(
      ["devourer-slime/player"],
      "/assets/apk/standard-pack-qc/",
      "devourer-slime",
    );
    expect(edition.bindings["player:idle"]?.file).toBe("enemy-idle");
    expect(edition.bindings["enemy:idle"]?.file).toBe("player-knight");
    expect(edition.bindings["world:ground"]?.file).toBe("tile-grass");
  });

  it("loads aerial titles with grass, trees, and a flying enemy instead of a blank overlay", () => {
    const edition = createCatalogStandardEdition(
      ["dragon-rider/player-flight"],
      "/assets/apk/standard-pack-qc/",
      "dragon-rider",
    );
    expect(edition.bindings["world:ground"]?.file).toBe("tile-grass");
    expect(edition.bindings["prop:gate"]?.file).toBe("prop-sky-gate");
    expect(edition.bindings["player:idle"]?.file).toBe("dragon-rider-idle");
    expect(edition.bindings["enemy:idle"]?.file).toBe("enemy-bat");
  });

  it("assigns stone, gravestones, a grey mage, a skeleton, and a blue crystal to Wizard vs Zombie", () => {
    const edition = createCatalogStandardEdition(
      ["legacy-catalog/wizard-vs-zombie/zombie-orbs"],
      "/assets/apk/standard-pack-qc/",
      "wizard-vs-zombie",
    );
    expect(edition.bindings["world:ground"]?.file).toBe("tile-grave-dirt");
    expect(edition.bindings["prop:grave"]?.file).toBe("prop-grave");
    expect(edition.bindings["prop:crypt"]?.file).toBe("prop-tower");
    expect(edition.bindings["prop:orb"]?.file).toBe("prop-crystal-blue");
    expect(edition.bindings["player:idle"]?.file).toBe("player-mage");
    expect(edition.bindings["enemy:idle"]?.file).toBe("enemy-skeleton");
    expect(edition.bindings["legacy-catalog/wizard-vs-zombie/zombie-orbs"]?.file).toBe("enemy-skeleton");
  });
});
