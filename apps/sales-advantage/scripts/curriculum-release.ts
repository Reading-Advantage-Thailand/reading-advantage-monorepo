import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, normalize, relative, resolve, sep } from "node:path";
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

const canonicalSuiteLaunchClaims = Object.freeze([
  "1. **Reading Advantage** — live",
  "2. **Primary Advantage** — live",
  "3. **Storytime Advantage** — coming early 2027",
  "4. **Math Advantage** — coming late 2026",
  "5. **Science Advantage** — slipped while Tutor is prioritized",
  "6. **STEM Advantage** — coming mid 2027",
  "7. **Zhongwen Advantage** — coming late 2026",
  "8. **Tutor Advantage** — beta 2026",
  "9. **CodeCamp Advantage** — coming 2026",
]);

const canonicalProductStatuses = Object.freeze([
  { product: "Reading Advantage", status: "live" },
  { product: "Primary Advantage", status: "live" },
  { product: "Storytime Advantage", status: "coming early 2027" },
  { product: "Math Advantage", status: "coming late 2026" },
  {
    product: "Science Advantage",
    status: "slipped while Tutor is prioritized",
  },
  { product: "STEM Advantage", status: "coming mid 2027" },
  { product: "Zhongwen Advantage", status: "coming late 2026" },
  { product: "Tutor Advantage", status: "beta 2026" },
  { product: "CodeCamp Advantage", status: "coming 2026" },
]);

const canonicalTierClaims = Object.freeze([
  "| **App-Only** | Digital platform access | ~1,000 THB/student/year |",
  "| **Blended Learning** | App + physical workbooks + 2-day teacher training + quarterly fidelity reports | ~1,500 THB/student/year |",
  "| **Managed Service / The Teaching Advantage** | Future tier with certified facilitators | Planned for May 2027 at the earliest; do not pre-sell availability, staffing, or price |",
]);

const allowedAdvantageNames = new Set([
  "reading advantage",
  "primary advantage",
  "storytime advantage",
  "math advantage",
  "science advantage",
  "stem advantage",
  "zhongwen advantage",
  "tutor advantage",
  "codecamp advantage",
  "mastery advantage",
  "teaching advantage",
]);



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

/**
 * Resolves the designated normalized approval JSON inside the Sales track.
 * @param workspaceRoot Repository root containing Measure evidence.
 * @param evidenceRef Manifest-supplied evidence reference.
 * @returns Absolute path to the designated approval evidence file.
 * @throws When the reference differs from the designated normalized path.
 */
function trackLocalApprovalEvidencePath(
  workspaceRoot: string,
  evidenceRef: string,
): string {
  const designatedEvidenceRef =
    "measure/tracks/sales_advantage_golive_20260701/curriculum-approval.json";
  if (
    evidenceRef !== designatedEvidenceRef ||
    normalize(evidenceRef) !== evidenceRef
  ) {
    throw new Error("SALES_CURRICULUM_EVIDENCE_PATH_INVALID");
  }
  return pathInside(workspaceRoot, evidenceRef);
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
  if (!approvalSha256) {
    throw new Error("SALES_CURRICULUM_APPROVAL_TRUST_ANCHOR_REQUIRED");
  }
  let trustedEvidenceHash: string;
  try {
    trustedEvidenceHash = sha256Schema.parse(approvalSha256.trim());
  } catch {
    throw new Error("SALES_CURRICULUM_APPROVAL_TRUST_ANCHOR_INVALID");
  }
  const evidencePath = trackLocalApprovalEvidencePath(
    workspaceRoot,
    manifest.approval.evidenceRef,
  );
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

/**
 * Collects every string in nested curriculum JSON without trusting row shape.
 * @param value Curriculum value or nested JSON structure.
 * @returns All string values reachable from the input.
 */
function collectCurriculumText(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectCurriculumText);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectCurriculumText);
  }
  return [];
}

