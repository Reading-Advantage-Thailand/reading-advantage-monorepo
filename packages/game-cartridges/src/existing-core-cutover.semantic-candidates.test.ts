/**
 * Fail-closed tests for the per-title semantic-adoption candidates.
 *
 * These tests prove that the candidates emitted for the existing-core cohort
 * are bound to the accepted 2026.07.23 standard-pack release, use only
 * owner-approved role/state pairs from `OWNER_APPROVED_CANONICAL_BINDINGS`,
 * materialize deterministic selected unions through the T11 resolver, and
 * never become consumable. Every test that would otherwise assert a Green
 * state is intentionally Red until product-owner acceptance, host proofs,
 * and exact-retirement evidence are recorded.
 *
 * The seven fail-closed invariants:
 *  1. Missing roles/states — every role/state in a candidate must exist in
 *     `OWNER_APPROVED_CANONICAL_BINDINGS`; unmapped identities are rejected.
 *  2. Stale catalog/release hashes — every candidate pins 2026.07.23 +
 *     exact catalog/source-receipt digests; mismatched bindings are rejected.
 *  3. Direct paths / private packs — no candidate output may contain a
 *     physical path, a private pack tree, or a vendor filename.
 *  4. Duplicate physical files — the materialized selected union must be
 *     deduplicated and free of duplicate physical paths.
 *  5. Full-pack delivery — the selected union must be strictly smaller than
 *     the full catalog (no full-pack deliverability).
 *  6. Unsupported mappings — every key in the candidate must come from the
 *     standard pack; no direct or invented mapping may be used.
 *  7. Premature consumability — the public `cartridgeCatalog` and
 *     `cartridgeLoaders` must remain empty; candidates may not be added.
 */

import { describe, expect, it } from "vitest";

import {
  ACCEPTED_STANDARD_ASSET_RELEASE,
  OWNER_APPROVED_CANONICAL_BINDINGS,
  createAcceptedSemanticAssetResolver,
  type StandardAssetCatalog,
  type StandardAssetCatalogEntry,
  type StandardAssetResolver,
} from "@reading-advantage/advantage-play-kit/assets";

import acceptedStandardAssetCatalog from "../../advantage-play-kit/assets/standard/standard-pack-release.json";

import { cartridgeCatalog, cartridgeLoaders } from "./catalog.js";
import {
  CANDIDATE_CLASSIFICATION,
  CANDIDATE_MATERIALIZATION,
  CANDIDATE_STATUS,
  EXISTING_CORE_CANDIDATE_PUBLIC_IDS,
  EXISTING_CORE_SEMANTIC_ADOPTION_CANDIDATES,
  UnmappedCandidateRoleStateError,
  assertCandidateNotConsumable,
  assertCandidateRoleStatesOwnerApproved,
  buildCandidateResolver,
  getExistingCoreSemanticAdoptionCandidate,
  getOwnerApprovedCanonicalBindings,
  materializeCandidateSelectedUnion,
  toSemanticAssetRequirements,
  type ExistingCoreCandidateSelectedUnion,
  type ExistingCoreSemanticAdoptionCandidate,
} from "./existing-core-cutover-semantic-candidates.js";

/** Exact five-title authorization list from the readiness receipt. */
const EXPECTED_PUBLIC_IDS = Object.freeze([
  "dragon-flight",
  "magic-defense",
  "dungeon-liberator",
  "sorcerer-ziggurat",
  "astral-mage",
] as const);

/** Build a synthetic base resolver containing only the owner-bound keys. */
function buildSyntheticBaseResolver(): StandardAssetResolver {
  const owner = getOwnerApprovedCanonicalBindings();
  const entries = new Map<string, StandardAssetCatalogEntry>();
  for (const binding of owner.bindings) {
    const isAudio = binding.usage === "audio";
    const isFont = binding.usage === "font";
    const kind: StandardAssetCatalogEntry["physical"]["kind"] = isAudio
      ? "audio"
      : isFont
        ? "font"
        : "image";
    const extension = isAudio ? "ogg" : isFont ? "woff2" : "png";
    entries.set(binding.semanticKey, {
      path: `${binding.semanticKey}.${extension}`,
      key: binding.semanticKey,
      view: binding.semanticKey.split("/")[0] as StandardAssetCatalogEntry["view"],
      cellSize: null,
      category: "candidate",
      extension,
      sourceReceiptLocator: `measure/evidence/${binding.semanticKey}.receipt`,
      physical: {
        kind,
        byteSize: 1024,
        sha256: "a".repeat(64),
        dimensions: isAudio || isFont ? null : { width: 32, height: 32 },
        frameGrid: null,
      },
    });
  }
  return Object.freeze({
    resolve(key: string) {
      const entry = entries.get(key);
      if (!entry) throw new Error(`Unknown standard asset semantic key ${key}`);
      return { ...entry, requiredCredit: ACCEPTED_STANDARD_ASSET_RELEASE.requiredCredit };
    },
  });
}

