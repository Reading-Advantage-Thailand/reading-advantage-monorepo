import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { staticSalesCurriculumModules } from "../../../../apps/sales-advantage/scripts/static-seed.ts";
import { describe, expect, it } from "vitest";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const REPOSITORY_ROOT = join(PACKAGE_ROOT, "../..");
const SALES_GRAPH_ARTIFACT = join(
  PACKAGE_ROOT,
  "src/data/sales-knowledge-space.json",
);
const SALES_BINDINGS_ARTIFACT = join(
  PACKAGE_ROOT,
  "src/data/sales-curriculum-bindings.json",
);
const SALES_STATIC_SEED = join(
  REPOSITORY_ROOT,
  "apps/sales-advantage/scripts/static-seed.ts",
);
const SALES_RELEASE_CANDIDATE = join(
  REPOSITORY_ROOT,
  "apps/sales-advantage/curriculum/release-candidate.json",
);
const SALES_APPROVAL_EVIDENCE = join(
  REPOSITORY_ROOT,
  "measure/tracks/sales_advantage_golive_20260701/curriculum-approval.json",
);

const SALES_RELEASE_ID = "knowledge-space-sales-mastery-v1.0.0";
const SALES_RELEASE_ENVELOPE = "sales-mastery-release.v1";
const APPROVED_CURRICULUM_DIGEST =
  "ccba5498f453f1e2982307ca29d9d56c8bf17aeb26e1d586de232b44416b8717";
const APPROVAL_EVIDENCE_DIGEST =
  "8b058a5b66631bbffe662a131eed5330bb0c12fa10134a096378e9a4c8bff404";
const APPROVED_SOURCE_COMMIT = "8dd78171f1d57dd775fad2295d60e86fb267dad8";

/**
 * Reads one required checked-in JSON artifact and reports an actionable
 * intended-red failure when the future artifact does not exist yet.
 * @param path Absolute artifact path.
 * @returns Parsed JSON content.
 */
async function readRequiredJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new Error(
      `SALES_KNOWLEDGE_ARTIFACT_MISSING_OR_INVALID path=${path} detail=${detail}`,
    );
  }
}

/**
 * Loads the future public Sales knowledge entrypoint without allowing a missing
 * module to become an unhandled Vitest transform or discovery failure.
 * @returns Public module exports.
 */
async function loadSalesKnowledgePublicApi(): Promise<Record<string, unknown>> {
  try {
    return (await import("../index.js")) as Record<string, unknown>;
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new Error(
      "SALES_KNOWLEDGE_PUBLIC_API_MISSING expected=packages/sales-knowledge/src/index.ts " +
        `detail=${detail}`,
    );
  }
}

/**
 * Narrows an unknown JSON-compatible value to a record.
 * @param value Candidate value.
 * @param label Boundary label used in failures.
 * @returns The narrowed record.
 */
function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`SALES_KNOWLEDGE_EXPECTED_RECORD label=${label}`);
  }
  return value as Record<string, unknown>;
}

/**
 * Narrows an unknown JSON-compatible value to an array.
 * @param value Candidate value.
 * @param label Boundary label used in failures.
 * @returns The narrowed array.
 */
function asArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`SALES_KNOWLEDGE_EXPECTED_ARRAY label=${label}`);
  }
  return value;
}

/**
 * Requires one callable public export from the future Sales knowledge package.
 * @param api Public module exports.
 * @param name Required export name.
 * @returns The callable export.
 */
function requiredFunction(
  api: Record<string, unknown>,
  name: string,
): (...args: unknown[]) => unknown {
  const candidate = api[name];
  if (typeof candidate !== "function") {
    throw new Error(`SALES_KNOWLEDGE_PUBLIC_EXPORT_MISSING name=${name}`);
  }
  return candidate as (...args: unknown[]) => unknown;
}

/**
 * Extracts stable issue codes from a Sales curriculum validation result.
 * @param result Validator result.
 * @returns Ordered validation issue codes.
 */
function issueCodes(result: unknown): string[] {
  return asArray(
    asRecord(result, "validation result").issues,
    "validation issues",
  ).map((issue) => String(asRecord(issue, "validation issue").code));
}

/**
 * Builds a stable source coordinate key without inspecting curriculum prose.
 * @param moduleSlug Approved seed module slug.
 * @param lessonOrder Approved seed lesson order.
 * @param itemOrder Optional quiz-question or roleplay-scenario order.
 * @returns Stable curriculum coordinate.
 */
