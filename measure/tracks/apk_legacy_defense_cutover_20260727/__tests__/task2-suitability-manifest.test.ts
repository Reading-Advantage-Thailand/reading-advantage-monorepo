import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const manifestPath = fileURLToPath(
  new URL("../task2-suitability-manifest-v1.json", import.meta.url),
);

describe("Task 2 defense suitability manifest", () => {
  it("records every scoped title, its frozen legacy evidence, and fail-closed legacy-art decisions", async () => {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      readonly schema_version: string;
      readonly track_id: string;
      readonly status: string;
      readonly authority_boundary: {
        readonly predecessor_release: {
          readonly version: string;
          readonly catalog_digest: string;
          readonly source_receipt_digest: string;
        };
        readonly production_use_authorized: boolean;
        readonly catalog_exposure_authorized: boolean;
        readonly host_integration_authorized: boolean;
        readonly legacy_ingestion_authorized: boolean;
      };
      readonly titles: readonly {
        readonly title_id: string;
        readonly legacy_source_manifest: readonly unknown[];
        readonly canonical_role_decisions: readonly unknown[];
        readonly selected_semantic_keys: readonly string[];
        readonly legacy_asset_disposition: string;
      }[];
    };

    expect(manifest.schema_version).toBe("apk-legacy-defense-task2-suitability.v1");
    expect(manifest.track_id).toBe("apk_legacy_defense_cutover_20260727");
    expect(manifest.status).toBe("canonical-reuse-suitable-for-task3-to-task5-qc");
    expect(manifest.authority_boundary).toMatchObject({
      predecessor_release: {
        version: "2026.07.23",
        catalog_digest: "ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087",
        source_receipt_digest: "93562cc3070a4907d06d6196a2c5d917a07c4b487cf4be031805d60fdc75eea9",
      },
      production_use_authorized: false,
      catalog_exposure_authorized: false,
      host_integration_authorized: false,
      legacy_ingestion_authorized: false,
    });
    expect(manifest.titles.map((title) => title.title_id)).toEqual([
      "castle-defense",
      "wizard-vs-zombie",
      "village-guardian",
      "storm-castle-tower",
    ]);
    for (const title of manifest.titles) {
      expect(title.legacy_source_manifest.length).toBeGreaterThan(0);
      expect(title.canonical_role_decisions.length).toBeGreaterThan(0);
      expect(title.selected_semantic_keys).toEqual([...title.selected_semantic_keys].sort((left, right) => left.localeCompare(right)));
      expect(title.selected_semantic_keys.every((key) => !key.includes(".") && !key.includes("legacy"))).toBe(true);
      expect(title.legacy_asset_disposition).toBe("blocked");
    }
  });
});
