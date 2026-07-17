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
} from "../contracts.js";
import { createFindingIdentity } from "../finding-identity.js";
import {
  directViolationCandidateSchema,
  type DirectViolationCandidate,
} from "../inventory.js";
import {
  buildAnalyzerReconciliationManifest,
  type BuildAnalyzerReconciliationManifestInput,
} from "../reconciliation-manifest-builder.js";
import {
  compareArchitectureDebt,
  type ArchitectureBaselines,
} from "../ratchet.js";
import { RECONCILIATION_REVIEW_EVIDENCE_PATHS } from "../reconciliation-manifest.js";

/** Creates a strict finding with its recomputed identities. */
function finding(
  input: Omit<
    ArchitectureFinding,
    "schemaVersion" | "semanticKey" | "instanceKey"
  >,
): ArchitectureFinding {
  return { schemaVersion: 1, ...input, ...createFindingIdentity(input) };
}

/** Creates an accountable baseline entry from one strict finding. */
function reviewedEntry(
  current: ArchitectureFinding,
  owner: string,
  rationale: string,
): BaselineEntry {
  return baselineEntrySchema.parse({ ...current, owner, rationale });
}

interface BuilderFixture {
  input: BuildAnalyzerReconciliationManifestInput;
  historicalBaselines: ArchitectureBaselines;
  historicalFinding: ArchitectureFinding;
  productionFinding: ArchitectureFinding;
  testFindings: ArchitectureFinding[];
}

/** Clones structured builder inputs while retaining subject-aware evidence factories. */
function cloneInput(
  input: BuildAnalyzerReconciliationManifestInput,
): BuildAnalyzerReconciliationManifestInput {
  return {
    ...structuredClone({
      ...input,
      reviewEvidenceSources: undefined,
    }),
    reviewEvidenceSources: input.reviewEvidenceSources,
  };
}

/** Creates canonical report bytes for a supplied immutable-base finding set. */
function reportFor(
  findings: readonly ArchitectureFinding[],
  baselines: ArchitectureBaselines,
): { report: unknown; source: string } {
  const comparison = compareArchitectureDebt({ baselines, findings });
  const report = {
    schemaVersion: 1,
    status: "debt-change",
    filesScanned: 4,
    findings: [...findings],
    parseErrors: [],
    comparison,
  } as const;
  return { report, source: `${JSON.stringify(report, null, 2)}\n` };
}

/** Creates canonical literal-base bytes with the one expected self-hosting error. */
function provenanceReportFor(findings: readonly ArchitectureFinding[]): {
  report: unknown;
  source: string;
} {
  const report = {
    schemaVersion: 1,
    status: "analysis-error",
    filesScanned: 4,
    findings: [...findings],
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
  } as const;
  return { report, source: `${JSON.stringify(report, null, 2)}\n` };
}

