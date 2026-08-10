import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { staticSalesCurriculumModules } from "../../../../apps/sales-advantage/scripts/static-seed.ts";
import { describe, expect, it } from "vitest";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const REPOSITORY_ROOT = join(PACKAGE_ROOT, "../..");
const GRAPH_ARTIFACT = join(
  PACKAGE_ROOT,
  "src/data/sales-knowledge-space.json",
);
const BINDINGS_ARTIFACT = join(
  PACKAGE_ROOT,
  "src/data/sales-curriculum-bindings.json",
);
const GRAPH_RUNTIME_EXPORT = join(PACKAGE_ROOT, "src/data.ts");
const BINDINGS_RUNTIME_EXPORT = join(PACKAGE_ROOT, "src/binding-data.ts");
const RELEASE_CANDIDATE = join(
  REPOSITORY_ROOT,
  "apps/sales-advantage/curriculum/release-candidate.json",
);
const APPROVAL_EVIDENCE = join(
  REPOSITORY_ROOT,
  "measure/tracks/sales_advantage_golive_20260701/curriculum-approval.json",
);
const STATIC_SEED = join(
  REPOSITORY_ROOT,
  "apps/sales-advantage/scripts/static-seed.ts",
);
const ROOT_LOCKFILE = join(REPOSITORY_ROOT, "pnpm-lock.yaml");

const APPROVED_CURRICULUM_DIGEST =
  "ccba5498f453f1e2982307ca29d9d56c8bf17aeb26e1d586de232b44416b8717";
const APPROVAL_EVIDENCE_DIGEST =
  "8b058a5b66631bbffe662a131eed5330bb0c12fa10134a096378e9a4c8bff404";
const STATIC_SEED_DIGEST =
  "0519b43a6c1a177bcbd7f06fe4d9cf86225afedd5af1f0b76e2aa04c4f3d13ec";
const APPROVED_SOURCE_COMMIT = "8dd78171f1d57dd775fad2295d60e86fb267dad8";
const CANONICAL_BINDINGS_DIGEST =
  "e8843314e2f381a44143acb08c6ff6596bdeac4e9da32fbdb9a5851c8ed32197";

const APPROVED_MODULE_ORDER = [
  "foundations-discovery",
  "framing-value",
  "objections",
  "ra-product-applied",
  "ra-objections-demo",
  "pricing-closing",
] as const;

/**
 * Reads a checked-in JSON artifact at a test boundary.
 * @param path Absolute artifact path.
 * @returns The parsed JSON content.
 */
async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

/**
 * Computes the byte-exact SHA-256 digest used for immutable evidence.
 * @param bytes Artifact bytes.
 * @returns Lowercase hexadecimal digest.
 */
function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Computes a deterministic JSON digest for an already canonical release value.
 * @param value Parsed release value.
 * @returns Lowercase hexadecimal digest.
 */
function canonicalJsonSha256(value: unknown): string {
  return sha256(Buffer.from(JSON.stringify(value)));
}

/**
 * Narrows an external JSON value to a record.
 * @param value Value at a JSON boundary.
 * @param label Failure label.
 * @returns The narrowed record.
 */
function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`SALES_ADVERSARIAL_EXPECTED_RECORD label=${label}`);
  }
  return value as Record<string, unknown>;
}

/**
 * Narrows an external JSON value to an array.
 * @param value Value at a JSON boundary.
 * @param label Failure label.
 * @returns The narrowed array.
 */
function asArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`SALES_ADVERSARIAL_EXPECTED_ARRAY label=${label}`);
  }
  return value;
}

/**
 * Loads the public package surface without coupling tests to source internals.
 * @returns Public Sales knowledge exports.
 */
async function loadPublicApi(): Promise<Record<string, unknown>> {
  return (await import("../index.js")) as Record<string, unknown>;
}

/**
 * Requires one callable public export while preserving a useful contract error.
 * @param api Public Sales knowledge exports.
 * @param name Required export name.
 * @returns The callable export.
 */
function requiredFunction(
  api: Record<string, unknown>,
  name: string,
): (...args: unknown[]) => unknown {
  const candidate = api[name];
  if (typeof candidate !== "function") {
    throw new Error(`SALES_ADVERSARIAL_PUBLIC_EXPORT_MISSING name=${name}`);
  }
  return candidate as (...args: unknown[]) => unknown;
}

/**
 * Extracts machine-readable validation codes from a Sales validation result.
 * @param result Validation result.
 * @returns The result issue codes.
 */
