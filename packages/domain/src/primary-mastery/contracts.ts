/**
 * Contracts of the Primary objective tags (track primary_objective_tags_20261006): the objective
 * key in code (FR-1) and the Workbooks export `content/primary/tags.json` (FR-2).
 */
import { z } from "zod";

/** The skills the young-learner key covers. */
export const objectiveSkillSchema = z.enum(["Reading", "Listening"]);

/** One objective of the key: a Workbooks short id and its GSE node. */
export const objectiveKeyEntrySchema = z
  .object({
    /** The Workbooks short id, for example `R17.2`. */
    shortId: z.string().regex(/^[RL]\d+\.\d+$/),
    /** The GSE graph node id. */
    nodeId: z.string().min(1),
    gse: z.number().int().min(10).max(90),
    skill: objectiveSkillSchema,
    /** The GSE descriptor. */
    text: z.string().min(1),
    /** Child-language title and example, written by the Workbooks authors (program decision 10). */
    titleEn: z.string().min(1).optional(),
    titleTh: z.string().min(1).optional(),
    exampleEn: z.string().min(1).optional(),
  })
  .strict();

/** One objective of the key. */
export type ObjectiveKeyEntry = z.infer<typeof objectiveKeyEntrySchema>;

/** The release of one graph file the tags were authored against. */
export const graphFileReleaseSchema = z.object({ file: z.string().min(1), commit: z.string().min(1), schemaVersion: z.string().min(1) });

/** The GSE and vocabulary graph releases. */
export const graphReleaseSchema = z.object({ gse: graphFileReleaseSchema, vocabulary: graphFileReleaseSchema }).strict();

/** The GSE and vocabulary graph releases. */
export type GraphRelease = z.infer<typeof graphReleaseSchema>;

const shortIdSchema = z.string().regex(/^[RL]\d+\.\d+$/);
const nodeIdSchema = z.string().min(1);

/** An objective of an article in the export: a short id and its role. */
export const tagsArticleObjectiveSchema = z.object({ shortId: shortIdSchema, role: z.enum(["target", "supporting"]) }).strict();

/** A vocabulary node of an article in the export. */
export const tagsVocabularySchema = z
  .object({
    /** The node's normalized form. */
    word: z.string().min(1),
    /** The last segment of the node id, for example `noun` or `phrasal-verb`. */
    pos: z.string().min(1),
    nodeId: nodeIdSchema,
    role: z.enum(["glossed", "recycled"]),
  })
  .strict();

/** The objectives of one bank question in the export. */
export const tagsQuestionSchema = z
  .object({
    /** The package question id, for example `p1` or `m5`. */
    id: z.string().min(1),
    type: z.enum(["mcq", "saq", "laq"]),
    objectives: z.array(shortIdSchema),
  })
  .strict();

/** One package of the export. */
export const tagsPackageSchema = z
  .object({
    key: z.string().regex(/^[a-z0-9-]+\/\d+$/),
    book: z.string().min(1),
    lesson: z.string().min(1),
    title: z.string().min(1),
    role: z.enum(["workbook", "bank"]),
    level: z.number().int().min(1),
    /** The legacy Prisma ids once the package is injected; null before. */
    legacy: z.object({ articleId: z.string().min(1), questions: z.record(z.string(), z.string().min(1)) }).strict().nullable(),
    articleObjectives: z.array(tagsArticleObjectiveSchema),
    vocabulary: z.array(tagsVocabularySchema),
    questions: z.array(tagsQuestionSchema),
  })
  .strict();

/** One package of the export. */
export type TagsPackage = z.infer<typeof tagsPackageSchema>;

/** One package of the export, as JSON gives it. */
export type TagsPackageInput = z.input<typeof tagsPackageSchema>;

/** The header key of the export: short id to node. */
export const tagsObjectiveKeySchema = z.record(
  shortIdSchema,
  z.object({ nodeId: nodeIdSchema, gse: z.number().int(), skill: objectiveSkillSchema, text: z.string().min(1) }).passthrough(),
);

/**
 * The export file. The graph records pass extra fields (commit date, digest) through unread.
 * Every short id a package uses must be in the header key.
 */
export const tagsExportSchema = z
  .object({
    version: z.literal(1),
    generatedAt: z.string().min(1),
    source: z.string().min(1),
    graphs: z.object({ gse: graphFileReleaseSchema.passthrough(), vocabulary: graphFileReleaseSchema.passthrough() }),
    objectiveKey: tagsObjectiveKeySchema,
    packages: z.array(tagsPackageSchema),
  })
  .superRefine((file, ctx) => {
    file.packages.forEach((pkg, index) => {
      const unknown = new Set<string>();
      for (const objective of pkg.articleObjectives) if (!(objective.shortId in file.objectiveKey)) unknown.add(objective.shortId);
      for (const question of pkg.questions) for (const shortId of question.objectives) if (!(shortId in file.objectiveKey)) unknown.add(shortId);
      if (unknown.size) ctx.addIssue({ code: "custom", path: ["packages", index], message: `${pkg.key}: short ids missing from the header key: ${[...unknown].join(", ")}` });
    });
  });

/** The export file, as JSON gives it. */
export type TagsExportInput = z.input<typeof tagsExportSchema>;

/** The export file. */
export type TagsExport = z.infer<typeof tagsExportSchema>;

/** A header node that differs from the key in code. */
export interface KeyDrift {
  shortId: string;
  exportNodeId: string;
  codeNodeId: string;
}

/** A parsed export with the graph releases and the header drift against the key in code. */
export interface ParsedTagsExport {
  graphRelease: GraphRelease;
  packages: TagsPackage[];
  /** Short ids whose node in the header differs from the key in code (FR-2). */
  keyDrift: KeyDrift[];
  /** Short ids in the header that the key in code does not have. */
  unknownToCode: string[];
}
