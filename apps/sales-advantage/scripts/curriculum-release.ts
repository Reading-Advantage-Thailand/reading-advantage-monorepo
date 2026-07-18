import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { z } from "zod";

import { extractCanonicalSourceExcerpts } from "@reading-advantage/domain/sales";

import { curriculumGraphDigest } from "./verify-sales-curriculum";
import { buildStaticSalesCurriculumRows } from "./static-seed";

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const gitCommitSchema = z.string().regex(/^[a-f0-9]{40}$/);

const approvalChecksSchema = z.object({
  pedagogy: z.boolean(),
  sourceTraceability: z.boolean(),
  honestClaims: z.boolean(),
  roleplayRubrics: z.boolean(),
});

const curriculumReleaseManifestSchema = z.object({
  schemaVersion: z.literal(1),
  curriculumId: z.literal("reading-advantage-sales-curriculum-v1"),
  graphSha256: sha256Schema,
  source: z.object({
    repository: z.literal("advantage-pr"),
    commit: gitCommitSchema,
    documents: z.array(z.object({
      path: z.string().min(1),
      sha256: sha256Schema,
    })).min(1),
  }),
  pedagogy: z.object({
    reference: z.literal(
      "apps/codecamp-advantage/measure/curriculum/course-spec.md",
    ),
    progression: z.tuple([
      z.literal("learn"),
      z.literal("practice"),
      z.literal("evaluate"),
      z.literal("reflect"),
    ]),
    moduleOrder: z.array(z.string().min(1)).length(6),
  }),
  generation: z.object({
    method: z.enum([
      "hand-authored-reviewed-candidate",
      "openrouter-generated-candidate",
    ]),
    provider: z.literal("openrouter").nullable(),
    requestedModel: z.string().min(1).nullable(),
    promptVersion: z.string().min(1),
    artifactRef: z.string().min(1),
  }),
  automatedReview: z.object({
    exactGraphVerified: z.literal(true),
    progressiveModuleOrderVerified: z.literal(true),
    honestClaimsLanguageReviewedByAutomation: z.literal(true),
    rubricSourceRefsVerified: z.literal(true),
    roleplayCanonicalExcerptsVerified: z.literal(true),
  }),
  approval: z.discriminatedUnion("status", [
    z.object({
      status: z.literal("awaiting_human_review"),
      reviewer: z.null(),
      reviewedAt: z.null(),
      evidenceRef: z.null(),
      checks: approvalChecksSchema,
    }),
    z.object({
      status: z.literal("approved"),
      reviewer: z.string().min(1),
      reviewedAt: z.string().datetime(),
      evidenceRef: z.string().min(1),
      checks: approvalChecksSchema,
    }),
  ]),
});

/** Parsed release manifest for one immutable Sales curriculum graph. */
export type CurriculumReleaseManifest = z.infer<
  typeof curriculumReleaseManifestSchema
>;

/** Automated curriculum checks which cannot substitute for human review. */
export interface CurriculumAutomatedReview {
  exactGraphVerified: true;
  progressiveModuleOrderVerified: true;
  honestClaimsLanguageReviewedByAutomation: true;
  rubricSourceRefsVerified: true;
  roleplayCanonicalExcerptsVerified: true;
}

type CurriculumRows = ReturnType<typeof buildStaticSalesCurriculumRows>;

const execFileAsync = promisify(execFile);

/** Canonical source documents included in every Sales curriculum review. */
export const CURRICULUM_SOURCE_PATHS = Object.freeze([
  "02-brand/messaging-house.md",
  "06-research-and-evidence/outcome-claims-policy.md",
  "09-sales-enablement/README.md",
  "09-sales-enablement/advantage-suite-at-a-glance.md",
  "09-sales-enablement/demo-scripts.md",
  "09-sales-enablement/roi-calculator.md",
  "09-sales-enablement/distributor-rep-onboarding/README.md",
  "09-sales-enablement/distributor-rep-onboarding/objection-handling-guide.md",
  "09-sales-enablement/distributor-rep-onboarding/rep-certification-checklist.md",
  "09-sales-enablement/distributor-rep-onboarding/role-play-scenarios.md",
]);

/** Builds the machine-verifiable portion of the curriculum release review. */
export function buildCurriculumAutomatedReview(
  rows: CurriculumRows,
): CurriculumAutomatedReview {
  const orderedModules = [...rows.modules].sort(
    (left, right) => left.order - right.order,
  );
  if (
    orderedModules.length !== 6 ||
    orderedModules.some((module, index) => module.order !== index + 1)
  ) {
    throw new Error("SALES_CURRICULUM_PROGRESSION_INVALID");
  }

  const lessonById = new Map(rows.lessons.map((lesson) => [lesson.id, lesson]));
  for (const scenario of rows.scenarios) {
    const lesson = lessonById.get(scenario.lessonId);
    if (
      !lesson ||
      lesson.type !== "roleplay" ||
      extractCanonicalSourceExcerpts(lesson.content).length === 0
    ) {
      throw new Error("SALES_CURRICULUM_ROLEPLAY_EXCERPTS_MISSING");
    }
  }

  for (const rubric of rows.rubrics) {
    if (
      !Array.isArray(rubric.criteriaJson) ||
      rubric.criteriaJson.length === 0 ||
      rubric.criteriaJson.some((criterion) => {
        if (!criterion || typeof criterion !== "object") return true;
        const sourceRef = Reflect.get(criterion, "sourceRef");
        return typeof sourceRef !== "string" || sourceRef.trim().length === 0;
      })
    ) {
      throw new Error("SALES_CURRICULUM_RUBRIC_SOURCE_REF_MISSING");
    }
  }

  const allContent = rows.lessons.map((lesson) => lesson.content).join("\n");
  if (
    !allContent.includes('Never use the word "guaranteed"') ||
    !allContent.includes("approved citations") ||
    !allContent.includes("honest")
  ) {
    throw new Error("SALES_CURRICULUM_HONEST_CLAIMS_GUARDRAILS_MISSING");
  }

  return {
    exactGraphVerified: true,
    progressiveModuleOrderVerified: true,
    honestClaimsLanguageReviewedByAutomation: true,
    rubricSourceRefsVerified: true,
    roleplayCanonicalExcerptsVerified: true,
  };
}