/** Builds a complete generic reconciliation with one production and two test additions. */
function fixture(): BuilderFixture {
  const databaseRule = {
    schemaVersion: 1,
    id: "DATABASE_BOUNDARY",
    domain: "database",
    description: "Database access stays inside the approved database package.",
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
    description: "Provider access stays inside the approved provider adapter.",
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
    rationale: "The exact test verifies historical database adapter behavior.",
  });
  const config: ArchitectureConfig = architectureConfigSchema.parse({
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
    exactExceptions: [historicalException],
    baselineFiles: {
      database:
        "packages/architecture-enforcement/src/config/baselines/database.v1.json",
      provider:
        "packages/architecture-enforcement/src/config/baselines/provider.v1.json",
    },
  });
  const baselineCandidate = directViolationCandidateSchema.parse({
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
  const exceptionCandidate = directViolationCandidateSchema.parse({
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
    sourcePath: baselineCandidate.sourcePath,
    line: baselineCandidate.line,
    column: baselineCandidate.column,
    evidenceKind: "static-import",
    importSpecifier: "postgres",
    resolvedTarget: "external:postgres",
  });
  const historicalEntry = reviewedEntry(
    historicalFinding,
    baselineCandidate.owner,
    baselineCandidate.rationale,
  );
  const productionFinding = finding({
    ruleId: "AI_PROVIDER_BOUNDARY",
    domain: "provider",
    sourcePath: "apps/sales/src/ai.ts",
    line: 5,
    column: 1,
    evidenceKind: "static-import",
    importSpecifier: "openai",
    resolvedTarget: "external:openai",
  });
  const testFindings = [4, 9]
    .map((line) =>
      finding({
        ruleId: "AI_PROVIDER_BOUNDARY",
        domain: "provider",
        sourcePath: "apps/sales/src/__tests__/ai.test.ts",
        line,
        column: 1,
        evidenceKind: "static-import",
        importSpecifier: "openai",
        resolvedTarget: "external:openai",
      }),
    )
    .sort((left, right) => left.instanceKey.localeCompare(right.instanceKey));
  const historicalBaselines: ArchitectureBaselines = {
    database: architectureBaselineSchema.parse({
      schemaVersion: 1,
      domain: "database",
      rulesetHash: computeRulesetHash(config, "database"),
      entries: [historicalEntry],
    }),
    provider: architectureBaselineSchema.parse({
      schemaVersion: 1,
      domain: "provider",
      rulesetHash: computeRulesetHash(config, "provider"),
      entries: [],
    }),
  };
  const immutableReport = reportFor(
    [historicalFinding, productionFinding, ...testFindings],
    historicalBaselines,
  );
  const provenanceReport = provenanceReportFor([
    historicalFinding,
    productionFinding,
    ...testFindings,
  ]);
  const directReview = {
    schemaVersion: 1,
    candidates: [baselineCandidate, exceptionCandidate],
  };
  return {
    historicalBaselines,
    historicalFinding,
    productionFinding,
    testFindings,
    input: {
      provenanceReports: [provenanceReport, structuredClone(provenanceReport)],
      executionReports: [immutableReport, structuredClone(immutableReport)],
      historicalConfigSource: `${JSON.stringify(config, null, 2)}\n`,
      historicalDatabaseBaselineSource: serializeArchitectureBaseline(
        historicalBaselines.database,
      ),
      historicalProviderBaselineSource: serializeArchitectureBaseline(
        historicalBaselines.provider,
      ),
      directReviewSource: `${JSON.stringify(directReview, null, 2)}\n`,
      denominatorDiffAuditSource:
        "Verdict: ACCEPTED\nProduct architecture debt changes: 0\n",
      provenanceSourcePathSetSha256: "a".repeat(64),
      executionSourcePathSetSha256: "c".repeat(64),
      analyzerImplementationTreeSha256: "b".repeat(64),
      reconciliationImplementationTreeSha256: "9".repeat(64),
      productionReviews: [
        {
          instanceKey: productionFinding.instanceKey,
          owner: "sales-platform",
          rationale:
            "Reviewed analyzer-only provider access pending migration.",
        },
      ],
      exactExceptionReviews: [
        {
          ruleId: "AI_PROVIDER_BOUNDARY",
          sourcePath: "apps/sales/src/__tests__/ai.test.ts",
          id: "reviewed-ai-contract-test",
          owner: "sales-platform",
          rationale:
            "The exact test verifies normalized provider adapter behavior.",
        },
      ],
      reviews: [
        {
          role: "security",
          reviewer: "security-reviewer",
          result: "accepted",
          evidencePath: RECONCILIATION_REVIEW_EVIDENCE_PATHS.security,
        },
        {
          role: "correctness",
          reviewer: "correctness-reviewer",
          result: "accepted",
          evidencePath: RECONCILIATION_REVIEW_EVIDENCE_PATHS.correctness,
        },
        {
          role: "adversarial-testing",
          reviewer: "adversarial-reviewer",
          result: "accepted",
          evidencePath:
            RECONCILIATION_REVIEW_EVIDENCE_PATHS["adversarial-testing"],
        },
        {
          role: "developer-api",
          reviewer: "developer-reviewer",
          result: "accepted",
          evidencePath: RECONCILIATION_REVIEW_EVIDENCE_PATHS["developer-api"],
        },
      ],
      reviewEvidenceSources: {
        "adversarial-testing": (subject) =>
          `Review subject: ${subject}\nVerdict: **ACCEPTED**\n`,
        correctness: (subject) =>
          `Review subject: ${subject}\nVerdict: **ACCEPTED**\n`,
        "developer-api": (subject) =>
          `Review subject: ${subject}\nVerdict: **ACCEPTED**\n`,
        security: (subject) =>
          `Review subject: ${subject}\nVerdict: **ACCEPTED**\n`,
      },
    },
  };
}

/** Replaces both immutable reports with a canonical report for new findings. */
function withFindings(
  current: BuilderFixture,
  findings: readonly ArchitectureFinding[],
): BuildAnalyzerReconciliationManifestInput {
  const executionReport = reportFor(findings, current.historicalBaselines);
  const provenanceReport = provenanceReportFor(findings);
  return {
    ...current.input,
    provenanceReports: [provenanceReport, structuredClone(provenanceReport)],
    executionReports: [executionReport, structuredClone(executionReport)],
  };
}

describe("reconciliation manifest builder", () => {
  it("builds a generic reviewed partition and validates the complete candidate state", () => {
    const current = fixture();
    const built = buildAnalyzerReconciliationManifest(current.input);

    expect(built.manifest.finalState.productionAdditionCount).toBe(1);
    expect(built.manifest.finalState.coveredTestFindingCount).toBe(2);
    expect(built.manifest.finalState.addedExactExceptionCount).toBe(1);
    expect(built.manifest.reproduction.provenance.parseErrors).toHaveLength(1);
    expect(built.manifest.reproduction.execution.parseErrorCount).toBe(0);
    expect(built.manifest.exactExceptionAdditions[0]?.coveredFindings).toEqual(
      current.testFindings,
    );
    expect(built.baselines.database.entries).toEqual(
      current.historicalBaselines.database.entries,
    );
    expect(built.baselines.provider.entries[0]).toMatchObject({
      instanceKey: current.productionFinding.instanceKey,
      owner: "sales-platform",
    });
    expect(built.config.exactExceptions).toHaveLength(2);
    expect(built.reviewSubjectSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects non-identical, non-canonical, and nonzero-error report evidence", () => {
    const current = fixture();
    const differentBytes = cloneInput(current.input);
    differentBytes.executionReports[1].source = `${differentBytes.executionReports[1].source} `;
    expect(() => buildAnalyzerReconciliationManifest(differentBytes)).toThrow(
      /canonical|byte-identical/i,
    );

    const analysisError = cloneInput(current.input);
    const report = {
      schemaVersion: 1,
      status: "analysis-error",
      filesScanned: 4,
      findings: [],
      parseErrors: [
        {
          schemaVersion: 1,
          sourcePath: "apps/sales/src/broken.ts",
          line: 1,
          column: 1,
          code: "TYPESCRIPT_PARSE_ERROR",
        },
      ],
    } as const;
    const immutable = {
      report,
      source: `${JSON.stringify(report, null, 2)}\n`,
    };
    analysisError.executionReports = [immutable, structuredClone(immutable)];
    expect(() => buildAnalyzerReconciliationManifest(analysisError)).toThrow(
      /zero-error debt-change|execution report/i,
    );

    const wrongProvenance = cloneInput(current.input);
    const wrongReport = {
      schemaVersion: 1,
      status: "analysis-error",
      filesScanned: 4,
      findings: [
        current.historicalFinding,
        current.productionFinding,
        ...current.testFindings,
      ],
      parseErrors: [
        {
          schemaVersion: 1,
          sourcePath: "apps/sales/src/broken.ts",
          line: 1,
          column: 1,
          code: "MODULE_RESOLUTION_ERROR",
        },
      ],
    } as const;
    const wrongImmutable = {
      report: wrongReport,
      source: `${JSON.stringify(wrongReport, null, 2)}\n`,
    };
    wrongProvenance.provenanceReports = [
      wrongImmutable,
      structuredClone(wrongImmutable),
    ];
    expect(() => buildAnalyzerReconciliationManifest(wrongProvenance)).toThrow(
      /exact self-hosting resolver error/i,
    );

    const mismatchedAnchors = cloneInput(current.input);
    const mismatchedExecution = reportFor(
      [current.historicalFinding, current.productionFinding],
      current.historicalBaselines,
    );
    mismatchedAnchors.executionReports = [
      mismatchedExecution,
      structuredClone(mismatchedExecution),
    ];
    expect(() =>
      buildAnalyzerReconciliationManifest(mismatchedAnchors),
    ).toThrow(/finding\/addition sets do not match/i);
  });

  it("rejects any historical removal or rename in the immutable-base delta", () => {
    const current = fixture();
    const withoutHistorical = withFindings(current, [
      current.productionFinding,
      ...current.testFindings,
    ]);
    expect(() =>
      buildAnalyzerReconciliationManifest(withoutHistorical),
    ).toThrow(/zero historical removals or renames/i);

    const movedHistorical = finding({
      ruleId: current.historicalFinding.ruleId,
      domain: current.historicalFinding.domain,
      sourcePath: "apps/sales/src/moved-report.ts",
      line: 2,
      column: current.historicalFinding.column,
      evidenceKind: current.historicalFinding.evidenceKind,
      importSpecifier: current.historicalFinding.importSpecifier,
      resolvedTarget: current.historicalFinding.resolvedTarget,
    });
    const withRename = withFindings(current, [
      movedHistorical,
      current.productionFinding,
      ...current.testFindings,
    ]);
    expect(() => buildAnalyzerReconciliationManifest(withRename)).toThrow(
      /zero historical removals or renames/i,
    );
  });

  it("consumes every production metadata key exactly once", () => {
    const current = fixture();
    expect(() =>
      buildAnalyzerReconciliationManifest({
        ...current.input,
        productionReviews: [],
      }),
    ).toThrow(/missing production review metadata/i);
    expect(() =>
      buildAnalyzerReconciliationManifest({
        ...current.input,
        productionReviews: [
          ...current.input.productionReviews,
          {
            instanceKey: "f".repeat(64),
            owner: "unused-platform",
            rationale: "This extra review must never be silently ignored.",
          },
        ],
      }),
    ).toThrow(/unused production review metadata/i);
    expect(() =>
      buildAnalyzerReconciliationManifest({
        ...current.input,
        productionReviews: [
          current.input.productionReviews[0]!,
          current.input.productionReviews[0]!,
        ],
      }),
    ).toThrow(/duplicate production review metadata/i);
  });

  it("groups exact test findings and consumes each rule-path review once", () => {
    const current = fixture();
    expect(() =>
      buildAnalyzerReconciliationManifest({
        ...current.input,
        exactExceptionReviews: [],
      }),
    ).toThrow(/missing exact exception review metadata/i);
    expect(() =>
      buildAnalyzerReconciliationManifest({
        ...current.input,
        exactExceptionReviews: [
          ...current.input.exactExceptionReviews,
          {
            ruleId: "AI_PROVIDER_BOUNDARY",
            sourcePath: "apps/sales/src/__tests__/unused.test.ts",
            id: "unused-ai-test",
            owner: "sales-platform",
            rationale: "This extra exception review must never be ignored.",
          },
        ],
      }),
    ).toThrow(/unused exact exception review metadata/i);
    expect(() =>
      buildAnalyzerReconciliationManifest({
        ...current.input,
        exactExceptionReviews: [
          current.input.exactExceptionReviews[0]!,
          current.input.exactExceptionReviews[0]!,
        ],
      }),
    ).toThrow(/duplicate exact exception review metadata/i);
  });

  it("rejects historical proof drift before emitting a candidate", () => {
    const current = fixture();
    const directReview = JSON.parse(current.input.directReviewSource) as {
      schemaVersion: 1;
      candidates: DirectViolationCandidate[];
    };
    directReview.candidates[0] = {
      ...directReview.candidates[0]!,
      line: 99,
    };
    expect(() =>
      buildAnalyzerReconciliationManifest({
        ...current.input,
        directReviewSource: `${JSON.stringify(directReview, null, 2)}\n`,
      }),
    ).toThrow(/historical entry matches/i);
  });

  it("keeps the review subject stable when only review evidence changes", () => {
    const current = fixture();
    const first = buildAnalyzerReconciliationManifest(current.input);
    const second = buildAnalyzerReconciliationManifest({
      ...current.input,
      reviewEvidenceSources: {
        ...current.input.reviewEvidenceSources,
        security: (subject) =>
          `Review subject: ${subject}\nVerdict: **ACCEPTED**\nSecond review bytes.\n`,
      },
    });

    expect(second.reviewSubjectSha256).toBe(first.reviewSubjectSha256);
    expect(second.manifest.reviews).not.toEqual(first.manifest.reviews);
  });
});
