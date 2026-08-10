import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const SALES_GRAPH_ARTIFACT = join(
  PACKAGE_ROOT,
  "src/data/sales-knowledge-space.json",
);

const SALES_RELEASE_ID = "knowledge-space-sales-mastery-v1.0.0";
const SALES_RELEASE_ENVELOPE = "sales-mastery-release.v1";
const APPROVED_CURRICULUM_DIGEST =
  "ccba5498f453f1e2982307ca29d9d56c8bf17aeb26e1d586de232b44416b8717";
const APPROVAL_EVIDENCE_DIGEST =
  "8b058a5b66631bbffe662a131eed5330bb0c12fa10134a096378e9a4c8bff404";
const APPROVED_SOURCE_COMMIT = "8dd78171f1d57dd775fad2295d60e86fb267dad8";

/**
 * Reads one required checked-in JSON artifact and converts read failures into
 * an actionable red-contract assertion instead of a test-module load failure.
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
 * Loads the future Sales knowledge public entrypoint while keeping its absence
 * as an intended red test result rather than a Vitest harness error.
 * @returns The public module exports.
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
 * Narrows a JSON-compatible value to a record for contract assertions.
 * @param value Candidate value.
 * @param label Human-readable boundary name.
 * @returns The narrowed record.
 */
function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`SALES_KNOWLEDGE_EXPECTED_RECORD label=${label}`);
  }
  return value as Record<string, unknown>;
}

/**
 * Narrows a JSON-compatible value to an array for contract assertions.
 * @param value Candidate value.
 * @param label Human-readable boundary name.
 * @returns The narrowed array.
 */
function asArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`SALES_KNOWLEDGE_EXPECTED_ARRAY label=${label}`);
  }
  return value;
}

/**
 * Requires one function export from the public Sales knowledge entrypoint.
 * @param api Public module exports.
 * @param name Required export name.
 * @returns The exported function.
 */
function requiredFunction(
  api: Record<string, unknown>,
  name: string,
): (input: unknown) => unknown {
  const candidate = api[name];
  if (typeof candidate !== "function") {
    throw new Error(`SALES_KNOWLEDGE_PUBLIC_EXPORT_MISSING name=${name}`);
  }
  return candidate as (input: unknown) => unknown;
}

/**
 * Extracts stable validation issue codes from a fail-closed validator result.
 * @param result Validator result.
 * @returns Ordered issue codes.
 */
function issueCodes(result: unknown): string[] {
  return asArray(
    asRecord(result, "validation result").issues,
    "validation issues",
  ).map((issue) => String(asRecord(issue, "validation issue").code));
}

/**
 * Returns the graph document contained in a Sales release envelope.
 * @param release Candidate Sales release envelope.
 * @returns The domain-neutral knowledge-space graph.
 */
function knowledgeSpace(release: unknown): Record<string, unknown> {
  return asRecord(
    asRecord(release, "sales release").knowledgeSpace,
    "knowledgeSpace",
  );
}