function issueCodes(result: unknown): string[] {
  return asArray(asRecord(result, "validation result").issues, "issues").map(
    (item) => String(asRecord(item, "issue").code),
  );
}

/**
 * Builds an exact containment edge key.
 * @param sourceId Edge source identifier.
 * @param targetId Edge target identifier.
 * @returns Stable edge key.
 */
function containmentKey(sourceId: string, targetId: string): string {
  return `contains:${sourceId}->${targetId}`;
}

/**
 * Supplies immutable release bytes to the future full-artifact verifier.
 * @param graph Candidate graph release.
 * @param bindings Candidate bindings release.
 * @param releaseCandidateBytes Raw owner-controlled release candidate.
 * @param approvalBytes Raw owner-controlled approval evidence.
 * @param seedBytes Raw approved static seed source.
 * @returns The verifier request.
 */
function verificationRequest(
  graph: unknown,
  bindings: unknown,
  releaseCandidateBytes: Uint8Array,
  approvalBytes: Uint8Array,
  seedBytes: Uint8Array,
): Record<string, unknown> {
  return {
    graph,
    bindings,
    releaseCandidateBytes,
    approvalBytes,
    seedBytes,
  };
}

describe("Sales reviewed-release adversarial gates (intended red)", () => {
  it("requires byte-exact approval and seed evidence before a graph can be reviewed", async () => {
    const [
      api,
      graph,
      bindings,
      releaseCandidateBytes,
      approvalBytes,
      seedBytes,
    ] = await Promise.all([
      loadPublicApi(),
      readJson(GRAPH_ARTIFACT),
      readJson(BINDINGS_ARTIFACT),
      readFile(RELEASE_CANDIDATE),
      readFile(APPROVAL_EVIDENCE),
      readFile(STATIC_SEED),
    ]);
    expect(sha256(approvalBytes)).toBe(APPROVAL_EVIDENCE_DIGEST);
    expect(sha256(seedBytes)).toBe(STATIC_SEED_DIGEST);

    const verifySalesReleaseEvidence = requiredFunction(
      api,
      "verifySalesReleaseEvidence",
    );
    const verifySalesRuntimeArtifacts = requiredFunction(
      api,
      "verifySalesRuntimeArtifacts",
    );
    expect(
      issueCodes(verifySalesRuntimeArtifacts({ graph, bindings })),
    ).toEqual(
      expect.arrayContaining([
        "RELEASE_CANDIDATE_EVIDENCE_MISMATCH",
        "APPROVAL_EVIDENCE_MISMATCH",
        "STATIC_SEED_EVIDENCE_MISMATCH",
      ]),
    );
    expect(
      issueCodes(
        verifySalesRuntimeArtifacts({
          graph,
          bindings,
          releaseCandidateBytes,
        }),
      ),
    ).toEqual(
      expect.arrayContaining([
        "APPROVAL_EVIDENCE_MISMATCH",
        "STATIC_SEED_EVIDENCE_MISMATCH",
      ]),
    );
    const valid = await Promise.resolve(
      verifySalesReleaseEvidence(
        verificationRequest(
          graph,
          bindings,
          releaseCandidateBytes,
          approvalBytes,
          seedBytes,
        ),
      ),
    );
    expect(valid).toEqual({ valid: true, issues: [] });

    const forgedCandidate = Buffer.from(
      JSON.stringify({
        graphSha256: APPROVED_CURRICULUM_DIGEST,
        source: { repository: "advantage-pr", commit: APPROVED_SOURCE_COMMIT },
      }),
    );
    expect(
      issueCodes(
        await Promise.resolve(
          verifySalesReleaseEvidence(
            verificationRequest(
              graph,
              bindings,
              forgedCandidate,
              approvalBytes,
              seedBytes,
            ),
          ),
        ),
      ),
    ).toContain("RELEASE_CANDIDATE_EVIDENCE_MISMATCH");

    const forgedApproval = Buffer.from(
      JSON.stringify({
        decision: "approved",
        graphSha256: APPROVED_CURRICULUM_DIGEST,
        source: { repository: "advantage-pr", commit: APPROVED_SOURCE_COMMIT },
      }),
    );
    expect(
      issueCodes(
        await Promise.resolve(
          verifySalesReleaseEvidence(
            verificationRequest(
              graph,
              bindings,
              releaseCandidateBytes,
              forgedApproval,
              seedBytes,
            ),
          ),
        ),
      ),
    ).toContain("APPROVAL_EVIDENCE_MISMATCH");

    const modifiedSeed = Buffer.concat([seedBytes, Buffer.from("\n// drift")]);
    expect(
      issueCodes(
        await Promise.resolve(
          verifySalesReleaseEvidence(
            verificationRequest(
              graph,
              bindings,
              releaseCandidateBytes,
              approvalBytes,
              modifiedSeed,
            ),
          ),
        ),
      ),
    ).toContain("STATIC_SEED_EVIDENCE_MISMATCH");
  });

  it("rejects arbitrary generator inputs instead of stamping reviewed provenance", async () => {
    const [api, artifact, candidate, approval] = await Promise.all([
      loadPublicApi(),
      readJson(BINDINGS_ARTIFACT),
      readJson(RELEASE_CANDIDATE),
      readJson(APPROVAL_EVIDENCE),
    ]);
    const generateSalesCurriculumBindings = requiredFunction(
      api,
      "generateSalesCurriculumBindings",
    );
    const generateSalesKnowledgeRelease = requiredFunction(
      api,
      "generateSalesKnowledgeRelease",
    );
    const digestSalesCurriculumBindings = requiredFunction(
      api,
      "digestSalesCurriculumBindings",
    );
    const generated = generateSalesCurriculumBindings({
      staticSalesCurriculumModules,
      releaseCandidate: candidate,
      approval,
    });
    expect(generated).toEqual(artifact);
    expect(digestSalesCurriculumBindings(generated)).toBe(
      CANONICAL_BINDINGS_DIGEST,
    );
    const duplicateCoordinate = structuredClone(staticSalesCurriculumModules);
    duplicateCoordinate[0]!.lessons.push(
      structuredClone(duplicateCoordinate[0]!.lessons[0]!),
    );
    expect(() =>
      generateSalesCurriculumBindings({
        staticSalesCurriculumModules: duplicateCoordinate,
        releaseCandidate: candidate,
        approval,
      }),
    ).toThrow(/SALES_(?:RELEASE_)?EVIDENCE|DUPLICATE|COORDINATE/i);

    expect(() =>
      generateSalesCurriculumBindings({
        staticSalesCurriculumModules,
        releaseCandidate: {
          graphSha256: APPROVED_CURRICULUM_DIGEST,
          source: {
            repository: "advantage-pr",
            commit: APPROVED_SOURCE_COMMIT,
          },
        },
        approval: { decision: "approved" },
      }),
    ).toThrow(/SALES_(?:RELEASE_)?EVIDENCE|APPROVAL/i);

    const reversedModules = structuredClone(staticSalesCurriculumModules);
    reversedModules.reverse();
    expect(() =>
      generateSalesCurriculumBindings({
        staticSalesCurriculumModules: reversedModules,
        releaseCandidate: candidate,
        approval,
      }),
    ).toThrow(/SALES_.*COORDINATE|ORDER/i);
    expect(() => generateSalesKnowledgeRelease(reversedModules)).toThrow(
      /SALES_.*COORDINATE|ORDER/i,
    );

    const reversedLessons = structuredClone(staticSalesCurriculumModules);
    reversedLessons[0]!.lessons.reverse();
    expect(() =>
      generateSalesCurriculumBindings({
        staticSalesCurriculumModules: reversedLessons,
        releaseCandidate: candidate,
        approval,
      }),
    ).toThrow(/SALES_.*COORDINATE|ORDER/i);
    expect(() => generateSalesKnowledgeRelease(reversedLessons)).toThrow(
      /SALES_.*COORDINATE|ORDER/i,
    );
  });

  it("allows only approved coordinate containment: no invented standard or prerequisite semantics", async () => {
    const [api, graph] = await Promise.all([
      loadPublicApi(),
      readJson(GRAPH_ARTIFACT),
    ]);
    const release = asRecord(graph, "graph release");
    const space = asRecord(release.knowledgeSpace, "knowledge space");
    const nodes = asArray(space.nodes, "nodes").map((node) =>
      asRecord(node, "node"),
    );
    const edges = asArray(space.edges, "edges").map((edge) =>
      asRecord(edge, "edge"),
    );
    const modules = nodes
      .filter((node) => node.kind === "content_group")
      .sort(
        (left, right) =>
          Number(asRecord(left.metadata, "left metadata").moduleOrder) -
          Number(asRecord(right.metadata, "right metadata").moduleOrder),
      );
    expect(
      modules.map((node) => String(node.id).replace("sales.module.", "")),
    ).toEqual(APPROVED_MODULE_ORDER);
    expect(api.SALES_MODULE_SLUGS).toEqual(APPROVED_MODULE_ORDER);
    expect(
      nodes.some((node) => node.id === "sales.standard.sales-mastery"),
    ).toBe(false);

    const expectedEdges = new Set<string>();
    for (const moduleSlug of APPROVED_MODULE_ORDER) {
      const moduleId = `sales.module.${moduleSlug}`;
      expectedEdges.add(containmentKey("sales.domain", moduleId));
      for (const lesson of nodes.filter(
        (node) =>
          node.kind === "skill" &&
          String(node.id).startsWith(`sales.skill.${moduleSlug}.lesson-`),
      )) {
        expectedEdges.add(containmentKey(moduleId, String(lesson.id)));
      }
    }
    expect(nodes.filter((node) => node.kind === "skill")).toHaveLength(27);
    expect(edges.map((edge) => String(edge.type))).toEqual(
      Array.from({ length: expectedEdges.size }, () => "contains"),
    );
    expect(
      new Set(
        edges.map((edge) =>
          containmentKey(String(edge.sourceId), String(edge.targetId)),
        ),
      ),
    ).toEqual(expectedEdges);

    const validateSalesKnowledgeRelease = requiredFunction(
      api,
      "validateSalesKnowledgeRelease",
    );
    const rewired = structuredClone(graph) as Record<string, unknown>;
    const rewiredEdges = asArray(
      asRecord(rewired, "rewired release").knowledgeSpace &&
        asRecord(
          asRecord(rewired, "rewired release").knowledgeSpace,
          "rewired knowledge space",
        ).edges,
      "rewired edges",
    );
    const containment = asRecord(
      rewiredEdges.find(
        (edge) =>
          asRecord(edge, "candidate edge").id ===
          "sales.edge.contains-module-foundations-discovery-lesson-1",
      ),
      "first lesson containment edge",
    );
    containment.sourceId = "sales.module.framing-value";
    expect(issueCodes(validateSalesKnowledgeRelease(rewired))).toContain(
      "UNAPPROVED_RELATION",
    );

    const prefixForgedSource = structuredClone(graph) as Record<
      string,
      unknown
    >;
    asRecord(
      asArray(
        asRecord(prefixForgedSource, "prefix-forged release").knowledgeSpace &&
          asRecord(
            asRecord(prefixForgedSource, "prefix-forged release")
              .knowledgeSpace,
            "prefix-forged knowledge space",
          ).nodes,
        "prefix-forged nodes",
      )[0],
      "prefix-forged node",
    ).sourceRefs = ["apps/sales-advantage/scripts/static-seed.ts/forged"];
    expect(
      issueCodes(validateSalesKnowledgeRelease(prefixForgedSource)),
    ).toContain("UNAPPROVED_SOURCE_REF");
  });

  it("requires a full runtime verifier so public exports cannot bypass graph or binding drift", async () => {
    const [
      api,
      graph,
      bindings,
      releaseCandidateBytes,
      approvalBytes,
      seedBytes,
      graphRuntimeSource,
      bindingsRuntimeSource,
    ] = await Promise.all([
      loadPublicApi(),
      readJson(GRAPH_ARTIFACT),
      readJson(BINDINGS_ARTIFACT),
      readFile(RELEASE_CANDIDATE),
      readFile(APPROVAL_EVIDENCE),
      readFile(STATIC_SEED),
      readFile(GRAPH_RUNTIME_EXPORT, "utf8"),
      readFile(BINDINGS_RUNTIME_EXPORT, "utf8"),
    ]);
    const verifySalesRuntimeArtifacts = requiredFunction(
      api,
      "verifySalesRuntimeArtifacts",
    );
    expect(
      await Promise.resolve(
        verifySalesRuntimeArtifacts(
          verificationRequest(
            graph,
            bindings,
            releaseCandidateBytes,
            approvalBytes,
            seedBytes,
          ),
        ),
      ),
    ).toMatchObject({ valid: true, issues: [] });
    expect(graphRuntimeSource).toContain("verifySalesRuntimeArtifacts");
    expect(bindingsRuntimeSource).toContain("verifySalesRuntimeArtifacts");

    const driftedGraph = structuredClone(graph) as Record<string, unknown>;
    asRecord(driftedGraph, "drifted graph").provenance = {
      ...asRecord(
        asRecord(driftedGraph, "drifted graph").provenance,
        "provenance",
      ),
      sourceCommit: "0".repeat(40),
    };
    expect(
      issueCodes(
        await Promise.resolve(
          verifySalesRuntimeArtifacts(
            verificationRequest(
              driftedGraph,
              bindings,
              releaseCandidateBytes,
              approvalBytes,
              seedBytes,
            ),
          ),
        ),
      ),
    ).toContain("PROVENANCE_DRIFT");
  });

  it("requires assessed roleplay evidence to use the canonical digest of its exact rubric", async () => {
    const [api, bindings, graph, candidate, approval] = await Promise.all([
      loadPublicApi(),
      readJson(BINDINGS_ARTIFACT),
      readJson(GRAPH_ARTIFACT),
      readJson(RELEASE_CANDIDATE),
      readJson(APPROVAL_EVIDENCE),
    ]);
    const validateSalesCurriculumBindings = requiredFunction(
      api,
      "validateSalesCurriculumBindings",
    );
    const assessed = structuredClone(bindings) as Record<string, unknown>;
    const roleplay = asRecord(
      asArray(asRecord(assessed, "bindings release").bindings, "bindings")
        .map((binding) => asRecord(binding, "binding"))
        .find((binding) => binding.activityKind === "roleplay"),
      "roleplay binding",
    );
    roleplay.evidenceMode = "assessed";
    roleplay.evidenceWeight = 0.8;
    roleplay.evaluatorEligibility = {
      contractVersion: "sales-roleplay-evaluator-eligibility.v1",
      immutableAttempt: true,
      evaluator: {
        provider: "approved-provider",
        model: "approved-model",
        evaluatorVersion: "approved-evaluator-v1",
      },
      rubric: {
        rubricId: asArray(roleplay.rubricRefs, "rubric refs")[0],
        rubricDigest: "0".repeat(64),
      },
    };
    expect(
      issueCodes(
        validateSalesCurriculumBindings(assessed, graph, {
          releaseCandidate: candidate,
          approval,
        }),
      ),
    ).toContain("ROLEPLAY_RUBRIC_DIGEST_MISMATCH");

    const forgedAssessed = structuredClone(bindings) as Record<string, unknown>;
    const forgedRoleplay = asRecord(
      asArray(
        asRecord(forgedAssessed, "forged assessed release").bindings,
        "bindings",
      )
        .map((binding) => asRecord(binding, "binding"))
        .find((binding) => binding.activityKind === "roleplay"),
      "forged assessed roleplay",
    );
    const rubricId = String(
      asArray(forgedRoleplay.rubricRefs, "forged rubric refs")[0],
    );
    const exactRubric = asArray(
      asRecord(forgedAssessed, "forged assessed release").rubrics,
      "rubrics",
    )
      .map((rubric) => asRecord(rubric, "rubric"))
      .find((rubric) => rubric.rubricId === rubricId);
    forgedRoleplay.evidenceMode = "assessed";
    forgedRoleplay.evidenceWeight = 0.8;
    forgedRoleplay.evaluatorEligibility = {
      contractVersion: "sales-roleplay-evaluator-eligibility.v1",
      immutableAttempt: true,
      evaluator: {
        provider: "forged-provider",
        model: "forged-model",
        evaluatorVersion: "forged-evaluator-v1",
      },
      rubric: {
        rubricId,
        rubricDigest: canonicalJsonSha256(exactRubric),
      },
      attempt: {
        attemptId: "forged-attempt",
        attemptDigest: "a".repeat(64),
      },
    };
    expect(
      issueCodes(
        validateSalesCurriculumBindings(forgedAssessed, graph, {
          releaseCandidate: candidate,
          approval,
        }),
      ),
    ).toContain("ROLEPLAY_EVALUATOR_RELEASE_UNAPPROVED");
  });

  it("keeps a canonical checked-in bindings artifact and makes package admission an explicit final gate", async () => {
    const [api, artifact, lockfile] = await Promise.all([
      loadPublicApi(),
      readJson(BINDINGS_ARTIFACT),
      readFile(ROOT_LOCKFILE, "utf8"),
    ]);
    const digestSalesCurriculumBindings = requiredFunction(
      api,
      "digestSalesCurriculumBindings",
    );
    expect(canonicalJsonSha256(artifact)).toBe(CANONICAL_BINDINGS_DIGEST);
    expect(digestSalesCurriculumBindings(artifact)).toBe(
      CANONICAL_BINDINGS_DIGEST,
    );
    expect(lockfile).toMatch(/^\s{2}packages\/sales-knowledge:\s*$/m);
  });
});