function coordinate(
  moduleSlug: string,
  lessonOrder: number,
  itemOrder?: number,
): string {
  return itemOrder == null
    ? `${moduleSlug}:${lessonOrder}`
    : `${moduleSlug}:${lessonOrder}:${itemOrder}`;
}

/**
 * Derives only approved module/order/item coordinates from the deterministic
 * seed, intentionally excluding titles, lesson content, and prose objectives.
 * @returns Exact expected curriculum activity coordinates by kind.
 */
function expectedSeedCoordinates(): {
  modules: string[];
  lessons: string[];
  quizzes: string[];
  roleplays: string[];
  roleplayLessons: string[];
} {
  const modules: string[] = [];
  const lessons: string[] = [];
  const quizzes: string[] = [];
  const roleplays: string[] = [];
  const roleplayLessons = new Set<string>();
  for (const module of staticSalesCurriculumModules) {
    modules.push(module.slug);
    for (const lesson of module.lessons) {
      const lessonCoordinate = coordinate(module.slug, lesson.order);
      lessons.push(lessonCoordinate);
      if ("quizQuestions" in lesson && lesson.quizQuestions) {
        lesson.quizQuestions.forEach((_, index) => {
          quizzes.push(coordinate(module.slug, lesson.order, index + 1));
        });
      }
      if ("scenarios" in lesson && lesson.scenarios) {
        lesson.scenarios.forEach((_, index) => {
          roleplays.push(coordinate(module.slug, lesson.order, index + 1));
          roleplayLessons.add(lessonCoordinate);
        });
      }
    }
  }
  return {
    modules: modules.sort(),
    lessons: lessons.sort(),
    quizzes: quizzes.sort(),
    roleplays: roleplays.sort(),
    roleplayLessons: [...roleplayLessons].sort(),
  };
}

/**
 * Converts one binding source object into an approved coordinate key.
 * @param binding Candidate binding record.
 * @returns Coordinate key for the binding's source row.
 */
function bindingCoordinate(binding: Record<string, unknown>): string {
  const source = asRecord(binding.source, "binding source");
  const moduleSlug = String(source.moduleSlug);
  const lessonOrder = Number(source.lessonOrder);
  const itemOrder =
    source.itemOrder == null ? undefined : Number(source.itemOrder);
  return coordinate(moduleSlug, lessonOrder, itemOrder);
}

/**
 * Calls the expected fail-closed binding validator with its release, graph, and
 * approved owner-controlled source records.
 * @param api Public Sales knowledge exports.
 * @param bindings Candidate binding release.
 * @param graph Candidate graph release.
 * @param releaseCandidate Approved Sales curriculum release candidate.
 * @param approval Approved owner evidence.
 * @returns Binding validation result.
 */
function validateBindings(
  api: Record<string, unknown>,
  bindings: unknown,
  graph: unknown,
  releaseCandidate: unknown,
  approval: unknown,
): unknown {
  return requiredFunction(api, "validateSalesCurriculumBindings")(
    bindings,
    graph,
    { releaseCandidate, approval },
  );
}