/** Materialize every candidate through the synthetic T11 resolver. */
function materializeEveryCandidate(): readonly ExistingCoreCandidateSelectedUnion[] {
  const resolver = buildCandidateResolver(buildSyntheticBaseResolver());
  return EXISTING_CORE_SEMANTIC_ADOPTION_CANDIDATES.map((candidate) =>
    materializeCandidateSelectedUnion(candidate, resolver),
  );
}

describe("existing-core semantic-adoption candidates (fail-closed)", () => {
  it("emits exactly the five authorized titles and never anything else", () => {
    expect(EXISTING_CORE_CANDIDATE_PUBLIC_IDS).toEqual([...EXPECTED_PUBLIC_IDS]);
    expect(new Set(EXISTING_CORE_CANDIDATE_PUBLIC_IDS).size).toBe(5);
    for (const publicId of EXPECTED_PUBLIC_IDS) {
      const candidate = getExistingCoreSemanticAdoptionCandidate(publicId);
      expect(candidate, `Missing candidate for ${publicId}`).toBeDefined();
    }
  });

  it("classifies every candidate as a non-consumable candidate", () => {
    for (const candidate of EXISTING_CORE_SEMANTIC_ADOPTION_CANDIDATES) {
      expect(candidate.classification).toBe(CANDIDATE_CLASSIFICATION);
      expect(candidate.status).toBe(CANDIDATE_STATUS);
      expect(candidate.consumable).toBe(false);
      expect(candidate.materialization).toBe(CANDIDATE_MATERIALIZATION);
    }
  });

  it("receives release identity only through the accepted T11 asset API", () => {
    expect(ACCEPTED_STANDARD_ASSET_RELEASE.version).toBe("2026.07.23");
    for (const candidate of EXISTING_CORE_SEMANTIC_ADOPTION_CANDIDATES) {
      expect(candidate).not.toHaveProperty("standardPackBinding");
      expect(JSON.stringify(candidate)).not.toContain("assets/standard");
    }
  });

  describe("fail-closed invariant 1: missing roles/states", () => {
    it("every role/state requirement is in OWNER_APPROVED_CANONICAL_BINDINGS", () => {
      const ownerIdentities = new Set(
        getOwnerApprovedCanonicalBindings().bindings.map(
          (binding) => `${binding.role}:${binding.state}`,
        ),
      );
      for (const candidate of EXISTING_CORE_SEMANTIC_ADOPTION_CANDIDATES) {
        const seen = new Set<string>();
        for (const requirement of candidate.roleStateRequirements) {
          const identity = `${requirement.role}:${requirement.state}`;
          expect(ownerIdentities.has(identity), `Candidate ${candidate.publicId} requires unmapped role/state ${identity}`).toBe(true);
          expect(seen.has(identity), `Candidate ${candidate.publicId} duplicates role/state ${identity}`).toBe(false);
          seen.add(identity);
          expect(requirement.evidenceClaimId).toMatch(/^[A-Z]{2}-[A-Z]+-\d{3}$/u);
        }
      }
    });

    it("rejects candidates that introduce a role/state not in the owner bindings", () => {
      const candidate = getExistingCoreSemanticAdoptionCandidate("dragon-flight")!;
      const tampered = {
        ...candidate,
        roleStateRequirements: [
          ...candidate.roleStateRequirements,
          {
            role: "imagined",
            state: "ghost",
            evidenceClaimId: "DF-MECH-999",
            evidenceFact: "Test only — invented role/state that must be rejected.",
            temporalScope: "current-source" as const,
          },
        ],
      };
      expect(() => assertCandidateRoleStatesOwnerApproved(tampered)).toThrow(
        UnmappedCandidateRoleStateError,
      );
    });

    it("exposes UnmappedCandidateRoleStateError for unmapped identities", () => {
      const err = new UnmappedCandidateRoleStateError("dragon-flight", "imagined:ghost");
      expect(err.name).toBe("UnmappedCandidateRoleStateError");
      expect(err.message).toMatch(/T10\/T11 approve zero legacy asset mappings/);
    });
  });

  describe("fail-closed invariant 2: stale catalog/release hashes", () => {
    it("rejects stale release identity before resolver materialization", async () => {
      const staleDigest = "f".repeat(64);
      const staleCatalog = {
        ...(acceptedStandardAssetCatalog as StandardAssetCatalog),
        digest: staleDigest,
      };
      const candidate = getExistingCoreSemanticAdoptionCandidate("dragon-flight")!;

      await expect((async () => {
        const resolver = await createAcceptedSemanticAssetResolver(staleCatalog, {
          version: ACCEPTED_STANDARD_ASSET_RELEASE.version,
          catalogDigest: staleDigest,
          sourceReceiptDigest: ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest,
        });
        return materializeCandidateSelectedUnion(candidate, resolver);
      })()).rejects.toThrow("Standard asset catalog is not the accepted release");
    });
  });

  describe("fail-closed invariant 3: direct paths / private packs", () => {
    /** Patterns that should never appear in a selected-union output. */
    const FORBIDDEN_PATH_PATTERNS = [
      /apps\//u,
      /\/private-pack\//u,
      /^private\//u,
      /\/legacy\//u,
      /\/dual-pack\//u,
      /\/dual-theme\//u,
      /\/assets\/apk\//u,
      /\/assets\/legacy\//u,
      /\bedition\//u,
      /\btheme\//u,
      /private-receipt/u,
    ] as const;

    function assertNoForbiddenPattern(value: string, label: string): void {
      for (const pattern of FORBIDDEN_PATH_PATTERNS) {
        expect(pattern.test(value), `${label} ${value} matches forbidden pattern ${pattern}`).toBe(false);
      }
    }

    it("no candidate output ever contains a direct path or a private pack tree", () => {
      const unions = materializeEveryCandidate();
      expect(unions.length).toBe(5);
      for (const union of unions) {
        assertNoForbiddenPattern(union.publicId, "publicId");
        for (const key of union.semanticKeys) {
          assertNoForbiddenPattern(key, "semantic key");
          // semantic keys must not have an extension
          expect(key).not.toMatch(/\.[a-z0-9]+$/u);
        }
        for (const resolved of union.resolved) {
          assertNoForbiddenPattern(resolved.semanticKey, "resolved semantic key");
          expect(resolved).not.toHaveProperty("path");
          expect(resolved).not.toHaveProperty("sourceReceiptLocator");
        }
        expect(union).not.toHaveProperty("physicalPaths");
      }
    });

    it("rejects tampered resolved key, descriptor, and source bindings", () => {
      const candidate = getExistingCoreSemanticAdoptionCandidate("dragon-flight")!;
      const base = buildSyntheticBaseResolver();
      const tamperedResolver = (
        tamper: (entry: ReturnType<StandardAssetResolver["resolve"]>) => ReturnType<StandardAssetResolver["resolve"]>,
      ): StandardAssetResolver => ({
        resolve(key) {
          return tamper(base.resolve(key));
        },
      });

      expect(() => materializeCandidateSelectedUnion(candidate, buildCandidateResolver(
        tamperedResolver((entry) => ({ ...entry, key: "imagined/forged-key" })),
      ))).toThrow(/resolved key.*does not match semantic binding/i);
      expect(() => materializeCandidateSelectedUnion(candidate, buildCandidateResolver(
        tamperedResolver((entry) => ({
          ...entry,
          path: `apps/advantage-games/private-pack/${entry.path}`,
        })),
      ))).toThrow(/descriptor.*semantic key/i);
      expect(() => materializeCandidateSelectedUnion(candidate, buildCandidateResolver(
        tamperedResolver((entry) => ({ ...entry, sourceReceiptLocator: "" })),
      ))).toThrow(/source receipt/i);
    });
  });

  describe("fail-closed invariant 4: duplicate physical files", () => {
    it("selected union is deduplicated by semantic key", () => {
      const unions = materializeEveryCandidate();
      for (const union of unions) {
        expect(new Set(union.semanticKeys).size).toBe(union.semanticKeys.length);
        const uniqueResolved = new Set(union.resolved.map((entry) => entry.semanticKey));
        expect(uniqueResolved.size).toBe(union.resolved.length);
      }
    });

    it("rejects distinct semantic keys that materialize the same physical source", () => {
      const duplicated: StandardAssetResolver = {
        resolve(key) {
          const isAudio = key.startsWith("audio/");
          return {
            path: `${key}.${isAudio ? "ogg" : "png"}`,
            key,
            view: "top-down",
            cellSize: null,
            category: "candidate",
            extension: isAudio ? "ogg" : "png",
            sourceReceiptLocator: "fixture:receipt",
            physical: {
              kind: isAudio ? "audio" : "image",
              byteSize: 1024,
              sha256: "a".repeat(64),
              dimensions: isAudio ? null : { width: 32, height: 32 },
              frameGrid: null,
            },
            requiredCredit: ACCEPTED_STANDARD_ASSET_RELEASE.requiredCredit,
          };
        },
      };
      const candidate = getExistingCoreSemanticAdoptionCandidate("dragon-flight")!;
      expect(() => materializeCandidateSelectedUnion(
        candidate,
        buildCandidateResolver(duplicated),
      )).toThrow(/duplicate physical source.*materialization/i);
    });
  });

  describe("fail-closed invariant 5: full-pack delivery", () => {
    it("selected union is strictly smaller than the full standard-pack catalog", () => {
      const unions = materializeEveryCandidate();
      for (const union of unions) {
        expect(union.semanticKeys.length).toBeLessThan(ACCEPTED_STANDARD_ASSET_RELEASE.acceptanceEvidence.assetCount);
        expect(union.semanticKeys.length).toBeLessThanOrEqual(5);
        expect(union.semanticKeys.length).toBeGreaterThan(0);
      }
    });
  });

  describe("fail-closed invariant 6: unsupported mappings", () => {
    it("every key in the selected union is bound to a canonical semantic key", () => {
      const ownerKeys = new Set(
        getOwnerApprovedCanonicalBindings().bindings.map((binding) => binding.semanticKey),
      );
      const unions = materializeEveryCandidate();
      for (const union of unions) {
        for (const key of union.semanticKeys) {
          expect(ownerKeys.has(key), `Semantic key ${key} not in owner-approved bindings`).toBe(true);
        }
        for (const resolved of union.resolved) {
          expect(ownerKeys.has(resolved.semanticKey), `Resolved key ${resolved.semanticKey} not in owner-approved bindings`).toBe(true);
        }
      }
    });

    it("rejects materializing a candidate whose role/state list references an unknown identity", () => {
      const candidate: ExistingCoreSemanticAdoptionCandidate = {
        ...getExistingCoreSemanticAdoptionCandidate("dragon-flight")!,
        roleStateRequirements: [
          {
            role: "imagined",
            state: "ghost",
            evidenceClaimId: "DF-MECH-999",
            evidenceFact: "Invented role/state must not be resolvable through owner bindings.",
            temporalScope: "current-source",
          },
        ],
      };
      const resolver = buildCandidateResolver(buildSyntheticBaseResolver());
      expect(() => materializeCandidateSelectedUnion(candidate, resolver)).toThrow(
        UnmappedCandidateRoleStateError,
      );
    });
  });

  describe("fail-closed invariant 7: premature consumability", () => {
    it("the public cartridge catalog and loaders remain quarantined", () => {
      expect(cartridgeCatalog).toEqual([]);
      expect(cartridgeLoaders).toEqual({});
    });

    it("no candidate is present in the public catalog or loaders", () => {
      for (const candidate of EXISTING_CORE_SEMANTIC_ADOPTION_CANDIDATES) {
        expect((cartridgeCatalog as readonly { readonly id: string }[]).find((entry) => entry.id === candidate.publicId)).toBeUndefined();
        expect((cartridgeLoaders as Record<string, unknown>)[candidate.publicId]).toBeUndefined();
      }
    });

    it("PrematureConsumabilityError rejects any candidate that is misclassified as consumable", () => {
      const candidate = getExistingCoreSemanticAdoptionCandidate("dragon-flight")!;
      const tampered = { ...candidate, consumable: true } as unknown as ExistingCoreSemanticAdoptionCandidate;
      expect(() => assertCandidateNotConsumable(tampered)).toThrow(/not consumable/);
      const reStatus = { ...candidate, status: "proved" } as unknown as ExistingCoreSemanticAdoptionCandidate;
      expect(() => assertCandidateNotConsumable(reStatus)).toThrow(/not consumable/);
      const reClass = { ...candidate, classification: "owner-approved-product-binding" } as unknown as ExistingCoreSemanticAdoptionCandidate;
      expect(() => assertCandidateNotConsumable(reClass)).toThrow(/not consumable/);
    });
  });

  describe("deterministic selected-union outputs", () => {
    it("selected-union output is identical across re-invocations", () => {
      const first = materializeEveryCandidate();
      const second = materializeEveryCandidate();
      expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    });

    it("each title's selected union is sorted by role/state and physical path", () => {
      const unions = materializeEveryCandidate();
      for (const union of unions) {
        const sortedSemantic = [...union.semanticKeys].sort((left, right) => left.localeCompare(right));
        expect(union.semanticKeys).toEqual(sortedSemantic);
        const sortedResolved = union.resolved.map((entry) => entry.role + ":" + entry.state).join(",");
        const expectedResolved = [...union.resolved]
          .map((entry) => entry.role + ":" + entry.state)
          .sort((left, right) => left.localeCompare(right))
          .join(",");
        expect(sortedResolved).toBe(expectedResolved);
      }
    });

    it("toSemanticAssetRequirements returns the deduplicated role/state list", () => {
      const candidate = getExistingCoreSemanticAdoptionCandidate("magic-defense")!;
      const requirements = toSemanticAssetRequirements(candidate);
      const seen = new Set(requirements.map((req) => `${req.role}:${req.state}`));
      expect(seen.size).toBe(requirements.length);
      const sorted = [...seen].sort((left, right) => left.localeCompare(right));
      expect(requirements.map((req) => `${req.role}:${req.state}`)).toEqual(sorted);
    });
  });

  describe("evidence anchoring", () => {
    it("every role/state requirement carries an evidence claim id from the accepted ledger", () => {
      const acceptedClaimIds = new Set<string>();
      for (const candidate of EXISTING_CORE_SEMANTIC_ADOPTION_CANDIDATES) {
        // each candidate must reference at least one accepted mechanic fact
        expect(candidate.acceptedEvidenceSha256).toMatch(/^[a-f0-9]{64}$/u);
        for (const requirement of candidate.roleStateRequirements) {
          acceptedClaimIds.add(requirement.evidenceClaimId);
        }
      }
      // at least one claim id per title
      for (const candidate of EXISTING_CORE_SEMANTIC_ADOPTION_CANDIDATES) {
        const claimCount = candidate.roleStateRequirements.length;
        expect(claimCount, `${candidate.publicId} should have at least one evidence claim`).toBeGreaterThan(0);
      }
    });
  });

  describe("owner-approved canonical bindings", () => {
    it("the owner-approved binding manifest is the only forward binding source", () => {
      expect(OWNER_APPROVED_CANONICAL_BINDINGS.classification).toBe("owner-approved-product-binding");
      expect(OWNER_APPROVED_CANONICAL_BINDINGS.legacyEvidenceClaim).toBe(false);
      expect(OWNER_APPROVED_CANONICAL_BINDINGS.authority).toBe("t11-owner-authorized-extension-v1");
      expect(OWNER_APPROVED_CANONICAL_BINDINGS.release.version).toBe(ACCEPTED_STANDARD_ASSET_RELEASE.version);
      expect(OWNER_APPROVED_CANONICAL_BINDINGS.release.catalogDigest).toBe(ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest);
      expect(OWNER_APPROVED_CANONICAL_BINDINGS.release.sourceReceiptDigest).toBe(ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest);
    });
  });
});