/**
 * Requires exact graph, source, pedagogy, automated review, and human evidence.
 * @param candidate Untrusted release-manifest input.
 * @param rows Curriculum graph to bind to the manifest.
 * @returns The validated immutable release manifest.
 * @throws When the graph or review evidence is incomplete.
 */
export function assertCurriculumReleaseReady(
  candidate: unknown,
  rows: CurriculumRows,
): CurriculumReleaseManifest {
  const manifest = curriculumReleaseManifestSchema.parse(candidate);
  if (curriculumGraphDigest(rows) !== manifest.graphSha256) {
    throw new Error("SALES_CURRICULUM_RELEASE_GRAPH_MISMATCH");
  }

  const moduleOrder = [...rows.modules]
    .sort((left, right) => left.order - right.order)
    .map((module) => module.slug);
  if (JSON.stringify(moduleOrder) !== JSON.stringify(manifest.pedagogy.moduleOrder)) {
    throw new Error("SALES_CURRICULUM_RELEASE_MODULE_ORDER_MISMATCH");
  }

  const automatedReview = buildCurriculumAutomatedReview(rows);
  if (
    JSON.stringify(automatedReview) !==
    JSON.stringify(manifest.automatedReview)
  ) {
    throw new Error("SALES_CURRICULUM_AUTOMATED_REVIEW_MISMATCH");
  }

  if (manifest.approval.status !== "approved") {
    throw new Error("SALES_CURRICULUM_HUMAN_APPROVAL_REQUIRED");
  }
  if (Object.values(manifest.approval.checks).some((value) => !value)) {
    throw new Error("SALES_CURRICULUM_HUMAN_REVIEW_INCOMPLETE");
  }
  return manifest;
}


/**
 * Builds an immutable, unapproved release candidate from the canonical sources.
 * @param sourceRoot Absolute path to the advantage-pr repository.
 * @param sourceCommit Exact advantage-pr commit represented by sourceRoot.
 * @returns Candidate manifest with source hashes and automated review evidence.
 */
export async function buildCurriculumReleaseCandidate(
  sourceRoot: string,
  sourceCommit: string,
): Promise<CurriculumReleaseManifest> {
  const commit = gitCommitSchema.parse(sourceCommit.trim());
  const documents = await Promise.all(
    CURRICULUM_SOURCE_PATHS.map(async (path) => {
      const bytes = await readFile(join(sourceRoot, path));
      return {
        path,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
    }),
  );
  const rows = buildStaticSalesCurriculumRows();
  return curriculumReleaseManifestSchema.parse({
    schemaVersion: 1,
    curriculumId: "reading-advantage-sales-curriculum-v1",
    graphSha256: curriculumGraphDigest(rows),
    source: { repository: "advantage-pr", commit, documents },
    pedagogy: {
      reference: "apps/codecamp-advantage/measure/curriculum/course-spec.md",
      progression: ["learn", "practice", "evaluate", "reflect"],
      moduleOrder: [...rows.modules]
        .sort((left, right) => left.order - right.order)
        .map((module) => module.slug),
    },
    generation: {
      method: "hand-authored-reviewed-candidate",
      provider: null,
      requestedModel: null,
      promptVersion: "sales-curriculum-v2",
      artifactRef: "apps/sales-advantage/scripts/static-seed.ts",
    },
    automatedReview: buildCurriculumAutomatedReview(rows),
    approval: {
      status: "awaiting_human_review",
      reviewer: null,
      reviewedAt: null,
      evidenceRef: null,
      checks: {
        pedagogy: false,
        sourceTraceability: false,
        honestClaims: false,
        roleplayRubrics: false,
      },
    },
  });
}

/** Writes the deterministic release-candidate manifest without approving it. */
async function main(): Promise<void> {
  const value = (name: string): string | undefined => {
    const prefix = "--" + name + "=";
    return process.argv.find((argument) => argument.startsWith(prefix))?.slice(
      prefix.length,
    );
  };
  const sourceRoot = resolve(
    value("source-root") ?? join(homedir(), "Desktop", "advantage-pr"),
  );
  const output = resolve(
    value("output") ??
      join(dirname(new URL(import.meta.url).pathname), "..", "curriculum", "release-candidate.json"),
  );
  const { stdout } = await execFileAsync("git", ["-C", sourceRoot, "rev-parse", "HEAD"]);
  const candidate = await buildCurriculumReleaseCandidate(sourceRoot, stdout);
  await writeFile(output, JSON.stringify(candidate, null, 2) + "\n");
  process.stdout.write("Sales curriculum release candidate written: " + output + "\n");
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  main().catch((error: unknown) => {
    process.stderr.write(
      "Sales curriculum candidate failed: " +
        (error instanceof Error ? error.message : String(error)) +
        "\n",
    );
    process.exitCode = 1;
  });
}
