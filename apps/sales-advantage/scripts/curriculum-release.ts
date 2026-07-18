import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
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

const curriculumSourceSchema = z.object({
  repository: z.literal("advantage-pr"),
  commit: gitCommitSchema,
  documents: z.array(z.object({
    path: z.string().min(1),
    sha256: sha256Schema,
  })).min(1),
});

const curriculumReleaseManifestSchema = z.object({
  schemaVersion: z.literal(1),
  curriculumId: z.literal("reading-advantage-sales-curriculum-v1"),
  graphSha256: sha256Schema,
  source: curriculumSourceSchema,
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
      evidenceSha256: z.null(),
      checks: approvalChecksSchema,
    }),
    z.object({
      status: z.literal("approved"),
      reviewer: z.string().min(1),
      reviewedAt: z.string().datetime(),
      evidenceRef: z.string().min(1),
      evidenceSha256: sha256Schema,
      checks: approvalChecksSchema,
    }),
  ]),
});

const curriculumApprovalEvidenceSchema = z.object({
  schemaVersion: z.literal(1),
  curriculumId: z.literal("reading-advantage-sales-curriculum-v1"),
  decision: z.literal("approved"),
  reviewer: z.string().min(1),
  reviewedAt: z.string().datetime(),
  graphSha256: sha256Schema,
  source: curriculumSourceSchema,
  checks: z.object({
    pedagogy: z.literal(true),
    sourceTraceability: z.literal(true),
    honestClaims: z.literal(true),
    roleplayRubrics: z.literal(true),
  }),
  notes: z.string().min(1),
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

/** Filesystem roots used to verify release sources and approval evidence. */
export interface CurriculumReleaseGatePaths {
  sourceRoot?: string;
  workspaceRoot: string;
  approvalSha256?: string;
}

type CurriculumRows = ReturnType<typeof buildStaticSalesCurriculumRows>;
type CurriculumSource = z.infer<typeof curriculumSourceSchema>;

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
  "09-sales-enablement/distributor-rep-onboarding/faq.md",
  "09-sales-enablement/distributor-rep-onboarding/objection-handling-guide.md",
  "09-sales-enablement/distributor-rep-onboarding/rep-certification-checklist.md",
  "09-sales-enablement/distributor-rep-onboarding/role-play-scenarios.md",
]);

/** Named general-sales references permitted in curriculum scoring rubrics. */
export const CURATED_GENERAL_SALES_SOURCE_REFS = Object.freeze([
  "general-sales://spin-selling-rackham-1988#question-sequence",
  "general-sales://spin-selling-rackham-1988#discovery-before-solution",
  "general-sales://spin-selling-rackham-1988#need-payoff",
  "general-sales://never-split-the-difference-voss-2016#tactical-empathy",
  "general-sales://sandler-selling-system#up-front-contract",
  "general-sales://sandler-selling-system#reverse-and-isolate",
  "general-sales://sandler-selling-system#post-sell",
  "general-sales://feel-felt-found#acknowledge-before-response",
  "general-sales://challenger-sale-dixon-adamson-2011#tailor",
  "general-sales://challenger-sale-dixon-adamson-2011#reframe",
  "general-sales://challenger-sale-dixon-adamson-2011#commercial-teaching",
  "general-sales://prospect-theory-kahneman-tversky-1979#loss-aversion",
  "general-sales://prospect-theory-kahneman-tversky-1979#status-quo-bias",
]);

/** Canonical corpus sections permitted in curriculum scoring rubrics. */
export const CANONICAL_RUBRIC_SOURCE_REFS = Object.freeze([
  "09-sales-enablement/roi-calculator.md#methodology",
  "09-sales-enablement/distributor-rep-onboarding/faq.md#q11-what-if-a-school-asks-for-a-discount-or-a-special-price",
  "09-sales-enablement/distributor-rep-onboarding/role-play-scenarios.md#scenario-3-the-price-conversation-close",
]);

const allowedRubricSourceRefs = new Set([
  ...CURATED_GENERAL_SALES_SOURCE_REFS,
  ...CANONICAL_RUBRIC_SOURCE_REFS,
]);

