import { knowledgeSpaceSchema } from "@reading-advantage/knowledge-space-core";
import { z } from "zod";

/** Instructional clusters used to organize Codecamp objectives without changing their IDs. */
export const CodeClusterSchema = z.enum([
  "foundation",
  "frontend",
  "backend",
  "data",
  "testing",
  "ai",
  "workflow",
  "deployment",
  "architecture",
  "game-development",
  "standards",
]);

/** Granularity classes that distinguish concepts, applications, workflows, containers, and projections. */
export const CodeObjectiveTypeSchema = z.enum([
  "concept",
  "application",
  "workflow",
  "container",
  "projection",
]);

/** Strict metadata attached to every node in the authored Codecamp graph. */
export const CodeNodeMetadataSchema = z
  .object({
    cluster: CodeClusterSchema,
    objectiveType: CodeObjectiveTypeSchema,
    priority: z.enum(["must", "should", "could"]),
    lifecycle: z.enum(["draft", "active", "retired"]),
    technology: z.string().trim().min(1).optional(),
    moduleRefs: z.array(z.string().trim().min(1)).optional(),
    standardsCode: z.string().trim().min(1).optional(),
  })
  .strict();

/** Strict authoring metadata attached to Codecamp graph edges. */
export const CodeEdgeMetadataSchema = z
  .object({
    gate: z.enum(["hard", "soft", "none"]),
    unresolvedQuestion: z.string().trim().min(1).optional(),
  })
  .strict();

const ReviewerSchema = z
  .object({
    name: z.string().trim().min(1),
    status: z.enum(["pending", "approved", "changes-requested"]),
    reviewedAt: z.string().date().nullable().optional(),
  })
  .strict();

const ProvenanceSchema = z
  .object({
    authority: z.literal("Mastery Advantage Code domain"),
    authorityPath: z.literal("code/code-knowledge-space.json"),
    sourceRepository: z.literal("mastery-advantage"),
    sourceRevision: z.string().regex(/^[0-9a-f]{40}$/),
    sourceDigest: z.string().regex(/^[0-9a-f]{64}$/),
    authoredAt: z.string().datetime({ offset: true }),
  })
  .strict();

const MigrationSchema = z
  .object({
    previousVersion: z.string().regex(/^\d+\.\d+\.\d+$/).nullable(),
    stableIds: z.literal(true),
    impact: z.string().trim().min(20),
  })
  .strict();

const StandardsProjectionSchema = z
  .object({
    framework: z.enum(["CSTA-2017", "THAI-ICT-2008"]),
    status: z.literal("projection"),
    source: z.string().url(),
  })
  .strict();

/** Strict, versioned authoring envelope for the normative Codecamp knowledge graph. */
export const CodeKnowledgeGraphSchema = z
  .object({
    schemaVersion: z.literal("code-knowledge-space.v1"),
    graphId: z.literal("codecamp.core"),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    releaseStatus: z.enum(["draft", "reviewed", "retired"]),
    provenance: ProvenanceSchema,
    migration: MigrationSchema,
    review: z
      .object({
        graphOwner: ReviewerSchema,
        curriculumOwner: ReviewerSchema,
        technicalMaintainer: ReviewerSchema,
        standardsReviewer: ReviewerSchema,
      })
      .strict(),
    standardsProjections: z.array(StandardsProjectionSchema).min(1),
    knowledgeSpace: knowledgeSpaceSchema,
  })
  .strict()
  .superRefine((graph, context) => {
    graph.knowledgeSpace.nodes.forEach((node, index) => {
      const metadata = CodeNodeMetadataSchema.safeParse(node.metadata);
      if (!metadata.success) {
        context.addIssue({
          code: "custom",
          path: ["knowledgeSpace", "nodes", index, "metadata"],
          message: metadata.error.issues.map((issue) => issue.message).join("; "),
        });
      }
    });
    graph.knowledgeSpace.edges.forEach((edge, index) => {
      const metadata = CodeEdgeMetadataSchema.safeParse(edge.metadata ?? {});
      if (!metadata.success) {
        context.addIssue({
          code: "custom",
          path: ["knowledgeSpace", "edges", index, "metadata"],
          message: metadata.error.issues.map((issue) => issue.message).join("; "),
        });
      }
    });
  });

/** A validated Codecamp graph release with governance and migration provenance. */
export type CodeKnowledgeGraph = z.infer<typeof CodeKnowledgeGraphSchema>;

/** Parses unknown input at the strict Codecamp graph boundary.
 * @param input Candidate JSON-compatible graph release.
 * @returns The validated graph release.
 * @throws When any envelope, graph, node, edge, or metadata contract is invalid.
 */
export function parseCodeKnowledgeGraph(input: unknown): CodeKnowledgeGraph {
  return CodeKnowledgeGraphSchema.parse(input);
}
