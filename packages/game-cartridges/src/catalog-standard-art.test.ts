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

  it("binds the reviewed Enchanted Library bookshelf crop to both prop roles", () => {
    const edition = createCatalogStandardEdition(
      ["enchanted-library/arcane-shelves"],
      "/assets/apk/standard-pack-qc/",
      "enchanted-library",
    );
    expect(edition.bindings["prop:0"]?.file).toBe("enchanted-library-bookshelf");
    expect(edition.bindings["prop:1"]?.file).toBe("enchanted-library-bookshelf");
    expect(edition.pack.files["enchanted-library-bookshelf"]).toMatchObject({
      path: "enchanted-library-bookshelf.png",
      width: 16,
      height: 32,
      view: "top-down",
    });
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

  it("assigns the reviewed crypt kit and correctly framed actors to Wizard vs Zombie", () => {
    const edition = createCatalogStandardEdition(
      ["legacy-catalog/wizard-vs-zombie/zombie-orbs"],
      "/assets/apk/standard-pack-qc/",
      "wizard-vs-zombie",
    );
    expect(edition.bindings["world:ground"]?.file).toBe("tile-grass");
    expect(edition.bindings["prop:grave"]?.file).toBe("wizard-grave");
    expect(edition.bindings["prop:grave-b"]?.file).toBe("wizard-grave-b");
    expect(edition.bindings["prop:grave-c"]?.file).toBe("wizard-grave-c");
    expect(edition.bindings["prop:mausoleum"]?.file).toBe("wizard-mausoleum");
    expect(edition.bindings["prop:dead-tree-large"]?.file).toBe("wizard-dead-tree-large");
    expect(edition.bindings["prop:fence"]?.file).toBe("wizard-fence");
    expect(edition.bindings["prop:lantern"]?.file).toBe("wizard-lantern");
    expect(edition.bindings["world:path"]?.file).toBe("tile-dirt");
    expect(edition.bindings["wizard-floor"]?.file).toBe("wizard-floor");
    expect(edition.bindings["prop:crypt"]?.file).toBe("wizard-crypt");
    expect(edition.bindings["prop:orb"]?.file).toBe("prop-crystal-blue");
    expect(edition.bindings["player:idle"]?.file).toBe("wizard-player");
    expect(edition.bindings["enemy:idle"]?.file).toBe("wizard-undead");
    expect(edition.bindings["legacy-catalog/wizard-vs-zombie/zombie-orbs"]?.file).toBe("wizard-undead");
    expect(edition.pack.files["wizard-player"]?.grid).toMatchObject({ frameWidth: 24, frameHeight: 24, columns: 4, rows: 4 });
    expect(edition.pack.files["wizard-undead"]?.grid).toMatchObject({ frameWidth: 48, frameHeight: 48, columns: 6, rows: 6 });
    expect(edition.pack.files["wizard-crypt"]?.grid).toMatchObject({ frameWidth: 16, frameHeight: 32, columns: 4 });
    expect(() => validateEdition(edition, [], APK_RUNTIME_API_VERSION)).not.toThrow();
  });
});