const forbiddenCurriculumClaims = [
  "average reading-level gain of 1.2 years",
  "1.2 grade levels of reading improvement",
  "0.13 grade levels of student progress",
  "85%+ teacher adoption",
  "average parent satisfaction (NPS)",
  "App-Only: 50,000",
  "Blended: 120,000",
  "Managed Service: 400,000",
  "Managed Service is available now",
  "Managed Service — Reading Advantage staff delivers instruction.",
  "Speaking Advantage",
  "Listening Advantage",
  "Writing Advantage",
  "Test Advantage",
  "# The 5 Canonical Objections",
];

/** Converts a Markdown heading into the fragment form used by source refs. */
function markdownHeadingSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Rejects a path which escapes its configured verification root. */
function pathInside(root: string, child: string): string {
  const absoluteRoot = resolve(root);
  const absoluteChild = resolve(absoluteRoot, child);
  const relation = relative(absoluteRoot, absoluteChild);
  if (relation === ".." || relation.startsWith(`..${sep}`) || resolve(child) === child) {
    throw new Error("SALES_CURRICULUM_EVIDENCE_PATH_INVALID");
  }
  return absoluteChild;
}

/** Verifies all canonical source files against both working bytes and pinned Git bytes. */
async function assertCurriculumSourceSnapshot(
  sourceRoot: string,
  source: CurriculumSource,
): Promise<void> {
  const expectedPaths = [...CURRICULUM_SOURCE_PATHS];
  if (JSON.stringify(source.documents.map((document) => document.path)) !==
      JSON.stringify(expectedPaths)) {
    throw new Error("SALES_CURRICULUM_SOURCE_DOCUMENT_SET_MISMATCH");
  }

  let head: string;
  try {
    const result = await execFileAsync("git", [
      "-C",
      sourceRoot,
      "rev-parse",
      "HEAD",
    ]);
    head = result.stdout.trim();
  } catch {
    throw new Error("SALES_CURRICULUM_SOURCE_REPOSITORY_UNAVAILABLE");
  }
  if (head !== source.commit) {
    throw new Error("SALES_CURRICULUM_SOURCE_COMMIT_MISMATCH");
  }

  const currentDocuments = new Map<string, string>();
  for (const document of source.documents) {
    const sourcePath = pathInside(sourceRoot, document.path);
    let currentBytes: Buffer;
    let committedText: string;
    try {
      currentBytes = await readFile(sourcePath);
      const result = await execFileAsync("git", [
        "-C",
        sourceRoot,
        "show",
        `${source.commit}:${document.path}`,
      ], { maxBuffer: 4 * 1024 * 1024 });
      committedText = result.stdout;
    } catch {
      throw new Error(`SALES_CURRICULUM_SOURCE_DOCUMENT_MISSING ${document.path}`);
    }
    const currentHash = createHash("sha256").update(currentBytes).digest("hex");
    const committedHash = createHash("sha256")
      .update(committedText)
      .digest("hex");
    if (currentHash !== document.sha256 || committedHash !== document.sha256) {
      throw new Error(`SALES_CURRICULUM_SOURCE_HASH_MISMATCH ${document.path}`);
    }
    currentDocuments.set(document.path, currentBytes.toString("utf8"));
  }

  for (const sourceRef of CANONICAL_RUBRIC_SOURCE_REFS) {
    const [path, fragment] = sourceRef.split("#");
    const content = path ? currentDocuments.get(path) : undefined;
    const headings = content?.match(/^#{1,6}\s+.+$/gm) ?? [];
    if (!path || !fragment || !content || !headings.some((heading) =>
      markdownHeadingSlug(heading.replace(/^#{1,6}\s+/, "")) === fragment)) {
      throw new Error(`SALES_CURRICULUM_RUBRIC_SOURCE_SECTION_MISSING ${sourceRef}`);
    }
  }
}

/** Verifies graph-bound human evidence stored inside the Sales Measure track. */
async function assertCurriculumApprovalEvidence(
  workspaceRoot: string,
  approvalSha256: string | undefined,
  manifest: CurriculumReleaseManifest & {
    approval: Extract<CurriculumReleaseManifest["approval"], { status: "approved" }>;
  },
): Promise<void> {
  if (!manifest.approval.evidenceRef.startsWith(
    "measure/tracks/sales_advantage_golive_20260701/",
  ) || !manifest.approval.evidenceRef.endsWith(".json")) {
    throw new Error("SALES_CURRICULUM_EVIDENCE_PATH_INVALID");
  }
  if (!approvalSha256) {
    throw new Error("SALES_CURRICULUM_APPROVAL_TRUST_ANCHOR_REQUIRED");
  }
  let trustedEvidenceHash: string;
  try {
    trustedEvidenceHash = sha256Schema.parse(approvalSha256.trim());
  } catch {
    throw new Error("SALES_CURRICULUM_APPROVAL_TRUST_ANCHOR_INVALID");
  }
  const evidencePath = pathInside(workspaceRoot, manifest.approval.evidenceRef);
  let evidenceBytes: Buffer;
  try {
    evidenceBytes = await readFile(evidencePath);
  } catch {
    throw new Error("SALES_CURRICULUM_APPROVAL_EVIDENCE_MISSING");
  }
  const evidenceHash = createHash("sha256").update(evidenceBytes).digest("hex");
  if (evidenceHash !== manifest.approval.evidenceSha256) {
    throw new Error("SALES_CURRICULUM_APPROVAL_EVIDENCE_HASH_MISMATCH");
  }
  if (evidenceHash !== trustedEvidenceHash) {
    throw new Error("SALES_CURRICULUM_APPROVAL_TRUST_ANCHOR_MISMATCH");
  }

  let evidence: z.infer<typeof curriculumApprovalEvidenceSchema>;
  try {
    evidence = curriculumApprovalEvidenceSchema.parse(
      JSON.parse(evidenceBytes.toString("utf8")),
    );
  } catch {
    throw new Error("SALES_CURRICULUM_APPROVAL_EVIDENCE_INVALID");
  }
  if (
    evidence.reviewer !== manifest.approval.reviewer ||
    evidence.reviewedAt !== manifest.approval.reviewedAt ||
    evidence.graphSha256 !== manifest.graphSha256 ||
    JSON.stringify(evidence.source) !== JSON.stringify(manifest.source) ||
    JSON.stringify(evidence.checks) !== JSON.stringify(manifest.approval.checks)
  ) {
    throw new Error("SALES_CURRICULUM_APPROVAL_EVIDENCE_MISMATCH");
  }
}

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

  const lessonsByModule = new Map<string, typeof rows.lessons>();
  for (const lesson of rows.lessons) {
    const existing = lessonsByModule.get(lesson.moduleId) ?? [];
    existing.push(lesson);
    lessonsByModule.set(lesson.moduleId, existing);
  }
  for (const module of orderedModules) {
    const lessons = [...(lessonsByModule.get(module.id) ?? [])].sort(
      (left, right) => left.order - right.order,
    );
    const firstRoleplay = lessons.findIndex((lesson) => lesson.type === "roleplay");
    const lastRoleplay = lessons
      .map((lesson) => lesson.type)
      .lastIndexOf("roleplay");
    const finalLesson = lessons.at(-1);
    if (
      lessons.length < 3 ||
      lessons.some((lesson, index) => lesson.order !== index + 1) ||
      firstRoleplay < 1 ||
      lessons.slice(0, firstRoleplay).some((lesson) => lesson.type !== "theory") ||
      lessons.slice(firstRoleplay, lastRoleplay + 1)
        .some((lesson) => lesson.type !== "roleplay") ||
      finalLesson?.type !== "quiz" ||
      finalLesson.order <= lessons[lastRoleplay]!.order ||
      !rows.quizQuestions.some((question) => question.lessonId === finalLesson.id)
    ) {
      throw new Error(`SALES_CURRICULUM_PEDAGOGY_SEQUENCE_INVALID ${module.slug}`);
    }
  }

  const lessonById = new Map(rows.lessons.map((lesson) => [lesson.id, lesson]));
  for (const scenario of rows.scenarios) {
    const lesson = lessonById.get(scenario.lessonId);
    if (
      !lesson ||
      lesson.type !== "roleplay" ||
      extractCanonicalSourceExcerpts(lesson.content).length === 0 ||
      !rows.rubrics.some((rubric) => rubric.id === scenario.rubricId)
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
        return typeof sourceRef !== "string" ||
          !allowedRubricSourceRefs.has(sourceRef);
      })
    ) {
      throw new Error("SALES_CURRICULUM_RUBRIC_SOURCE_REF_UNAPPROVED");
    }
  }

  const allContent = rows.lessons.map((lesson) => lesson.content).join("\n");
  if (
    forbiddenCurriculumClaims.some((claim) =>
      allContent.toLowerCase().includes(claim.toLowerCase())
    ) ||
    !allContent.includes(
      "Research shows extensive reading outperforms traditional grammar instruction (Aka, 2019).",
    ) ||
    !allContent.includes("Managed Service as planned for May 2027 at the earliest") ||
    !allContent.includes("# The 6 Canonical Objections") ||
    !allContent.includes("## Objection 6:") ||
    !allContent.includes("approximately **1,000 THB/student/year for App-Only**") ||
    !allContent.includes("**1,500 THB/student/year for Blended Learning**") ||
    ![
      "Storytime Advantage",
      "Math Advantage",
      "Science Advantage",
      "STEM Advantage",
      "Zhongwen Advantage",
      "Tutor Advantage",
      "CodeCamp Advantage",
    ].every((product) => allContent.includes(product))
  ) {
    throw new Error("SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID");
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
 * Requires exact graph, source bytes, pedagogy, automated review, and human evidence.
 * @param candidate Untrusted release-manifest input.
 * @param rows Curriculum graph to bind to the manifest.
 * @param paths Canonical source and workspace roots used for verification.
 * @returns The validated immutable release manifest.
 * @throws When graph, source, or review evidence is incomplete or forged.
 */
export async function assertCurriculumReleaseReady(
  candidate: unknown,
  rows: CurriculumRows,
  paths: CurriculumReleaseGatePaths,
): Promise<CurriculumReleaseManifest> {
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
  if (JSON.stringify(automatedReview) !== JSON.stringify(manifest.automatedReview)) {
    throw new Error("SALES_CURRICULUM_AUTOMATED_REVIEW_MISMATCH");
  }

  if (manifest.approval.status !== "approved") {
    throw new Error("SALES_CURRICULUM_HUMAN_APPROVAL_REQUIRED");
  }
  if (Object.values(manifest.approval.checks).some((value) => !value)) {
    throw new Error("SALES_CURRICULUM_HUMAN_REVIEW_INCOMPLETE");
  }
  if (paths.sourceRoot) {
    await assertCurriculumSourceSnapshot(paths.sourceRoot, manifest.source);
  }
  await assertCurriculumApprovalEvidence(
    paths.workspaceRoot,
    paths.approvalSha256,
    {
      ...manifest,
      approval: manifest.approval,
    },
  );
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
  const candidate = curriculumReleaseManifestSchema.parse({
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
      promptVersion: "sales-curriculum-v3",
      artifactRef: "apps/sales-advantage/scripts/static-seed.ts",
    },
    automatedReview: buildCurriculumAutomatedReview(rows),
    approval: {
      status: "awaiting_human_review",
      reviewer: null,
      reviewedAt: null,
      evidenceRef: null,
      evidenceSha256: null,
      checks: {
        pedagogy: false,
        sourceTraceability: false,
        honestClaims: false,
        roleplayRubrics: false,
      },
    },
  });
  await assertCurriculumSourceSnapshot(sourceRoot, candidate.source);
  return candidate;
}

/** Writes the deterministic release-candidate manifest without approving it. */
async function main(): Promise<void> {
  const value = (name: string): string | undefined => {
    const prefix = `--${name}=`;
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
  await writeFile(output, `${JSON.stringify(candidate, null, 2)}\n`);
  process.stdout.write(`Sales curriculum release candidate written: ${output}\n`);
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `Sales curriculum candidate failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
