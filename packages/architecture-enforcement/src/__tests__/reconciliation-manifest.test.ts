import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  computeRulesetHash,
  serializeArchitectureBaseline,
} from "../baseline.js";
import {
  architectureBaselineSchema,
  architectureConfigSchema,
  baselineEntrySchema,
  exactExceptionSchema,
  type ArchitectureConfig,
  type ArchitectureFinding,
  type BaselineEntry,
  type ExactException,
} from "../contracts.js";
import { createFindingIdentity } from "../finding-identity.js";
import {
  directViolationCandidateSchema,
  type DirectViolationCandidate,
} from "../inventory.js";
import {
  analyzerReconciliationManifestSchema,
  computeAnalyzerReconciliationReviewSubjectSha256,
  hashAnalyzerReconciliationManifest,
  RECONCILIATION_ANALYZER_SHA,
  RECONCILIATION_DIRECT_REVIEW_PATH,
  RECONCILIATION_DENOMINATOR_DIFF_AUDIT_PATH,
  RECONCILIATION_EXECUTION_BASE_SHA,
  RECONCILIATION_MANIFEST_PATH,
  RECONCILIATION_REVIEW_EVIDENCE_PATHS,
  RECONCILIATION_SOURCE_BASE_SHA,
  serializeAnalyzerReconciliationManifest,
  validateAnalyzerReconciliation,
  type AnalyzerReconciliationManifest,
  type ValidateAnalyzerReconciliationInput,
} from "../reconciliation-manifest.js";

/** Converts JSON-compatible test data into key-sorted compact JSON. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Hashes canonical JSON-compatible test data. */
function canonicalSha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

/** Hashes exact UTF-8 test fixture bytes. */
function textSha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Creates a strict finding with recomputed semantic and instance identities. */
function finding(
  input: Omit<
    ArchitectureFinding,
    "schemaVersion" | "semanticKey" | "instanceKey"
  >,
): ArchitectureFinding {
  return {
    schemaVersion: 1,
    ...input,
    ...createFindingIdentity(input),
  };
}

/** Creates a reviewed baseline entry from a strict finding. */
function reviewedEntry(
  current: ArchitectureFinding,
  owner: string,
  rationale: string,
): BaselineEntry {
  return baselineEntrySchema.parse({ ...current, owner, rationale });
}

interface ReconciliationFixture {
  input: ValidateAnalyzerReconciliationInput;
  manifest: AnalyzerReconciliationManifest;
  historicalEntry: BaselineEntry;
  productionAddition: BaselineEntry;
  addedException: ExactException;
  coveredFindings: ArchitectureFinding[];
}

