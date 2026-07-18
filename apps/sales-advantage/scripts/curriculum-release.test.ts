// @vitest-environment node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { assertOpenRouterCurriculumSharingApproved } from "./generate-curriculum-review-artifact";
import {
  buildStaticSalesCurriculumRows,
  rejectDirectStaticSeedInvocation,
} from "./static-seed";
import {
  assertCurriculumReleaseReady,
  buildCurriculumAutomatedReview,
  buildCurriculumReleaseCandidate,
  CURRICULUM_SOURCE_PATHS,
  type CurriculumReleaseManifest,
} from "./curriculum-release";

const approvalRef =
  "measure/tracks/sales_advantage_golive_20260701/curriculum-approval.json";

let temporaryRoot: string;
let sourceRoot: string;
let workspaceRoot: string;
let candidate: CurriculumReleaseManifest;

/** Returns minimal Markdown with the canonical rubric sections required by the gate. */
function sourceContent(path: string): string {
  if (path.endsWith("roi-calculator.md")) {
    return `# ROI Calculator

## Methodology

Canonical pricing method.
`;
  }
  if (path.endsWith("faq.md")) {
    return `# FAQ

### Q11: What if a school asks for a discount or a special price?

Reduce scope.
`;
  }
  if (path.endsWith("role-play-scenarios.md")) {
    return `# Role-Play Scenarios

## Scenario 3: The Price-Conversation Close

Close honestly.
`;
  }
  return `# Canonical ${path}
`;
}

