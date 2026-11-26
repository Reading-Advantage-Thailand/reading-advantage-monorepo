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
    moduleOrder: z.array(z.string().min(1)).min(1),
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

/** Canonical source documents included in every Sales curriculum review (advantage-pr source set, 2026-10-15). */
export const CURRICULUM_SOURCE_PATHS = Object.freeze([
  "09-sales-enablement/sales-training-scope-2027.md",
  "09-sales-enablement/tutor-family-sales-playbook.md",
  "09-sales-enablement/line-trial-facilitator-script.md",
  "09-sales-enablement/facilitator-recruitment-kit.md",
  "09-sales-enablement/demo-scripts.md",
  "09-sales-enablement/demo-scripts-checklist.md",
  "09-sales-enablement/distributor-rep-onboarding/README.md",
  "09-sales-enablement/distributor-rep-onboarding/faq.md",
  "09-sales-enablement/distributor-rep-onboarding/objection-handling-guide.md",
  "09-sales-enablement/distributor-rep-onboarding/rep-certification-checklist.md",
  "09-sales-enablement/distributor-rep-onboarding/role-play-scenarios.md",
  "09-sales-enablement/distributor-rep-onboarding/weekly-touchpoint-tracker.md",
  "09-sales-enablement/distributor-launch-kit.md",
  "09-sales-enablement/roi-calculator.md",
  "09-sales-enablement/battle-cards/vs-tutor.md",
  "09-sales-enablement/advantage-suite-at-a-glance.md",
  "04-services/pricing.md",
  "02-brand/messaging-house.md",
  "06-research-and-evidence/outcome-claims-policy.md",
  "15-business-applications/sales-advantage.md",
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
  "09-sales-enablement/sales-training-scope-2027.md#4-facts-to-train-approved-wording",
  "09-sales-enablement/sales-training-scope-2027.md#7-the-claims-criterion-for-roleplays",
  "09-sales-enablement/tutor-family-sales-playbook.md#3-the-parent-conversation-discovery",
  "09-sales-enablement/tutor-family-sales-playbook.md#r1-first-conversation-with-a-parent",
  "09-sales-enablement/tutor-family-sales-playbook.md#r2-it-is-too-expensive",
  "09-sales-enablement/tutor-family-sales-playbook.md#r3-my-child-already-goes-to-a-tutor-school",
  "09-sales-enablement/tutor-family-sales-playbook.md#r4-which-book-next",
  "09-sales-enablement/tutor-family-sales-playbook.md#r5-can-you-guarantee-my-child-will-pass",
  "09-sales-enablement/line-trial-facilitator-script.md#step-3-bridge-to-the-class-package-1-minute",
  "09-sales-enablement/line-trial-facilitator-script.md#step-4-handle-objections",
  "09-sales-enablement/facilitator-recruitment-kit.md#rr1-how-does-the-money-work",
  "09-sales-enablement/facilitator-recruitment-kit.md#rr2-isnt-this-a-pyramid-scheme",
  "09-sales-enablement/facilitator-recruitment-kit.md#rr3-how-much-can-i-make-if-i-bring-in-friends",
  "09-sales-enablement/distributor-rep-onboarding/role-play-scenarios.md#scenario-1-the-15-minute-discovery-call",
  "09-sales-enablement/distributor-rep-onboarding/role-play-scenarios.md#scenario-2-the-30-minute-demo",
  "09-sales-enablement/distributor-rep-onboarding/role-play-scenarios.md#scenario-3-the-price-conversation-close",
  "09-sales-enablement/distributor-rep-onboarding/objection-handling-guide.md#objection-8-do-you-have-something-for-our-secondary-section",
  "09-sales-enablement/distributor-rep-onboarding/faq.md#q3-what-do-we-sell-and-which-products-are-live-right-now",
  "09-sales-enablement/distributor-rep-onboarding/faq.md#q4-what-can-i-say-about-managed-service",
  "09-sales-enablement/distributor-rep-onboarding/faq.md#q11-what-if-a-school-asks-for-a-discount-or-a-special-price",
  "06-research-and-evidence/outcome-claims-policy.md#how-to-handle-outcome-questions-in-sales-press-conversations",
  "09-sales-enablement/roi-calculator.md#methodology",
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
  // Removed by the 2027 scope (advantage-pr sales-training-scope-2027.md §6).
  "9-Product Suite",
  "Director Pim",
  "PSP school",
  "80% of reps",
  "within 48 hours",
  "within 24 hours",
  "30-day",
  "Founding School",
  "free trial for up to 50 students",
  "not currently integrated",
];

/** Product-list lines from the 2027 sources (faq.md Q3) that the product lesson must state. */
const canonicalProductListClaims = Object.freeze([
  "- **Live:** Primary Advantage, Tutor Advantage, and CodeCamp Advantage (adult bootcamp).",
  "- **Reading Advantage:** not offered to schools now; its books are now in Tutor Advantage classes.",
  "- **Each its own app, built from the Primary Advantage base app, aimed at primary schools in the 2027 school year:** Science, Math, and Zhongwen Advantage. Show them at the visit. Give no other date.",
  "- **K–6 offer:** Storytime Advantage for Anuban 2 to P2 is part of the K–6 offer shown at the visits. It goes live in November 2026; give no exact day.",
  "- **Planned, no date:** STEM Advantage.",
  "Do not give a date for any of these lines.",
]);

const canonicalTierClaims = Object.freeze([
  "| **App-Only** | Digital platform access | ~1,000 THB/student/year |",
  "| **Blended Learning** | App + physical workbooks + 2-day teacher training + quarterly fidelity reports | ~1,500 THB/student/year |",
  "| **Managed Service** | If the school asks, say: \"Today we offer App-Only and Blended Learning. A fuller service is in planning; we will share it when it is ready.\" Never pre-sell it. | No price |",
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
    "measure/archive/sales_advantage_golive_20260701/curriculum-approval.json";
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
 * Lists every curriculum text field used by claim validation.
 * @param rows Complete deterministic curriculum graph.
 * @returns Module, lesson, scenario, rubric, and quiz text fields.
 */
function curriculumClaimTexts(rows: CurriculumRows): string[] {
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
  ];
}

/**
 * Builds the complete curriculum text surface used by claim validation.
 * @param rows Complete deterministic curriculum graph.
 * @returns Module, lesson, scenario, rubric, and quiz text joined for review.
 */
function curriculumClaimSurface(rows: CurriculumRows): string {
  return curriculumClaimTexts(rows).join("\n");
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

/** One planned-product mention inside a claim statement. */
type PlannedMention = {
  /** Planned products the mention names. */
  products: string[];
  /** Character offset where the mention starts. */
  start: number;
  /** Character offset where the mention ends. */
  end: number;
  /** Whether the mention uses the short product name. */
  short: boolean;
};

/** One claim statement and the planned-product mentions it holds. */
type ClaimStatement = {
  /** Normalized statement text. */
  text: string;
  /** Planned-product mentions in the statement, in text order. */
  mentions: PlannedMention[];
};

/** One block of claim text: a paragraph or a list. */
type ClaimBlock = {
  /** The statements of the block, in text order. */
  statements: ClaimStatement[];
};

/** One curriculum text field and its blocks. */
type ClaimField = {
  /** The blocks of the field, in text order. */
  blocks: ClaimBlock[];
};

/** Abbreviations whose period does not end a statement. */
const claimAbbreviations = new Set([
  "adv", "mr", "mrs", "ms", "dr", "st", "jr", "sr", "vs", "etc", "fig",
  "approx", "inc", "ltd", "co", "vol", "ed", "e.g", "i.e",
]);

/**
 * Splits one source line into claim statements.
 * A period between digits and a period after a known abbreviation do not end a statement.
 * @param line One source line of claim text.
 * @returns Normalized non-empty statements.
 */
function splitClaimStatements(line: string): string[] {
  const parts: string[] = [];
  let current = "";
  const text = line.replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/, "");
  for (let index = 0; index < text.length; index++) {
    const character = text[index]!;
    if (character === "." || character === "!" || character === "?" || character === ";") {
      const previous = text[index - 1] ?? "";
      const next = text[index + 1] ?? "";
      const betweenDigits = character === "." && /\d/.test(previous) && /\d/.test(next);
      const word = /([A-Za-z.]+)$/.exec(current)?.[1]?.toLowerCase() ?? "";
      if (!betweenDigits && !claimAbbreviations.has(word)) {
        parts.push(current);
        current = "";
        continue;
      }
    }
    current += character;
  }
  parts.push(current);
  return parts.map(normalizeCurriculumClaim).filter(Boolean);
}

/**
 * Lists the planned-product mentions of one statement.
 * A full name ("Science Advantage") and a short name ("Science Adv.") both name a planned product.
 * @param text Normalized statement text.
 * @returns Planned-product mentions in text order.
 */
function plannedMentions(text: string): PlannedMention[] {
  const mentions: PlannedMention[] = [];
  const fullName =
    /\b(?:science|math|zhongwen|storytime|stem)\b(?:[\s,]+(?:and|or)?\s*(?:science|math|zhongwen|storytime|stem)\b)*\s+advantage\b/g;
  const shortName = /\b(?:science|math|zhongwen|storytime|stem)\s+adv\b/g;
  const productWord = /\b(?:science|math|zhongwen|storytime|stem)\b/g;
  for (const [pattern, short] of [[fullName, false], [shortName, true]] as const) {
    for (const match of text.matchAll(pattern)) {
      mentions.push({
        products: [...(match[0].match(productWord) ?? [])],
        start: match.index,
        end: match.index + match[0].length,
        short,
      });
    }
  }
  return mentions.sort((left, right) => left.start - right.start);
}

/**
 * Splits the curriculum text into fields of claim blocks.
 * A block is one paragraph or one list of consecutive lines.
 * @param rows Complete deterministic curriculum graph.
 * @returns Claim fields with their blocks and statements.
 */
function curriculumClaimFields(rows: CurriculumRows): ClaimField[] {
  return curriculumClaimTexts(rows).map((text) => ({
    blocks: text.split(/\n\s*\n+/).flatMap((paragraph) => {
      const statements: ClaimStatement[] = [];
      for (const line of paragraph.split("\n")) {
        for (const value of splitClaimStatements(line)) {
          statements.push({ text: value, mentions: plannedMentions(value) });
        }
      }
      return statements.length > 0 ? [{ statements }] : [];
    }),
  }));
}

/**
 * Matches the retired 2027 Managed Service condition, after normalization.
 * The pinned sources no longer state the condition, so the guard bans it.
 */
const retiredManagedServiceCondition = /(?:1[\s-]*2|one or two) more schools/;

/**
 * The public dates of the scope doc Dates paragraph and the products each date licenses.
 * May 2027 licenses the new editions (Primary Advantage Origins 3.2 and Quest 4),
 * which are not planned products, so no planned product holds that date.
 */
const publicProductDates = Object.freeze([
  { date: "2027 school year", products: ["science", "math", "zhongwen"] },
  { date: "november 2026", products: ["storytime"] },
  { date: "may 2027", products: [] },
]);

/**
 * Detects a product lifecycle statement that conflicts with the 2027 strategy.
 * Each public date binds to the products the scope doc licenses for it: the 2027
 * school year to Science, Math, and Zhongwen Advantage, November 2026 to
 * Storytime Advantage, and May 2027 to the new editions. Every planned product
 * of a statement must hold a license for the date nearest to it, and a product
 * that no date licenses fails the statement. A pronoun statement inherits the
 * products of the statement before it in the block, and a pronoun statement
 * that opens a block inherits the products of the last statement of the block
 * before it. A statement that names a planned product may hold only the public
 * dates licensed for that product. Any other year or month fails. A not-negated
 * live claim without a public date fails. Tutor Advantage is not beta; CodeCamp
 * Advantage is not coming; no other product gets a launch year; the retired
 * Managed Service condition is banned.
 * @param fields Claim fields with their blocks, statements, and product mentions.
 * @returns Whether a statement gives a product a conflicting state or date.
 */
function hasConflictingProductStatus(
  fields: readonly ClaimField[],
): boolean {
  const negated = /\b(?:no|not|never|without|don't|do not)\b/;
  const year = /\b20\d\d\b/;
  const leftoverYear = /\b20\d\d\b/g;
  // The month list holds no "may": the word is a public date word and a common verb.
  const leftoverMonth =
    /\b(?:january|february|march|april|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|oct|nov|dec)\b/g;
  // A full ISO date is a date claim unless no planned product is named.
  const isoDate = /\b20\d\d-\d\d-\d\d\b/g;
  const pronounStart = /^(?:it|its|this|they|their|these|those|both|each|either|neither)\b/;
  const liveClaim =
    /\b(?:available|live|launch(?:es|ed|ing)?|release(?:s|d)?|beta|on sale|coming (?:soon|early|late|mid|in|next))\b/;
  for (const field of fields) {
    let previousProducts: string[] = [];
    let previousFullName = false;
    for (const block of field.blocks) {
      let carried: string[] = [];
      let carriedFullName = false;
      for (const [position, statement] of block.statements.entries()) {
        const text = statement.text;
        if (retiredManagedServiceCondition.test(text)) {
          return true;
        }
        if (text.includes("tutor advantage") && /\bbeta\b/.test(text)) {
          return true;
        }
        if (text.includes("codecamp advantage") && /\bcoming\b/.test(text)) {
          return true;
        }
        if (/\badvantage\b/.test(text) &&
          /\b(?:launch(?:es|ed|ing)?|release(?:s|d)?)\b/.test(text) &&
          year.test(text)) {
          return true;
        }
        const pronoun: boolean = pronounStart.test(text);
        // A pronoun statement that opens a block carries the products of the
        // last statement of the block directly before it.
        if (position === 0 && pronoun && previousProducts.length > 0) {
          carried = previousProducts;
          carriedFullName = previousFullName;
        }
        const own: string[] = statement.mentions.flatMap((mention) => mention.products);
        const products: string[] = [
          ...new Set([...own, ...(pronoun ? carried : [])]),
        ];
        const fullName: boolean = statement.mentions.some((mention) => !mention.short) ||
          (pronoun && carriedFullName);
        carried = products;
        carriedFullName = fullName;

        let rest = text;
        for (const entry of publicProductDates) {
          rest = rest.split(entry.date).join(" ");
        }
        // An ISO date is an internal fact only where no planned product is named.
        // On a planned line an ISO date is an exact day, and criterion 8 bans it.
        if (products.length === 0) {
          rest = rest.replace(isoDate, " ");
        }
        const years = rest.match(leftoverYear) ?? [];
        const months = rest.match(leftoverMonth) ?? [];
        // The full product name binds every date token; the short name binds the month dates.
        if (products.length > 0 && years.length + months.length > 0) {
          if (fullName || months.length > 0) {
            return true;
          }
        }

        const dates: Array<{ date: string; start: number; end: number }> = [];
        for (const entry of publicProductDates) {
          let at = text.indexOf(entry.date);
          while (at !== -1) {
            dates.push({ date: entry.date, start: at, end: at + entry.date.length });
            at = text.indexOf(entry.date, at + entry.date.length);
          }
        }
        for (const date of dates) {
          const bound = new Set<string>(pronoun ? carried : []);
          for (const mention of statement.mentions) {
            // A mention binds to the public date nearest to it. Every product of
            // a statement must hold a license for its own date, so one unlicensed
            // product fails the statement whatever the word order.
            const gap = (other: { start: number; end: number }): number =>
              mention.end <= other.start
                ? other.start - mention.end
                : mention.start - other.end;
            const nearest = Math.min(...dates.map(gap));
            if (gap(date) === nearest) {
              for (const product of mention.products) {
                bound.add(product);
              }
            }
          }
          const licensed = publicProductDates.find((entry) => entry.date === date.date);
          if ([...bound].some((product) => !licensed?.products.includes(product))) {
            return true;
          }
        }

        const holdsPublicDate = publicProductDates.some((entry) =>
          text.includes(entry.date) &&
          products.every((product) => entry.products.includes(product)));
        if (fullName &&
          !holdsPublicDate &&
          !negated.test(text) &&
          liveClaim.test(text)) {
          return true;
        }
      }
      previousProducts = carried;
      previousFullName = carriedFullName;
    }
  }
  return false;
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
        /\b20\d{2}\b/.test(statement)
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
    orderedModules.length === 0 ||
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
  const fields = curriculumClaimFields(rows);
  const unexpectedAdvantageName = [...allContent.matchAll(
    /\b((?!The Advantage\b)[A-Z][A-Za-z-]* Advantage)\b/g,
  )].some((match) => !allowedAdvantageNames.has(match[1]!.toLowerCase()));
  const conflictingProductStatus = hasConflictingProductStatus(fields);
  const conflictingTierClaim = hasConflictingTierClaim(
    fields.flatMap((field) =>
      field.blocks.flatMap((block) => block.statements.map((entry) => entry.text))),
  );
  if (
    forbiddenCurriculumClaims.some((claim) =>
      allContent.toLowerCase().includes(claim.toLowerCase())
    ) ||
    unexpectedAdvantageName ||
    conflictingProductStatus ||
    conflictingTierClaim ||
    !canonicalProductListClaims.every((claim) => allContent.includes(claim)) ||
    !canonicalTierClaims.every((claim) => allContent.includes(claim)) ||
    !allContent.includes(
      "Research shows extensive reading outperforms traditional grammar instruction (Aka, 2019).",
    ) ||
    !allContent.includes("# The 8 School Objections") ||
    !allContent.includes("## Objection 8:")
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
      promptVersion: "sales-curriculum-2027-v1",
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