/** Builds a complete minimal historical-to-analyzer reconciliation fixture. */
function fixture(): ReconciliationFixture {
  const databaseRule = {
    schemaVersion: 1,
    id: "DATABASE_BOUNDARY",
    domain: "database",
    description: "Database clients stay inside the approved database package.",
    severity: "error",
    findingKinds: ["static-import"],
    moduleMatchers: [{ kind: "exact", value: "postgres" }],
    resourceMatchers: [],
    resolvedTargetRoots: [],
    ownershipRootIds: ["database-package"],
  } as const;
  const providerRule = {
    schemaVersion: 1,
    id: "AI_PROVIDER_BOUNDARY",
    domain: "provider",
    description: "Provider clients stay inside the approved provider adapter.",
    severity: "error",
    findingKinds: ["static-import"],
    moduleMatchers: [{ kind: "exact", value: "openai" }],
    resourceMatchers: [],
    resolvedTargetRoots: [],
    ownershipRootIds: ["provider-package"],
  } as const;
  const historicalException = exactExceptionSchema.parse({
    schemaVersion: 1,
    id: "database-contract-test",
    ruleId: "DATABASE_BOUNDARY",
    sourcePath: "apps/sales/src/__tests__/database.test.ts",
    owner: "sales-platform",
    rationale: "The exact test verifies legacy database adapter behavior.",
  });
  const addedException = exactExceptionSchema.parse({
    schemaVersion: 1,
    id: "ai-contract-test",
    ruleId: "AI_PROVIDER_BOUNDARY",
    sourcePath: "apps/sales/src/__tests__/ai.test.ts",
    owner: "sales-platform",
    rationale: "The exact test verifies normalized provider adapter behavior.",
  });
  const commonConfig = {
    schemaVersion: 1,
    rules: [databaseRule, providerRule],
    ownershipRoots: [
      {
        schemaVersion: 1,
        id: "database-package",
        domain: "database",
        path: "packages/db/src/",
        kind: "database",
        ruleIds: ["DATABASE_BOUNDARY"],
        owner: "database-platform",
        rationale: "The database package owns direct database client access.",
      },
      {
        schemaVersion: 1,
        id: "provider-package",
        domain: "provider",
        path: "packages/ai/src/providers/",
        kind: "adapter",
        ruleIds: ["AI_PROVIDER_BOUNDARY"],
        owner: "ai-platform",
        rationale: "The provider package owns direct provider client access.",
      },
    ],
    baselineFiles: {
      database:
        "packages/architecture-enforcement/src/config/baselines/database.v1.json",
      provider:
        "packages/architecture-enforcement/src/config/baselines/provider.v1.json",
    },
  } as const;
  const historicalConfig: ArchitectureConfig = architectureConfigSchema.parse({
    ...commonConfig,
    exactExceptions: [historicalException],
  });
  const config: ArchitectureConfig = architectureConfigSchema.parse({
    ...commonConfig,
    exactExceptions: [historicalException, addedException],
  });

  const historicalCandidate = directViolationCandidateSchema.parse({
    schemaVersion: 1,
    ruleId: "DATABASE_BOUNDARY",
    domain: "database",
    sourcePath: "apps/sales/src/report.ts",
    line: 1,
    column: 1,
    evidenceKind: "static-import",
    importSpecifier: "postgres",
    owner: "sales-platform",
    rationale: "Reviewed direct database access pending adapter migration.",
    proposedDisposition: "baseline-review",
  });
  const historicalExceptionCandidate = directViolationCandidateSchema.parse({
    schemaVersion: 1,
    ruleId: "DATABASE_BOUNDARY",
    domain: "database",
    sourcePath: historicalException.sourcePath,
    line: 2,
    column: 1,
    evidenceKind: "static-import",
    importSpecifier: "postgres",
    owner: "sales-platform",
    rationale: "Reviewed direct database test access under an exact exception.",
    proposedDisposition: "exact-exception-review",
  });
  const historicalFinding = finding({
    ruleId: "DATABASE_BOUNDARY",
    domain: "database",
    sourcePath: historicalCandidate.sourcePath,
    line: historicalCandidate.line,
    column: historicalCandidate.column,
    evidenceKind: "static-import",
    importSpecifier: "postgres",
    resolvedTarget: "external:postgres",
  });
  const historicalEntry = reviewedEntry(
    historicalFinding,
    historicalCandidate.owner,
    historicalCandidate.rationale,
  );
  const productionFinding = finding({
    ruleId: "AI_PROVIDER_BOUNDARY",
    domain: "provider",
    sourcePath: "apps/sales/src/ai.ts",
    line: 4,
    column: 1,
    evidenceKind: "static-import",
    importSpecifier: "openai",
    resolvedTarget: "external:openai",
  });
  const productionAddition = reviewedEntry(
    productionFinding,
    "sales-platform",
    "Reviewed analyzer-only provider access pending adapter migration.",
  );
  const coveredFindings = [3, 8]
    .map((line) =>
      finding({
        ruleId: "AI_PROVIDER_BOUNDARY",
        domain: "provider",
        sourcePath: addedException.sourcePath,
        line,
        column: 1,
        evidenceKind: "static-import",
        importSpecifier: "openai",
        resolvedTarget: "external:openai",
      }),
    )
    .sort((left, right) => left.instanceKey.localeCompare(right.instanceKey));

  const historicalDatabase = architectureBaselineSchema.parse({
    schemaVersion: 1,
    domain: "database",
    rulesetHash: computeRulesetHash(historicalConfig, "database"),
    entries: [historicalEntry],
  });
  const historicalProvider = architectureBaselineSchema.parse({
    schemaVersion: 1,
    domain: "provider",
    rulesetHash: computeRulesetHash(historicalConfig, "provider"),
    entries: [],
  });
  const baselines = {
    database: architectureBaselineSchema.parse({
      ...historicalDatabase,
      rulesetHash: computeRulesetHash(config, "database"),
    }),
    provider: architectureBaselineSchema.parse({
      schemaVersion: 1,
      domain: "provider",
      rulesetHash: computeRulesetHash(config, "provider"),
      entries: [productionAddition],
    }),
  };
  const directReview = {
    schemaVersion: 1,
    candidates: [historicalCandidate, historicalExceptionCandidate],
  };
  const directReviewSource = `${JSON.stringify(directReview, null, 2)}\n`;
  const historicalDatabaseBaselineSource =
    serializeArchitectureBaseline(historicalDatabase);
  const historicalProviderBaselineSource =
    serializeArchitectureBaseline(historicalProvider);

  const factKey = (candidate: DirectViolationCandidate): string =>
    canonicalSha256(candidate);
  const additionKeys = [
    productionAddition.instanceKey,
    ...coveredFindings.map((current) => current.instanceKey),
  ].sort();
  const denominatorDiffAuditSource =
    "Verdict: ACCEPTED\nProduct architecture debt changes: 0\n";
  const manifestDraft = analyzerReconciliationManifestSchema.parse({
    schemaVersion: 1,
    reconciliationId: "backend-architecture-analyzer-v1",
    sourceBaseSha: RECONCILIATION_SOURCE_BASE_SHA,
    analyzerCommitSha: RECONCILIATION_ANALYZER_SHA,
    analyzerImplementationTreeSha256: "b".repeat(64),
    reconciliationImplementationTreeSha256: "9".repeat(64),
    historical: {
      directReviewPath: RECONCILIATION_DIRECT_REVIEW_PATH,
      directReviewSha256: textSha256(directReviewSource),
      directCandidateCount: 2,
      baselineCandidateCounts: { database: 1, provider: 0 },
      exactExceptionCandidateCount: 1,
      rulesetHashes: {
        database: computeRulesetHash(historicalConfig, "database"),
        provider: computeRulesetHash(historicalConfig, "provider"),
      },
      baselineFileHashes: {
        database: textSha256(historicalDatabaseBaselineSource),
        provider: textSha256(historicalProviderBaselineSource),
      },
      baselineEntryCounts: { database: 1, provider: 0 },
      baselineProofs: [
        {
          directFactKey: factKey(historicalCandidate),
          instanceKey: historicalEntry.instanceKey,
          entrySha256: canonicalSha256(historicalEntry),
        },
      ],
      exceptionProofs: [
        {
          directFactKey: factKey(historicalExceptionCandidate),
          ruleId: historicalException.ruleId,
          sourcePath: historicalException.sourcePath,
          exceptionId: historicalException.id,
          exceptionSha256: canonicalSha256(historicalException),
        },
      ],
    },
    reproduction: {
      policyMode: "historical-policy-before-reconciliation-exceptions",
      provenance: {
        sourcePathSetSha256: "c".repeat(64),
        reportSha256s: ["d".repeat(64), "d".repeat(64)],
        parseErrors: [
          {
            schemaVersion: 1,
            sourcePath:
              "packages/architecture-enforcement/src/__tests__/ratchet.red.test.ts",
            line: 49,
            column: 10,
            code: "MODULE_RESOLUTION_ERROR",
          },
        ],
      },
      execution: {
        sourceBaseSha: RECONCILIATION_EXECUTION_BASE_SHA,
        sourcePathSetSha256: "e".repeat(64),
        reportSha256s: ["f".repeat(64), "f".repeat(64)],
        parseErrorCount: 0,
      },
      current: {
        sourceCommitSha: "7".repeat(40),
        sourcePathSetSha256: "8".repeat(64),
        reportSha256s: ["9".repeat(64), "9".repeat(64)],
        parseErrorCount: 0,
      },
      denominatorDiffAudit: {
        path: RECONCILIATION_DENOMINATOR_DIFF_AUDIT_PATH,
        sha256: textSha256(denominatorDiffAuditSource),
        result: "accepted",
        productArchitectureDebtChanges: 0,
      },
      additionInstanceSetSha256: canonicalSha256(additionKeys),
    },
    productionAdditions: [productionAddition],
    exactExceptionAdditions: [{ exception: addedException, coveredFindings }],
    finalState: {
      policySha256: canonicalSha256(config),
      rulesetHashes: {
        database: computeRulesetHash(config, "database"),
        provider: computeRulesetHash(config, "provider"),
      },
      baselineHashes: {
        database: canonicalSha256(baselines.database),
        provider: canonicalSha256(baselines.provider),
      },
      baselineEntryCounts: { database: 1, provider: 1 },
      totalExactExceptionCount: 2,
      addedExactExceptionCount: 1,
      coveredTestFindingCount: 2,
      productionAdditionCount: 1,
      removalCount: 0,
      renameCount: 0,
    },
    safetyAssertions: {
      noWildcardExceptions: true,
      noBroadRoots: true,
      noSourceBodies: true,
      noUnreviewedEntries: true,
    },
    reviews: [
      {
        role: "adversarial-testing",
        reviewer: "adversarial-reviewer",
        result: "accepted",
        reviewSubjectSha256: "0".repeat(64),
        evidencePath:
          RECONCILIATION_REVIEW_EVIDENCE_PATHS["adversarial-testing"],
        evidenceSha256: "1".repeat(64),
      },
      {
        role: "correctness",
        reviewer: "correctness-reviewer",
        result: "accepted",
        reviewSubjectSha256: "0".repeat(64),
        evidencePath: RECONCILIATION_REVIEW_EVIDENCE_PATHS.correctness,
        evidenceSha256: "2".repeat(64),
      },
      {
        role: "developer-api",
        reviewer: "developer-reviewer",
        result: "accepted",
        reviewSubjectSha256: "0".repeat(64),
        evidencePath: RECONCILIATION_REVIEW_EVIDENCE_PATHS["developer-api"],
        evidenceSha256: "3".repeat(64),
      },
      {
        role: "security",
        reviewer: "security-reviewer",
        result: "accepted",
        reviewSubjectSha256: "0".repeat(64),
        evidencePath: RECONCILIATION_REVIEW_EVIDENCE_PATHS.security,
        evidenceSha256: "4".repeat(64),
      },
    ],
  });
  const reviewSubjectSha256 = computeAnalyzerReconciliationReviewSubjectSha256(
    manifestDraft,
    config,
    baselines,
  );
  const reviewEvidenceSources = {
    "adversarial-testing": `Review subject: ${reviewSubjectSha256}\nVerdict: **ACCEPTED**\n`,
    correctness: `Review subject: ${reviewSubjectSha256}\nVerdict: **ACCEPTED**\n`,
    "developer-api": `Review subject: ${reviewSubjectSha256}\nVerdict: **ACCEPTED**\n`,
    security: `Review subject: ${reviewSubjectSha256}\nVerdict: **ACCEPTED**\n`,
  };
  const manifest = analyzerReconciliationManifestSchema.parse({
    ...manifestDraft,
    reviews: manifestDraft.reviews.map((review) => ({
      ...review,
      reviewSubjectSha256,
      evidenceSha256: textSha256(reviewEvidenceSources[review.role]),
    })),
  });
  return {
    manifest,
    historicalEntry,
    productionAddition,
    addedException,
    coveredFindings,
    input: {
      manifest,
      config,
      baselines,
      analyzerImplementationTreeSha256: "b".repeat(64),
      reconciliationImplementationTreeSha256: "9".repeat(64),
      directReviewSource,
      historicalDatabaseBaselineSource,
      historicalProviderBaselineSource,
      denominatorDiffAuditSource,
      reviewEvidenceSources,
    },
  };
}