/** Writes a complete Git-backed source fixture and returns its commit. */
async function createSourceRepository(): Promise<string> {
  await Promise.all(CURRICULUM_SOURCE_PATHS.map(async (path) => {
    const absolutePath = join(sourceRoot, path);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, sourceContent(path));
  }));
  execFileSync("git", ["init", "-q", sourceRoot]);
  execFileSync("git", ["-C", sourceRoot, "config", "user.email", "test@example.com"]);
  execFileSync("git", ["-C", sourceRoot, "config", "user.name", "Sales Test"]);
  execFileSync("git", ["-C", sourceRoot, "add", "."]);
  execFileSync("git", ["-C", sourceRoot, "commit", "-q", "-m", "fixture"]);
  return execFileSync("git", ["-C", sourceRoot, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
}

/** Writes exact graph/source/reviewer evidence and returns an approved manifest. */
async function approvedManifest(
  overrides: Partial<{
    evidenceReviewer: string;
    manifestReviewer: string;
    writeEvidence: boolean;
  }> = {},
): Promise<CurriculumReleaseManifest> {
  if (candidate.approval.status !== "awaiting_human_review") {
    throw new Error("fixture candidate must be pending");
  }
  const evidence = {
    schemaVersion: 1,
    curriculumId: candidate.curriculumId,
    decision: "approved",
    reviewer: overrides.evidenceReviewer ?? "Daniel Bo",
    reviewedAt: "2026-07-18T00:00:00.000Z",
    graphSha256: candidate.graphSha256,
    source: candidate.source,
    checks: {
      pedagogy: true,
      sourceTraceability: true,
      honestClaims: true,
      roleplayRubrics: true,
    },
    notes: "Reviewed exact graph, source snapshot, claims, and roleplay rubrics.",
  };
  const evidenceBytes = Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`);
  if (overrides.writeEvidence !== false) {
    const evidencePath = join(workspaceRoot, approvalRef);
    await mkdir(dirname(evidencePath), { recursive: true });
    await writeFile(evidencePath, evidenceBytes);
  }
  return {
    ...candidate,
    approval: {
      status: "approved",
      reviewer: overrides.manifestReviewer ?? "Daniel Bo",
      reviewedAt: evidence.reviewedAt,
      evidenceRef: approvalRef,
      evidenceSha256: createHash("sha256").update(evidenceBytes).digest("hex"),
      checks: evidence.checks,
    },
  };
}

/** Returns gate paths with an out-of-repo trust-anchor fixture. */
function gatePaths(
  manifest: CurriculumReleaseManifest,
  includeSource = true,
): {
  sourceRoot?: string;
  workspaceRoot: string;
  approvalSha256?: string;
} {
  return {
    sourceRoot: includeSource ? sourceRoot : undefined,
    workspaceRoot,
    approvalSha256: manifest.approval.status === "approved"
      ? manifest.approval.evidenceSha256
      : undefined,
  };
}

beforeEach(async () => {
  temporaryRoot = await mkdtemp(join(tmpdir(), "sales-curriculum-release-"));
  sourceRoot = join(temporaryRoot, "advantage-pr");
  workspaceRoot = join(temporaryRoot, "workspace");
  await mkdir(workspaceRoot, { recursive: true });
  const commit = await createSourceRepository();
  candidate = await buildCurriculumReleaseCandidate(sourceRoot, commit);
});

afterEach(async () => {
  await rm(temporaryRoot, { recursive: true, force: true });
});

describe("Sales curriculum release contract", () => {
  it("proves learn-practice-evaluate-reflect order and registered rubric sources", () => {
    expect(buildCurriculumAutomatedReview(buildStaticSalesCurriculumRows())).toEqual({
      exactGraphVerified: true,
      progressiveModuleOrderVerified: true,
      honestClaimsLanguageReviewedByAutomation: true,
      rubricSourceRefsVerified: true,
      roleplayCanonicalExcerptsVerified: true,
    });
  });

  it("rejects the former quiz-before-practice lesson order", () => {
    const rows = structuredClone(buildStaticSalesCurriculumRows());
    const module = rows.modules.find((row) => row.slug === "foundations-discovery")!;
    const lessons = rows.lessons.filter((lesson) => lesson.moduleId === module.id);
    lessons.find((lesson) => lesson.type === "quiz")!.order = 4;
    lessons.find((lesson) => lesson.type === "roleplay")!.order = 5;

    expect(() => buildCurriculumAutomatedReview(rows)).toThrow(
      "SALES_CURRICULUM_PEDAGOGY_SEQUENCE_INVALID",
    );
  });

  it("rejects a nonempty but unregistered rubric source", () => {
    const rows = structuredClone(buildStaticSalesCurriculumRows());
    const criteria = rows.rubrics[0]!.criteriaJson as Array<Record<string, unknown>>;
    criteria[0]!.sourceRef = "A convincing-looking citation";

    expect(() => buildCurriculumAutomatedReview(rows)).toThrow(
      "SALES_CURRICULUM_RUBRIC_SOURCE_REF_UNAPPROVED",
    );
  });

  it("rejects an invented Reading Advantage outcome claim", () => {
    const rows = structuredClone(buildStaticSalesCurriculumRows());
    rows.lessons[0]!.content +=
      " Average reading-level gain of 1.2 years over nine months.";

    expect(() => buildCurriculumAutomatedReview(rows)).toThrow(
      "SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID",
    );
  });

  it("rejects a noncanonical product substituted into the nine-product suite", () => {
    const rows = structuredClone(buildStaticSalesCurriculumRows());
    const productLesson = rows.lessons.find((lesson) =>
      lesson.title === "The 9-Product Suite and 3 Service Tiers"
    )!;
    productLesson.content = productLesson.content.replace(
      "Storytime Advantage",
      "Speaking Advantage",
    );

    expect(() => buildCurriculumAutomatedReview(rows)).toThrow(
      "SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID",
    );
  });

  it("rejects current-availability language for the future Managed Service", () => {
    const rows = structuredClone(buildStaticSalesCurriculumRows());
    rows.lessons[0]!.content += " Managed Service is available now.";

    expect(() => buildCurriculumAutomatedReview(rows)).toThrow(
      "SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID",
    );
  });

  it("rejects the former unsupported flat price", () => {
    const rows = structuredClone(buildStaticSalesCurriculumRows());
    rows.lessons[0]!.content += " App-Only: 50,000 baht.";

    expect(() => buildCurriculumAutomatedReview(rows)).toThrow(
      "SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID",
    );
  });

  it("rejects candidate generation when selected source bytes drift from Git", async () => {
    const changedPath = join(sourceRoot, CURRICULUM_SOURCE_PATHS[0]!);
    await writeFile(changedPath, `${await readFile(changedPath, "utf8")}drift\n`);

    await expect(buildCurriculumReleaseCandidate(
      sourceRoot,
      candidate.source.commit,
    )).rejects.toThrow("SALES_CURRICULUM_SOURCE_HASH_MISMATCH");
  });

  it("does not convert source checks into human approval", async () => {
    await expect(assertCurriculumReleaseReady(
      candidate,
      buildStaticSalesCurriculumRows(),
      gatePaths(candidate),
    )).rejects.toThrow("SALES_CURRICULUM_HUMAN_APPROVAL_REQUIRED");
  });

  it("accepts Git-verified evidence through an external trust anchor without a production checkout", async () => {
    const approved = await approvedManifest();

    await expect(assertCurriculumReleaseReady(
      approved,
      buildStaticSalesCurriculumRows(),
      gatePaths(approved, false),
    )).resolves.toEqual(approved);
  });

  it("rejects a plausible forged source hash", async () => {
    const approved = await approvedManifest();
    approved.source.documents[0]!.sha256 = "a".repeat(64);

    await expect(assertCurriculumReleaseReady(
      approved,
      buildStaticSalesCurriculumRows(),
      gatePaths(approved),
    )).rejects.toThrow("SALES_CURRICULUM_SOURCE_HASH_MISMATCH");
  });

  it("rejects a manifest source commit different from repository HEAD", async () => {
    const approved = await approvedManifest();
    approved.source.commit = "f".repeat(40);

    await expect(assertCurriculumReleaseReady(
      approved,
      buildStaticSalesCurriculumRows(),
      gatePaths(approved),
    )).rejects.toThrow("SALES_CURRICULUM_SOURCE_COMMIT_MISMATCH");
  });

  it("rejects source working bytes which drift from the pinned commit", async () => {
    const approved = await approvedManifest();
    const changedPath = join(sourceRoot, CURRICULUM_SOURCE_PATHS[0]!);
    await writeFile(changedPath, `${await readFile(changedPath, "utf8")}drift\\n`);

    await expect(assertCurriculumReleaseReady(
      approved,
      buildStaticSalesCurriculumRows(),
      gatePaths(approved),
    )).rejects.toThrow("SALES_CURRICULUM_SOURCE_HASH_MISMATCH");
  });

  it("rejects approval when the reviewer-controlled trust anchor is absent", async () => {
    const approved = await approvedManifest();

    await expect(assertCurriculumReleaseReady(
      approved,
      buildStaticSalesCurriculumRows(),
      { workspaceRoot },
    )).rejects.toThrow("SALES_CURRICULUM_APPROVAL_TRUST_ANCHOR_REQUIRED");
  });

  it("rejects approval when the reviewer-controlled trust anchor differs", async () => {
    const approved = await approvedManifest();

    await expect(assertCurriculumReleaseReady(
      approved,
      buildStaticSalesCurriculumRows(),
      {
        workspaceRoot,
        approvalSha256: "c".repeat(64),
      },
    )).rejects.toThrow("SALES_CURRICULUM_APPROVAL_TRUST_ANCHOR_MISMATCH");
  });

  it("rejects missing approval evidence", async () => {
    const approved = await approvedManifest({ writeEvidence: false });

    await expect(assertCurriculumReleaseReady(
      approved,
      buildStaticSalesCurriculumRows(),
      gatePaths(approved),
    )).rejects.toThrow("SALES_CURRICULUM_APPROVAL_EVIDENCE_MISSING");
  });

  it("rejects evidence whose reviewer differs from the manifest", async () => {
    const approved = await approvedManifest({ evidenceReviewer: "Reviewer A" });

    await expect(assertCurriculumReleaseReady(
      approved,
      buildStaticSalesCurriculumRows(),
      gatePaths(approved),
    )).rejects.toThrow("SALES_CURRICULUM_APPROVAL_EVIDENCE_MISMATCH");
  });

  it("rejects evidence bytes which do not match the manifest hash", async () => {
    const approved = await approvedManifest();
    approved.approval.evidenceSha256 = "b".repeat(64);

    await expect(assertCurriculumReleaseReady(
      approved,
      buildStaticSalesCurriculumRows(),
      gatePaths(approved),
    )).rejects.toThrow("SALES_CURRICULUM_APPROVAL_EVIDENCE_HASH_MISMATCH");
  });

  it("refuses the direct static seed entrypoint", () => {
    expect(() => rejectDirectStaticSeedInvocation()).toThrow(
      "SALES_CURRICULUM_DIRECT_SEED_FORBIDDEN_USE_REVIEWED_ENTRYPOINT",
    );
  });

  it("requires an explicit OpenRouter-specific sharing approval", () => {
    expect(() => assertOpenRouterCurriculumSharingApproved({})).toThrow(
      "SALES_CURRICULUM_OPENROUTER_SHARING_APPROVAL_REQUIRED",
    );
    expect(() => assertOpenRouterCurriculumSharingApproved({
      SALES_CURRICULUM_EXTERNAL_SHARING_APPROVED: "another-provider",
    })).toThrow("SALES_CURRICULUM_OPENROUTER_SHARING_APPROVAL_REQUIRED");
    expect(() => assertOpenRouterCurriculumSharingApproved({
      SALES_CURRICULUM_EXTERNAL_SHARING_APPROVED: "advantage-pr-to-openrouter",
    })).not.toThrow();
  });
});