describe("Sales Mastery graph release contract (intended red)", () => {
  it("requires the approved, versioned release envelope and immutable curriculum provenance", async () => {
    const release = asRecord(
      await readRequiredJson(SALES_GRAPH_ARTIFACT),
      "sales graph release",
    );
    expect(release).toMatchObject({
      schemaVersion: SALES_RELEASE_ENVELOPE,
      releaseId: SALES_RELEASE_ID,
      graphVersion: "1.0.0",
      releaseStatus: "reviewed",
      provenance: {
        curriculumGraphSha256: APPROVED_CURRICULUM_DIGEST,
        approvalSha256: APPROVAL_EVIDENCE_DIGEST,
        sourceRepository: "advantage-pr",
        sourceCommit: APPROVED_SOURCE_COMMIT,
      },
    });
  });

  it("parses and validates the checked-in release through public contracts", async () => {
    const [api, release] = await Promise.all([
      loadSalesKnowledgePublicApi(),
      readRequiredJson(SALES_GRAPH_ARTIFACT),
    ]);
    const parseSalesKnowledgeRelease = requiredFunction(
      api,
      "parseSalesKnowledgeRelease",
    );
    const validateSalesKnowledgeRelease = requiredFunction(
      api,
      "validateSalesKnowledgeRelease",
    );
    expect(parseSalesKnowledgeRelease(release)).toEqual(release);
    expect(validateSalesKnowledgeRelease(release)).toEqual({
      valid: true,
      issues: [],
    });
    expect(api.salesKnowledgeRelease).toEqual(release);
  });

  it("uses only stable sales.* identifiers and never reuses Codecamp objectives", async () => {
    const release = await readRequiredJson(SALES_GRAPH_ARTIFACT);
    const space = knowledgeSpace(release);
    const nodes = asArray(space.nodes, "knowledgeSpace.nodes").map((node) =>
      asRecord(node, "knowledge-space node"),
    );
    const edges = asArray(space.edges, "knowledgeSpace.edges").map((edge) =>
      asRecord(edge, "knowledge-space edge"),
    );
    const stableIds = [
      ...nodes.map((node) => String(node.id)),
      ...edges.map((edge) => String(edge.id)),
      ...edges.flatMap((edge) => [
        String(edge.sourceId),
        String(edge.targetId),
      ]),
    ];
    expect(nodes).not.toHaveLength(0);
    expect(stableIds.every((id) => id.startsWith("sales."))).toBe(true);
    expect(stableIds.some((id) => id.startsWith("codecamp."))).toBe(false);
  });

  it("rejects duplicate, dangling, and cyclic prerequisite graph counterexamples", async () => {
    const [api, release] = await Promise.all([
      loadSalesKnowledgePublicApi(),
      readRequiredJson(SALES_GRAPH_ARTIFACT),
    ]);
    const validateSalesKnowledgeRelease = requiredFunction(
      api,
      "validateSalesKnowledgeRelease",
    );
    const duplicateNode = structuredClone(release) as Record<string, unknown>;
    const duplicateSpace = knowledgeSpace(duplicateNode);
    const duplicateNodes = asArray(duplicateSpace.nodes, "duplicate nodes");
    duplicateNodes.push(structuredClone(duplicateNodes[0]));
    expect(issueCodes(validateSalesKnowledgeRelease(duplicateNode))).toContain(
      "DUPLICATE_NODE_ID",
    );

    const danglingEdge = structuredClone(release) as Record<string, unknown>;
    const danglingSpace = knowledgeSpace(danglingEdge);
    const danglingEdges = asArray(danglingSpace.edges, "dangling edges");
    const firstEdge = asRecord(danglingEdges[0], "first graph edge");
    firstEdge.targetId = "sales.missing.objective";
    expect(issueCodes(validateSalesKnowledgeRelease(danglingEdge))).toContain(
      "DANGLING_EDGE",
    );

    const cyclicGraph = structuredClone(release) as Record<string, unknown>;
    const cyclicSpace = knowledgeSpace(cyclicGraph);
    const skills = asArray(cyclicSpace.nodes, "cyclic graph nodes")
      .map((node) => asRecord(node, "candidate skill node"))
      .filter((node) => node.kind === "skill");
    const firstSkill = String(skills[0]?.id);
    const secondSkill = String(skills[1]?.id);
    asArray(cyclicSpace.edges, "cyclic graph edges").push(
      {
        id: "sales.edge.synthetic-prerequisite-forward",
        type: "prerequisite_for",
        sourceId: firstSkill,
        targetId: secondSkill,
        weight: 1,
        confidence: "high",
        sourceRefs: ["apps/sales-advantage/scripts/static-seed.ts"],
        reviewStatus: "approved",
      },
      {
        id: "sales.edge.synthetic-prerequisite-reverse",
        type: "prerequisite_for",
        sourceId: secondSkill,
        targetId: firstSkill,
        weight: 1,
        confidence: "high",
        sourceRefs: ["apps/sales-advantage/scripts/static-seed.ts"],
        reviewStatus: "approved",
      },
    );
    expect(issueCodes(validateSalesKnowledgeRelease(cyclicGraph))).toContain(
      "PREREQUISITE_CYCLE",
    );
  });

  it("rejects source references that are outside the approved Sales corpus", async () => {
    const [api, release] = await Promise.all([
      loadSalesKnowledgePublicApi(),
      readRequiredJson(SALES_GRAPH_ARTIFACT),
    ]);
    const validateSalesKnowledgeRelease = requiredFunction(
      api,
      "validateSalesKnowledgeRelease",
    );
    const unapprovedSource = structuredClone(release) as Record<
      string,
      unknown
    >;
    const node = asRecord(
      asArray(knowledgeSpace(unapprovedSource).nodes, "source-ref nodes")[0],
      "source-ref node",
    );
    node.sourceRefs = ["unapproved-sales-source://invented-claim"];
    expect(
      issueCodes(validateSalesKnowledgeRelease(unapprovedSource)),
    ).toContain("UNAPPROVED_SOURCE_REF");
  });
});