describe("Sales curriculum-to-objective bindings (intended red)", () => {
  it("derives the protected release inventory from approved coordinates, not lesson prose", () => {
    expect(expectedSeedCoordinates()).toEqual({
      modules: [
        "foundations-discovery",
        "framing-value",
        "objections",
        "pricing-closing",
        "ra-objections-demo",
        "ra-product-applied",
      ],
      lessons: expect.any(Array),
      quizzes: expect.any(Array),
      roleplays: expect.any(Array),
      roleplayLessons: expect.any(Array),
    });
    const expected = expectedSeedCoordinates();
    expect(expected.lessons).toHaveLength(27);
    expect(expected.quizzes).toHaveLength(14);
    expect(expected.roleplays).toHaveLength(8);
    expect(expected.roleplayLessons).toHaveLength(7);
  });

  it("binds every approved coordinate exactly once with zero-evidence lesson exposure", async () => {
    const [api, bindings, graph, releaseCandidate, approval] =
      await Promise.all([
        loadSalesKnowledgePublicApi(),
        readRequiredJson(SALES_BINDINGS_ARTIFACT),
        readRequiredJson(SALES_GRAPH_ARTIFACT),
        readRequiredJson(SALES_RELEASE_CANDIDATE),
        readRequiredJson(SALES_APPROVAL_EVIDENCE),
      ]);
    expect(asRecord(bindings, "binding release")).toMatchObject({
      schemaVersion: SALES_RELEASE_ENVELOPE,
      releaseId: SALES_RELEASE_ID,
      provenance: {
        curriculumGraphSha256: APPROVED_CURRICULUM_DIGEST,
        approvalSha256: APPROVAL_EVIDENCE_DIGEST,
        sourceRepository: "advantage-pr",
        sourceCommit: APPROVED_SOURCE_COMMIT,
        seedArtifact: "apps/sales-advantage/scripts/static-seed.ts",
      },
    });
    expect(
      validateBindings(api, bindings, graph, releaseCandidate, approval),
    ).toEqual({
      valid: true,
      issues: [],
    });

    const expected = expectedSeedCoordinates();
    const entries = asArray(
      asRecord(bindings, "binding release").bindings,
      "bindings",
    ).map((entry) => asRecord(entry, "binding"));
    const exposure = entries.filter((entry) => entry.activityKind === "lesson");
    expect(exposure).toHaveLength(27);
    expect(exposure.map(bindingCoordinate).sort()).toEqual(expected.lessons);
    for (const binding of exposure) {
      expect(binding).toMatchObject({
        practiceMode: "exposure",
        evidenceMode: "exposure",
        evidenceWeight: 0,
        evidenceSource: "lesson-view",
        variantId: null,
        variantFamily: null,
      });
      expect(
        Object.keys(asRecord(binding.source, "lesson exposure source")).sort(),
      ).toEqual(["lessonOrder", "moduleSlug"]);
    }
  });

  it("defines fourteen practice.v1 quiz variants, preserving incorrect outcomes as evidence", async () => {
    const bindings = asRecord(
      await readRequiredJson(SALES_BINDINGS_ARTIFACT),
      "binding release",
    );
    const quizzes = asArray(bindings.bindings, "bindings")
      .map((entry) => asRecord(entry, "binding"))
      .filter((entry) => entry.activityKind === "quiz-question");
    expect(quizzes).toHaveLength(14);
    expect(quizzes.map(bindingCoordinate).sort()).toEqual(
      expectedSeedCoordinates().quizzes,
    );
    for (const binding of quizzes) {
      expect(binding).toMatchObject({
        practiceContract: "practice.v1",
        practiceMode: "assessment",
        evidenceMode: "assessed",
        evidenceSource: "quiz-response",
      });
      expect(Number(binding.evidenceWeight)).toBeGreaterThan(0);
      expect(String(binding.variantId)).toMatch(/^sales\..+\.v1$/);
      expect(
        asArray(binding.evidenceOutcomes, "quiz evidence outcomes"),
      ).toEqual(["correct", "incorrect"]);
    }
  });

  it("keeps eight roleplay bindings pending a versioned evaluator eligibility contract", async () => {
    const bindings = asRecord(
      await readRequiredJson(SALES_BINDINGS_ARTIFACT),
      "binding release",
    );
    const roleplays = asArray(bindings.bindings, "bindings")
      .map((entry) => asRecord(entry, "binding"))
      .filter((entry) => entry.activityKind === "roleplay");
    expect(roleplays).toHaveLength(8);
    expect(roleplays.map(bindingCoordinate).sort()).toEqual(
      expectedSeedCoordinates().roleplays,
    );
    expect(
      new Set(
        roleplays
          .map(bindingCoordinate)
          .map((key) => key.split(":").slice(0, 2).join(":")),
      ),
    ).toEqual(new Set(expectedSeedCoordinates().roleplayLessons));
    for (const binding of roleplays) {
      expect(binding).toMatchObject({
        practiceContract: "practice.v1",
        evidenceMode: "pending_evaluator_eligibility",
        evidenceSource: "roleplay-evaluation",
      });
      expect(asArray(binding.rubricRefs, "roleplay rubric refs")).toHaveLength(
        1,
      );
      expect(binding.evaluatorEligibility).toBeNull();
    }
  });

  it("rejects missing or extra source coordinates, unknown objectives, and duplicate variants", async () => {
    const [api, bindings, graph, releaseCandidate, approval] =
      await Promise.all([
        loadSalesKnowledgePublicApi(),
        readRequiredJson(SALES_BINDINGS_ARTIFACT),
        readRequiredJson(SALES_GRAPH_ARTIFACT),
        readRequiredJson(SALES_RELEASE_CANDIDATE),
        readRequiredJson(SALES_APPROVAL_EVIDENCE),
      ]);
    const missing = structuredClone(bindings) as Record<string, unknown>;
    asArray(
      asRecord(missing, "missing binding release").bindings,
      "missing bindings",
    ).pop();
    expect(
      issueCodes(
        validateBindings(api, missing, graph, releaseCandidate, approval),
      ),
    ).toContain("MISSING_SOURCE_COORDINATE");

    const extra = structuredClone(bindings) as Record<string, unknown>;
    const extraBindings = asArray(
      asRecord(extra, "extra binding release").bindings,
      "extra bindings",
    );
    extraBindings.push({
      ...structuredClone(extraBindings[0]),
      activityId: "sales.lesson.synthetic-extra",
      source: { moduleSlug: "foundations-discovery", lessonOrder: 999 },
    });
    expect(
      issueCodes(
        validateBindings(api, extra, graph, releaseCandidate, approval),
      ),
    ).toContain("EXTRA_SOURCE_COORDINATE");

    const unknownObjective = structuredClone(bindings) as Record<
      string,
      unknown
    >;
    asRecord(
      asArray(
        asRecord(unknownObjective, "unknown objective release").bindings,
        "unknown objective bindings",
      )[0],
      "unknown objective binding",
    ).objectiveIds = ["sales.unknown.objective"];
    expect(
      issueCodes(
        validateBindings(
          api,
          unknownObjective,
          graph,
          releaseCandidate,
          approval,
        ),
      ),
    ).toContain("UNKNOWN_OBJECTIVE");

    const duplicateVariant = structuredClone(bindings) as Record<
      string,
      unknown
    >;
    const quizBindings = asArray(
      asRecord(duplicateVariant, "duplicate variant release").bindings,
      "duplicate variant bindings",
    )
      .map((entry) => asRecord(entry, "duplicate variant binding"))
      .filter((entry) => entry.activityKind === "quiz-question");
    quizBindings[1]!.variantId = quizBindings[0]!.variantId;
    expect(
      issueCodes(
        validateBindings(
          api,
          duplicateVariant,
          graph,
          releaseCandidate,
          approval,
        ),
      ),
    ).toContain("DUPLICATE_VARIANT_ID");
  });

  it("rejects prose-derived objectives and source-row, rubric, approval, and source-reference drift", async () => {
    const [api, bindings, graph, releaseCandidate, approval] =
      await Promise.all([
        loadSalesKnowledgePublicApi(),
        readRequiredJson(SALES_BINDINGS_ARTIFACT),
        readRequiredJson(SALES_GRAPH_ARTIFACT),
        readRequiredJson(SALES_RELEASE_CANDIDATE),
        readRequiredJson(SALES_APPROVAL_EVIDENCE),
      ]);
    const proseDerived = structuredClone(bindings) as Record<string, unknown>;
    asRecord(
      asArray(
        asRecord(proseDerived, "prose-derived release").bindings,
        "prose-derived bindings",
      )[0],
      "prose-derived binding",
    ).objectiveDerivation = {
      kind: "lesson-prose",
      excerpt: "invented objective",
    };
    expect(
      validateBindings(api, proseDerived, graph, releaseCandidate, approval),
    ).toMatchObject({
      valid: false,
    });

    const sourceDrift = structuredClone(bindings) as Record<string, unknown>;
    asRecord(
      asArray(
        asRecord(sourceDrift, "source-drift release").bindings,
        "source-drift bindings",
      )[0],
      "source-drift binding",
    ).source = { moduleSlug: "foundations-discovery", lessonOrder: 99 };
    expect(
      issueCodes(
        validateBindings(api, sourceDrift, graph, releaseCandidate, approval),
      ),
    ).toContain("SOURCE_ROW_DRIFT");

    const rubricDrift = structuredClone(bindings) as Record<string, unknown>;
    asRecord(
      asArray(
        asRecord(rubricDrift, "rubric-drift release").bindings,
        "rubric-drift bindings",
      )
        .map((entry) => asRecord(entry, "rubric-drift binding"))
        .find((entry) => entry.activityKind === "roleplay"),
      "roleplay binding",
    ).rubricRefs = ["sales.rubric.unapproved.v1"];
    expect(
      issueCodes(
        validateBindings(api, rubricDrift, graph, releaseCandidate, approval),
      ),
    ).toContain("RUBRIC_DRIFT");

    const approvalDrift = structuredClone(bindings) as Record<string, unknown>;
    asRecord(
      asRecord(approvalDrift, "approval-drift release").provenance,
      "provenance",
    ).approvalSha256 = "0".repeat(64);
    expect(
      issueCodes(
        validateBindings(api, approvalDrift, graph, releaseCandidate, approval),
      ),
    ).toContain("APPROVAL_DRIFT");

    const sourceReferenceDrift = structuredClone(bindings) as Record<
      string,
      unknown
    >;
    asRecord(
      asArray(
        asRecord(sourceReferenceDrift, "source-reference release").rubrics,
        "rubrics",
      )[0],
      "rubric",
    ).sourceRef = "unapproved-sales-source://made-up";
    expect(
      issueCodes(
        validateBindings(
          api,
          sourceReferenceDrift,
          graph,
          releaseCandidate,
          approval,
        ),
      ),
    ).toContain("UNAPPROVED_SOURCE_REF");
  });

  it("rejects roleplay evidence eligibility without immutable evaluator, provider, model, and rubric provenance", async () => {
    const [api, bindings, graph, releaseCandidate, approval] =
      await Promise.all([
        loadSalesKnowledgePublicApi(),
        readRequiredJson(SALES_BINDINGS_ARTIFACT),
        readRequiredJson(SALES_GRAPH_ARTIFACT),
        readRequiredJson(SALES_RELEASE_CANDIDATE),
        readRequiredJson(SALES_APPROVAL_EVIDENCE),
      ]);
    const roleplayEligibility = structuredClone(bindings) as Record<
      string,
      unknown
    >;
    const roleplay = asRecord(
      asArray(
        asRecord(roleplayEligibility, "roleplay eligibility release").bindings,
        "roleplay eligibility bindings",
      )
        .map((entry) => asRecord(entry, "roleplay eligibility binding"))
        .find((entry) => entry.activityKind === "roleplay"),
      "roleplay eligibility binding",
    );
    roleplay.evidenceMode = "assessed";
    roleplay.evaluatorEligibility = {
      contractVersion: "sales-roleplay-evaluator-eligibility.v1",
      immutableAttempt: true,
      evaluator: { provider: "openrouter" },
      rubric: {
        rubricId: asArray(roleplay.rubricRefs, "roleplay rubric refs")[0],
      },
    };
    expect(
      issueCodes(
        validateBindings(
          api,
          roleplayEligibility,
          graph,
          releaseCandidate,
          approval,
        ),
      ),
    ).toContain("ROLEPLAY_EVALUATOR_PROVENANCE_INCOMPLETE");
  });

  it("generates metadata from immutable seed coordinates without rewriting the approved curriculum", async () => {
    const [api, releaseCandidate, approval, beforeSeedBytes] =
      await Promise.all([
        loadSalesKnowledgePublicApi(),
        readRequiredJson(SALES_RELEASE_CANDIDATE),
        readRequiredJson(SALES_APPROVAL_EVIDENCE),
        readFile(SALES_STATIC_SEED),
      ]);
    const generateSalesCurriculumBindings = requiredFunction(
      api,
      "generateSalesCurriculumBindings",
    );
    const generated = asRecord(
      generateSalesCurriculumBindings({
        staticSalesCurriculumModules,
        releaseCandidate,
        approval,
      }),
      "generated bindings",
    );
    expect(await readFile(SALES_STATIC_SEED)).toEqual(beforeSeedBytes);
    expect(generated).toMatchObject({
      schemaVersion: SALES_RELEASE_ENVELOPE,
      releaseId: SALES_RELEASE_ID,
    });
    expect(generated).not.toHaveProperty("curriculum");
    expect(generated).not.toHaveProperty("modules");
    const generatedBindings = asArray(generated.bindings, "generated bindings");
    expect(generatedBindings).toHaveLength(49);
    expect(
      generatedBindings.some((entry) => {
        const binding = asRecord(entry, "generated binding");
        return (
          "content" in binding ||
          "lessonText" in binding ||
          "questionText" in binding
        );
      }),
    ).toBe(false);
  });
});
