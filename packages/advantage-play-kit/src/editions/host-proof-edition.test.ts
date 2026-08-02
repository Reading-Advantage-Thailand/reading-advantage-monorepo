import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ACCEPTED_STANDARD_ASSET_RELEASE } from "../assets/accepted-standard-pack-release.js";
import type { StandardAssetCatalog } from "../assets/standard-pack-release.js";
import { APK_RUNTIME_API_VERSION } from "../runtime/types.js";
import { validateEdition } from "./editions.js";
import * as publicEditions from "./index.js";
import {
  DRAGON_FLIGHT_HOST_PROOF_ASSET_KEYS,
  DRAGON_FLIGHT_HOST_PROOF_PACK_ID,
  getDragonFlightHostProofSelectedEdition,
} from "./host-proof-edition.js";

const VIEWS_BY_KEY = {
  "audio/native/combat/hit-01": "ui",
  "effects/32x32/combat/hit-01": "screen",
  "top-down/32x32/characters/hero-01": "top-down",
} as const;

/**
 * Reads the release catalog through Node so Vitest does not transform the full catalog JSON.
 * @returns The immutable generated standard-pack catalog fixture.
 */
function readAcceptedCatalog(): StandardAssetCatalog {
  return JSON.parse(readFileSync(
    resolve(process.cwd(), "assets/standard/standard-pack-release.json"),
    "utf8",
  )) as StandardAssetCatalog;
}

describe("Dragon Flight host-proof standard-pack edition", () => {
  it("does not expose a full-catalog edition factory from the public editions API", () => {
    expect(publicEditions).toHaveProperty("getDragonFlightHostProofSelectedEdition");
    expect(publicEditions).not.toHaveProperty("createDragonFlightHostProofEdition");
  });

  it("provides a catalog-free selected edition whose complete runtime metadata matches the accepted catalog", () => {
    const catalog = readAcceptedCatalog();
    const edition = getDragonFlightHostProofSelectedEdition();

    expect(edition).toBe(getDragonFlightHostProofSelectedEdition());
    expect(edition).toMatchObject({
      id: "dragon-flight-host-proof-standard",
      title: "Dragon Flight Standard Pack",
      runtimeApiVersion: APK_RUNTIME_API_VERSION,
      pack: {
        id: DRAGON_FLIGHT_HOST_PROOF_PACK_ID,
        version: ACCEPTED_STANDARD_ASSET_RELEASE.version,
        root: `/assets/apk/${DRAGON_FLIGHT_HOST_PROOF_PACK_ID}/`,
      },
    });
    expect(Object.keys(edition.pack.files)).toEqual([...DRAGON_FLIGHT_HOST_PROOF_ASSET_KEYS]);
    expect(Object.keys(edition.bindings)).toEqual([...DRAGON_FLIGHT_HOST_PROOF_ASSET_KEYS]);
    expect(validateEdition(edition, DRAGON_FLIGHT_HOST_PROOF_ASSET_KEYS, APK_RUNTIME_API_VERSION)).toBe(edition);

    for (const key of DRAGON_FLIGHT_HOST_PROOF_ASSET_KEYS) {
      const catalogEntry = catalog.assets.find((entry) => entry.key === key);
      expect(catalogEntry).toBeDefined();
      if (!catalogEntry) throw new Error(`Missing accepted catalog record for ${key}`);

      const view = VIEWS_BY_KEY[key];
      const dimensions = catalogEntry.physical.dimensions;
      expect(edition.pack.files[key]).toEqual({
        id: key,
        path: catalogEntry.path,
        kind: catalogEntry.physical.kind === "audio" ? "audio" : "image",
        view,
        width: dimensions?.width ?? 1,
        height: dimensions?.height ?? 1,
        format: catalogEntry.extension === "ogg" ? "ogg" : "png",
        alpha: catalogEntry.physical.kind === "image",
        byteSize: catalogEntry.physical.byteSize,
        sha256: catalogEntry.physical.sha256,
        provenance: {
          source: `standard-pack-release.json:${catalogEntry.sourceReceiptLocator}`,
          license: ACCEPTED_STANDARD_ASSET_RELEASE.requiredCredit,
          creator: "ElvGames",
        },
      });
      expect(edition.bindings[key]).toEqual({
        key,
        file: key,
        usage: "image",
        view,
      });
    }
  });
});