/**
 * Builds the complete curriculum text surface used by claim validation.
 * @param rows Complete deterministic curriculum graph.
 * @returns Module, lesson, scenario, rubric, and quiz text joined for review.
 */
function curriculumClaimSurface(rows: CurriculumRows): string {
  return [
    ...rows.modules.flatMap((module) => [
      module.title,
      module.description,
      module.phase,
    ]),
    ...rows.lessons.flatMap((lesson) => [lesson.title, lesson.content]),
    ...rows.scenarios.flatMap((scenario) => [
      scenario.personaName,
      scenario.personaRole,
      scenario.situation,
      scenario.objective,
      ...collectCurriculumText(scenario.prospectContextJson),
    ]),
    ...rows.rubrics.flatMap((rubric) => [
      rubric.name,
      ...collectCurriculumText(rubric.criteriaJson),
    ]),
    ...rows.quizQuestions.flatMap((question) => [
      question.question,
      ...collectCurriculumText(question.optionsJson),
      question.correctAnswer,
      question.explanation,
    ]),
  ].join("\n");
}

/**
 * Normalizes Markdown claim text for exact semantic-phrase comparison.
 * @param value Curriculum text containing Markdown or prose.
 * @returns Lowercase text without Markdown punctuation or repeated whitespace.
 */