describe("analyzer reconciliation manifest", () => {
  it("validates exact historical provenance and emits deterministic bytes", () => {
    const current = fixture();
    const summary = validateAnalyzerReconciliation(current.input);
    const serialized = serializeAnalyzerReconciliationManifest(
      current.manifest,
    );

    expect(RECONCILIATION_MANIFEST_PATH).toBe(
      "packages/architecture-enforcement/src/config/analyzer-reconciliation.v1.json",
    );
    expect(summary).toMatchObject({
      schemaVersion: 1,
      sourceBaseSha: RECONCILIATION_SOURCE_BASE_SHA,
      databaseEntries: 1,
      providerEntries: 1,
      productionAdditions: 1,
      exactExceptionAdditions: 1,
      coveredTestFindings: 2,
    });
    expect(serialized).toBe(
      serializeAnalyzerReconciliationManifest(JSON.parse(serialized)),
    );
    expect(summary.manifestSha256).toBe(
      hashAnalyzerReconciliationManifest(current.manifest),
    );
  });

  it("rejects a different source base and duplicate or non-canonical arrays", () => {
    const current = fixture();
    expect(() =>
      analyzerReconciliationManifestSchema.parse({
        ...current.manifest,
        sourceBaseSha: "f".repeat(40),
      }),
    ).toThrow();
    expect(() =>
      analyzerReconciliationManifestSchema.parse({
        ...current.manifest,
        productionAdditions: [
          current.productionAddition,
          current.productionAddition,
        ],
      }),
    ).toThrow(/unique/i);
    expect(() =>
      analyzerReconciliationManifestSchema.parse({
        ...current.manifest,
        exactExceptionAdditions: [
          {
            exception: current.addedException,
            coveredFindings: [...current.coveredFindings].reverse(),
          },
        ],
      }),
    ).toThrow(/sorted/i);
  });

  it("rejects forged finding identities and tampered historical review bytes", () => {
    const current = fixture();
    const forged = structuredClone(current.manifest);
    forged.productionAdditions[0]!.semanticKey = "0".repeat(64);
    expect(() =>
      validateAnalyzerReconciliation({ ...current.input, manifest: forged }),
    ).toThrow(/identity mismatch/i);
    expect(() =>
      validateAnalyzerReconciliation({
        ...current.input,
        directReviewSource: `${current.input.directReviewSource} `,
      }),
    ).toThrow(/direct-review file hash/i);
    expect(() =>
      validateAnalyzerReconciliation({
        ...current.input,
        analyzerImplementationTreeSha256: "f".repeat(64),
      }),
    ).toThrow(/implementation tree hash/i);
  });

  it("rejects policy root drift even when the final manifest is otherwise unchanged", () => {
    const current = fixture();
    const driftedConfig = architectureConfigSchema.parse({
      ...current.input.config,
      ownershipRoots: current.input.config.ownershipRoots.map((root) =>
        root.id === "provider-package"
          ? { ...root, path: "packages/ai/src/" }
          : root,
      ),
    });
    expect(() =>
      validateAnalyzerReconciliation({
        ...current.input,
        config: driftedConfig,
      }),
    ).toThrow(/historical policy cannot be reconstructed/i);

    const driftedRuleConfig = architectureConfigSchema.parse({
      ...current.input.config,
      rules: current.input.config.rules.map((rule) =>
        rule.id === "AI_PROVIDER_BOUNDARY"
          ? {
              ...rule,
              moduleMatchers: [{ kind: "exact", value: "@ai-sdk/openai" }],
            }
          : rule,
      ),
    });
    expect(() =>
      validateAnalyzerReconciliation({
        ...current.input,
        config: driftedRuleConfig,
      }),
    ).toThrow(/historical policy cannot be reconstructed/i);
  });

  it("rejects unmanifested final baseline entries and changed historical entries", () => {
    const current = fixture();
    const unmanifestedFinding = finding({
      ruleId: "AI_PROVIDER_BOUNDARY",
      domain: "provider",
      sourcePath: "apps/marketing/src/ai.ts",
      line: 1,
      column: 1,
      evidenceKind: "static-import",
      importSpecifier: "openai",
      resolvedTarget: "external:openai",
    });
    const unmanifestedEntry = reviewedEntry(
      unmanifestedFinding,
      "marketing-platform",
      "Unmanifested provider access must fail reconciliation validation.",
    );
    const baselines = structuredClone(current.input.baselines);
    baselines.provider.entries = [
      ...baselines.provider.entries,
      unmanifestedEntry,
    ].sort((left, right) => left.instanceKey.localeCompare(right.instanceKey));
    expect(() =>
      validateAnalyzerReconciliation({ ...current.input, baselines }),
    ).toThrow(/additions do not match|baseline hash/i);

    const changedHistorical = structuredClone(current.input.baselines);
    changedHistorical.database.entries[0]!.owner = "different-owner";
    expect(() =>
      validateAnalyzerReconciliation({
        ...current.input,
        baselines: changedHistorical,
      }),
    ).toThrow(/not preserved exactly/i);
  });

  it("rejects extra policy exceptions and exception coverage outside its exact pair", () => {
    const current = fixture();
    const extraException = exactExceptionSchema.parse({
      schemaVersion: 1,
      id: "unmanifested-ai-test",
      ruleId: "AI_PROVIDER_BOUNDARY",
      sourcePath: "apps/marketing/src/__tests__/ai.test.ts",
      owner: "marketing-platform",
      rationale: "This unmanifested exact exception must fail validation.",
    });
    const config = architectureConfigSchema.parse({
      ...current.input.config,
      exactExceptions: [
        ...current.input.config.exactExceptions,
        extraException,
      ],
    });
    expect(() =>
      validateAnalyzerReconciliation({ ...current.input, config }),
    ).toThrow(/historical policy cannot be reconstructed/i);

    const wrongScope = structuredClone(current.manifest);
    wrongScope.exactExceptionAdditions[0]!.coveredFindings[0]!.sourcePath =
      "apps/sales/src/__tests__/different.test.ts";
    expect(() =>
      analyzerReconciliationManifestSchema.parse(wrongScope),
    ).toThrow(/match the exact exception/i);
  });

  it("rejects unbound audit, tooling, reviewer, proof, and count evidence", () => {
    const current = fixture();
    expect(() =>
      validateAnalyzerReconciliation({
        ...current.input,
        denominatorDiffAuditSource: `${current.input.denominatorDiffAuditSource}tampered\n`,
      }),
    ).toThrow(/denominator diff audit hash/i);
    expect(() =>
      validateAnalyzerReconciliation({
        ...current.input,
        reconciliationImplementationTreeSha256: "8".repeat(64),
      }),
    ).toThrow(/reconciliation implementation tree hash/i);
    expect(() =>
      validateAnalyzerReconciliation({
        ...current.input,
        reviewEvidenceSources: {
          ...current.input.reviewEvidenceSources,
          security: `${current.input.reviewEvidenceSources.security}tampered\n`,
        },
      }),
    ).toThrow(/security review evidence is not bound/i);

    const missingBaselineProof = structuredClone(current.manifest);
    missingBaselineProof.historical.baselineProofs = [];
    expect(() =>
      validateAnalyzerReconciliation({
        ...current.input,
        manifest: missingBaselineProof,
      }),
    ).toThrow(/baseline proof count is incomplete/i);

    const missingExceptionProof = structuredClone(current.manifest);
    missingExceptionProof.historical.exceptionProofs = [];
    expect(() =>
      validateAnalyzerReconciliation({
        ...current.input,
        manifest: missingExceptionProof,
      }),
    ).toThrow(/exception proof count is incomplete/i);

    const wrongCount = structuredClone(current.manifest);
    wrongCount.finalState.productionAdditionCount = 2;
    expect(() =>
      validateAnalyzerReconciliation({
        ...current.input,
        manifest: wrongCount,
      }),
    ).toThrow(/final reconciliation counts/i);

    const wrongPolicyHash = structuredClone(current.manifest);
    wrongPolicyHash.finalState.policySha256 = "0".repeat(64);
    expect(() =>
      validateAnalyzerReconciliation({
        ...current.input,
        manifest: wrongPolicyHash,
      }),
    ).toThrow(/final policy hash/i);
  });
});
