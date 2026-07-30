import { describe, expect, it } from "vitest";

import {
  serializeStandardPackLegacySourcePacketPayload,
  validateStandardPackLegacySourcePacket,
} from "./index.js";
import {
  standardPackCanonicalIngestionReceiptSchema,
  standardPackSuitabilityDossierSchema,
} from "./standard-pack-suitability.js";

const DIGEST_A = "a".repeat(64);
const DIGEST_B = "b".repeat(64);
const DIGEST_C = "c".repeat(64);
const DIGEST_D = "d".repeat(64);
const INVENTORY_ROW = {
  titleId: "dragon-flight",
  assetId: "boss",
  repositoryPath: "apps/advantage-games/public/games/vocabulary/dragon-flight/boss-3x3-sheet-facing-up.png",
  runtimeUrl: "/games/vocabulary/dragon-flight/boss-3x3-sheet-facing-up.png",
  sourceSha256: "4268a22c8d3eef16c999dc5ab6d8f15dbcb33b34b22b7a3b053bc2daa5a20ea0",
  width: 495,
  height: 504,
  observedRole: "boss-sprite-sheet",
} as const;

/** Computes a deterministic SHA-256 digest for one packet payload. */
async function sha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Creates one integrity-valid but deliberately unreviewed source-packet fixture. */
async function createPacket(overrides: Record<string, unknown> = {}) {
  const draft = {
    schemaVersion: 1 as const,
    packetId: "dragon-flight-boss-source-packet",
    receivedAt: "2026-07-29T18:30:00.000Z",
    receivedBy: "asset-intake",
    inventoryBinding: INVENTORY_ROW,
    documents: [
      { documentId: "boss-provenance", kind: "provenance", locator: "measure/intake/dragon-flight/boss/provenance.pdf", sha256: DIGEST_A },
      { documentId: "boss-license", kind: "license", locator: "measure/intake/dragon-flight/boss/license.pdf", sha256: DIGEST_B },
      { documentId: "boss-credit", kind: "credit", locator: "measure/intake/dragon-flight/boss/credit.txt", sha256: DIGEST_C },
    ],
    lifecycle: "intake-complete-unreviewed" as const,
    authorization: {
      productionUseAuthorized: false as const,
      ingestionAuthorized: false as const,
      migrationAuthorized: false as const,
      cutoverAuthorized: false as const,
      retirementAuthorized: false as const,
      deploymentAuthorized: false as const,
    },
    packetDigest: "",
    ...overrides,
  };
  return { ...draft, packetDigest: await sha256(serializeStandardPackLegacySourcePacketPayload(draft)) };
}

describe("standard-pack legacy source-packet intake", () => {
  it("accepts only an exact, hash-bound inventory row with complete unreviewed evidence", async () => {
    const packet = await createPacket();

    const validated = await validateStandardPackLegacySourcePacket(packet, INVENTORY_ROW);

    expect(validated.inventoryBinding).toEqual(INVENTORY_ROW);
    expect(validated.lifecycle).toBe("intake-complete-unreviewed");
    expect(validated.authorization).toEqual({
      productionUseAuthorized: false,
      ingestionAuthorized: false,
      migrationAuthorized: false,
      cutoverAuthorized: false,
      retirementAuthorized: false,
      deploymentAuthorized: false,
    });
    expect(standardPackSuitabilityDossierSchema.safeParse(validated).success).toBe(false);
    expect(standardPackCanonicalIngestionReceiptSchema.safeParse(validated).success).toBe(false);
  });

  it("rejects source identity mismatch, duplicate document kinds, unsafe locators, authority escalation, and digest tampering", async () => {
    const expectedInventory = { ...INVENTORY_ROW };
    const wrongSource = await createPacket({ inventoryBinding: { ...INVENTORY_ROW, sourceSha256: DIGEST_D } });
    const duplicateKind = await createPacket({ documents: [
      { documentId: "boss-provenance", kind: "provenance", locator: "measure/intake/dragon-flight/boss/provenance.pdf", sha256: DIGEST_A },
      { documentId: "boss-license", kind: "provenance", locator: "measure/intake/dragon-flight/boss/license.pdf", sha256: DIGEST_B },
      { documentId: "boss-credit", kind: "credit", locator: "measure/intake/dragon-flight/boss/credit.txt", sha256: DIGEST_C },
    ] });
    const unsafeLocator = await createPacket({ documents: [
      { documentId: "boss-provenance", kind: "provenance", locator: "../outside.pdf", sha256: DIGEST_A },
      { documentId: "boss-license", kind: "license", locator: "measure/intake/dragon-flight/boss/license.pdf", sha256: DIGEST_B },
      { documentId: "boss-credit", kind: "credit", locator: "measure/intake/dragon-flight/boss/credit.txt", sha256: DIGEST_C },
    ] });
    const repeatedSeparator = await createPacket({ documents: [
      { documentId: "boss-provenance", kind: "provenance", locator: "measure//intake/dragon-flight/boss/provenance.pdf", sha256: DIGEST_A },
      { documentId: "boss-license", kind: "license", locator: "measure/intake/dragon-flight/boss/license.pdf", sha256: DIGEST_B },
      { documentId: "boss-credit", kind: "credit", locator: "measure/intake/dragon-flight/boss/credit.txt", sha256: DIGEST_C },
    ] });
    const trailingSeparator = await createPacket({ documents: [
      { documentId: "boss-provenance", kind: "provenance", locator: "measure/intake/dragon-flight/boss/", sha256: DIGEST_A },
      { documentId: "boss-license", kind: "license", locator: "measure/intake/dragon-flight/boss/license.pdf", sha256: DIGEST_B },
      { documentId: "boss-credit", kind: "credit", locator: "measure/intake/dragon-flight/boss/credit.txt", sha256: DIGEST_C },
    ] });
    const elevated = await createPacket({ authorization: {
      productionUseAuthorized: true,
      ingestionAuthorized: false,
      migrationAuthorized: false,
      cutoverAuthorized: false,
      retirementAuthorized: false,
      deploymentAuthorized: false,
    } });
    const tampered = { ...(await createPacket()), packetDigest: DIGEST_D };

    await expect(validateStandardPackLegacySourcePacket(wrongSource, expectedInventory)).rejects.toThrow(/inventory/i);
    await expect(validateStandardPackLegacySourcePacket(duplicateKind, expectedInventory)).rejects.toThrow();
    await expect(validateStandardPackLegacySourcePacket(unsafeLocator, expectedInventory)).rejects.toThrow();
    await expect(validateStandardPackLegacySourcePacket(repeatedSeparator, expectedInventory)).rejects.toThrow();
    await expect(validateStandardPackLegacySourcePacket(trailingSeparator, expectedInventory)).rejects.toThrow();
    await expect(validateStandardPackLegacySourcePacket(elevated, expectedInventory)).rejects.toThrow();
    await expect(validateStandardPackLegacySourcePacket(tampered, expectedInventory)).rejects.toThrow(/digest/i);
  });
});