function normalizeCurriculumClaim(value: string): string {
  return value
    .toLowerCase()
    .replace(/[*~|#>]/g, " ")
    .replace(/[—–]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Splits the complete graph text into independently evaluated claim statements.
 * @param allContent Complete curriculum text surface.
 * @returns Normalized non-empty statements.
 */
function curriculumClaimStatements(allContent: string): string[] {
  return allContent
    .split(/[\n.!?;]+/)
    .map(normalizeCurriculumClaim)
    .filter(Boolean);
}

/**
 * Detects any product lifecycle statement that differs from the canonical state.
 * @param statements Normalized curriculum claim statements.
 * @returns Whether a product has a conflicting launch or availability statement.
 */
function hasConflictingProductStatus(statements: readonly string[]): boolean {
  const lifecyclePattern =
    /\b(?:available|beta|coming|launch(?:es|ed|ing)?|live|planned|release(?:s|d)?|slipped|unavailable)\b/;
  return canonicalProductStatuses.some(({ product, status }) => {
    const normalizedProduct = normalizeCurriculumClaim(product);
    const canonicalClaim = normalizeCurriculumClaim(`${product} ${status}`);
    return statements.some((statement) =>
      statement.includes(normalizedProduct) &&
      lifecyclePattern.test(statement) &&
      statement.replace(/^\d+\s+/, "") !== canonicalClaim
    );
  });
}

/**
 * Parses a THB or baht amount from one normalized claim statement.
 * @param statement Normalized curriculum statement.
 * @returns Currency amounts and their character positions.
 */
function currencyAmounts(
  statement: string,
): Array<{ amount: number; canonicalUnit: boolean; index: number }> {
  return [...statement.matchAll(
    /(\d[\d,]*(?:\.\d+)?)\s*(thb|baht)\b/g,
  )].map((match) => {
    const suffix = statement.slice(match.index + match[0].length);
    const canonicalUnit = match[2] === "thb" &&
      /^(?:\s*\/\s*student\s*\/\s*year\b|\s+per\s+student\s+per\s+year\b)/
        .test(suffix);
    return {
      amount: Number(match[1]!.replaceAll(",", "")),
      canonicalUnit,
      index: match.index,
    };
  });
}

/**
 * Detects conflicting tier prices and service-availability statements.
 * @param statements Normalized curriculum claim statements.
 * @returns Whether a tier claim conflicts with the canonical corpus.
 */
function hasConflictingTierClaim(statements: readonly string[]): boolean {
  const expectedPrices = new Map([
    ["app-only", 1_000],
    ["blended learning", 1_500],
  ]);
  const allowedWorkedTotal = normalizeCurriculumClaim(
    "For example, 500 students at the Blended Learning reference price is 750,000 THB/year",
  );

  for (const statement of statements) {
    const tierMatches = [...statement.matchAll(
      /app-only|blended learning|managed service/g,
    )];
    if (tierMatches.length === 0) continue;

    if (
      statement.includes("managed service") &&
      (
        /\b(?:available|launch(?:es|ed|ing)?|live|release(?:s|d)?)\b/
          .test(statement) ||
        /\b(?:planned|future)\b[^\n]*\b20(?!27)\d{2}\b/
          .test(statement)
      )
    ) {
      return true;
    }
    const unavailableCurrentTier = tierMatches.some((match, index) => {
      if (match[0] === "managed service") return false;
      const nextTierIndex = tierMatches[index + 1]?.index ?? statement.length;
      const tierClause = statement.slice(match.index, nextTierIndex);
      return /\b(?:beta|coming|future|launch(?:es|ed|ing)?|planned|slipped|unavailable)\b/
        .test(tierClause);
    }) ||
      /\b(?:beta|coming|future|planned|slipped|unavailable)\s+(?:for\s+)?(?:app-only|blended learning)\b/
        .test(statement);
    if (unavailableCurrentTier) {
      return true;
    }

    const amounts = currencyAmounts(statement);
    if (amounts.length === 0 || statement === allowedWorkedTotal) continue;
    const conflictingBillingSemantics =
      /(?:\/|per\s+)(?:day|month|school|semester|term|week)\b|\bone[- ]time\b|\bmonthly\b/
        .test(statement);
    for (const { amount, canonicalUnit, index } of amounts) {
      const followingTier = tierMatches.find((match) => match.index > index);
      const amountIntroducesFollowingTier = followingTier !== undefined &&
        /\bfor\s*$/.test(statement.slice(index, followingTier.index));
      const nearestTier = amountIntroducesFollowingTier
        ? followingTier
        : tierMatches.reduce((nearest, match) => {
          if (nearest === undefined) return match;
          return Math.abs(match.index! - index) < Math.abs(nearest.index! - index)
            ? match
            : nearest;
        }, undefined as RegExpMatchArray | undefined);
      const tier = nearestTier?.[0];
      if (
        tier === "managed service" ||
        (tier && (
          expectedPrices.get(tier) !== amount ||
          !canonicalUnit ||
          conflictingBillingSemantics
        ))
      ) {
        return true;
      }
    }
  }
  return false;
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

  const allContent = curriculumClaimSurface(rows);
  const statements = curriculumClaimStatements(allContent);
  const unexpectedAdvantageName = [...allContent.matchAll(
    /\b((?!The Advantage\b)[A-Z][A-Za-z-]* Advantage)\b/g,
  )].some((match) => !allowedAdvantageNames.has(match[1]!.toLowerCase()));
  const conflictingProductStatus = hasConflictingProductStatus(statements);
  const conflictingTierClaim = hasConflictingTierClaim(statements);
  if (
    forbiddenCurriculumClaims.some((claim) =>
      allContent.toLowerCase().includes(claim.toLowerCase())
    ) ||
    unexpectedAdvantageName ||
    conflictingProductStatus ||
    conflictingTierClaim ||
    !canonicalSuiteLaunchClaims.every((claim) => allContent.includes(claim)) ||
    !canonicalTierClaims.every((claim) => allContent.includes(claim)) ||
    !allContent.includes(
      "Research shows extensive reading outperforms traditional grammar instruction (Aka, 2019).",
    ) ||
    !allContent.includes("# The 6 Canonical Objections") ||
    !allContent.includes("## Objection 6:")
  ) {
    const reason = conflictingProductStatus
      ? "product-status"
      : conflictingTierClaim
      ? "tier-claim"
      : unexpectedAdvantageName
      ? "product-name"
      : "required-claim";
    throw new Error(`SALES_CURRICULUM_CANONICAL_CLAIMS_INVALID ${reason}`);
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
