import { createHash } from "node:crypto";
import { z } from "zod";
import { workbooks } from "@reading-advantage/domain";

/** Digest algorithm prefix used for every legacy import file hash. */
export const LEGACY_IMPORT_DIGEST_ALGORITHM = "sha256" as const;

/** A structured problem or observation recorded against one legacy file. */
export const legacyImportExceptionSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
    issues: z
      .array(
        z
          .object({
            path: z.string().min(1),
            reason: z.string().min(1),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

/** Shape-compatibility issue detail carried on a legacy import exception. */
export type LegacyImportException = z.infer<typeof legacyImportExceptionSchema>;

/** One structured provenance entry recorded against a mapped legacy asset URL. */
export const legacyImportProvenanceSchema = z
  .object({
    /** Legacy field path the asset URL was mapped from. */
    sourcePath: z.string().min(1),
    /** Original remote URL retained as provenance, never as release authority. */
    legacyUrl: z.string().url(),
  })
  .strict();

/** One structured provenance entry recorded against a mapped legacy asset URL. */
export type LegacyImportProvenance = z.infer<typeof legacyImportProvenanceSchema>;

/** One legacy lesson file recorded by a dry-run import manifest. */
export const legacyImportManifestEntrySchema = z
  .object({
    sourcePath: z.string().min(1),
    sourceId: z.string().min(1),
    fileHash: z.string().min(1),
    objectKey: z.string().min(1),
    parseStatus: z.enum(["ok", "error"]),
    contentHash: z.string().min(1).nullable(),
    /** Whether an existing draft carries the same identity with different content. */
    driftDetected: z.boolean(),
    /** Draft ids superseded by this import because their content hash differs. */
    supersededDraftIds: z.array(z.string().min(1)),
    exceptions: z.array(legacyImportExceptionSchema),
    provenance: z.array(legacyImportProvenanceSchema),
  })
  .strict();

/** One legacy lesson file recorded by a dry-run import manifest. */
export type LegacyImportManifestEntry = z.infer<
  typeof legacyImportManifestEntrySchema
>;

/** Dry-run import manifest covering one legacy workbook project. */
export const legacyImportManifestSchema = z
  .object({
    manifestVersion: z.literal(3),
    generatedAt: z.string().datetime(),
    project: z
      .object({
        projectId: z.string().min(1),
        sourceRoot: z.string().min(1),
        type: z.string().optional(),
        seriesName: z.string().optional(),
        levelNumber: z.string().optional(),
        cefrLevel: z.string().optional(),
      })
      .strict(),
    counts: z
      .object({
        lessons: z.number().int().nonnegative(),
        parseOk: z.number().int().nonnegative(),
        parseError: z.number().int().nonnegative(),
        exceptions: z.number().int().nonnegative(),
        provenance: z.number().int().nonnegative(),
      })
      .strict(),
    entries: z.array(legacyImportManifestEntrySchema),
  })
  .strict();

/** Dry-run import manifest covering one legacy workbook project. */
export type LegacyImportManifest = z.infer<typeof legacyImportManifestSchema>;

/** Project-level metadata captured alongside a dry-run import. */
export interface LegacyImportManifestProjectInput {
  projectId: string;
  sourceRoot: string;
  type?: string;
  seriesName?: string;
  levelNumber?: string;
  cefrLevel?: string;
}

/** Raw lesson file handed to the manifest builder by the caller. */
export interface LegacyImportManifestFileInput {
  /** Path of the lesson file relative to the project root. */
  sourcePath: string;
  /** Raw UTF-8 text of the legacy workbook JSON file. */
  raw: string;
}

/**
 * Computes the deterministic SHA-256 file hash of a legacy lesson payload.
 * The hash covers the raw UTF-8 bytes so a content-identical file always
 * produces the same digest across runs.
 * @param raw Raw UTF-8 text of the legacy workbook JSON file.
 * @returns Lowercase hexadecimal SHA-256 digest prefixed with "sha256:".
 */
export function computeLegacyImportFileHash(raw: string): string {
  const hex = createHash(LEGACY_IMPORT_DIGEST_ALGORITHM)
    .update(raw, "utf8")
    .digest("hex");
  return `${LEGACY_IMPORT_DIGEST_ALGORITHM}:${hex}`;
}

/**
 * Resolves the stable owning-app source identifier of a legacy lesson.
 * Prefers the article identifier embedded in the lesson's article URL; falls
 * back to the file base name when no URL identifier can be extracted.
 * @param lesson Parsed legacy lesson payload.
 * @param fileName Base name of the lesson file.
 * @returns Stable source identifier used for provenance.
 */
export function resolveLegacyLessonSourceId(
  lesson: unknown,
  fileName: string,
): string {
  if (lesson !== null && typeof lesson === "object") {
    const url = (lesson as { article_url?: unknown }).article_url;
    if (typeof url === "string") {
      const match = /\/read\/([A-Za-z0-9_-]+)\/?$/.exec(url);
      if (match !== null) return match[1];
    }
  }
  return fileName.replace(/_workbook\.json$/i, "");
}

/**
 * Builds the immutable namespaced object key for a legacy lesson file.
 * The key embeds the file's content hash so the same bytes always resolve to
 * the same key and any content change produces a brand-new key.
 * @param projectId Identifier of the legacy project being imported.
 * @param fileName Base name of the lesson file.
 * @param fileHash Prefixed SHA-256 file hash of the lesson payload.
 * @returns Canonical immutable object-storage key for the lesson.
 */
export function computeLegacyImportObjectKey(
  projectId: string,
  fileName: string,
  fileHash: string,
): string {
  const digest = fileHash.replace(/^sha256:/, "");
  return `workbooks/imports/${projectId}/${fileName}/${digest}/${fileName}`;
}

/**
 * Resolves the owning-app source identity recorded for a legacy project.
 * @param projectType Project type label from the legacy project metadata.
 * @returns The portable owning-app identifier for the project.
 */
export function resolveImportSourceApp(
  projectType?: string,
): "reading-advantage" | "primary-advantage" {
  if (projectType === "primary") return "primary-advantage";
  return "reading-advantage";
}

/**
 * Parses one legacy lesson file into a dry-run manifest entry.
 * The lesson is normalized through the domain importer to determine parse
 * status and the normalized content digest; failures become structured
 * exceptions instead of aborting the dry-run. Remote asset URLs that the
 * importer retains as legacyUrl provenance are recorded as structured
 * provenance entries on the manifest entry. When existing drafts are
 * supplied, the entry also records whether the import drifts from any draft
 * already carrying the same source identity with different content.
 * @param input Raw lesson file to process.
 * @param projectId Identifier of the legacy project being imported.
 * @param sourceApp Owning app the legacy lesson was authored in.
 * @param existingDrafts Drafts already persisted for the tenant, used for drift detection.
 * @returns The manifest entry describing the file's provenance, drift, and parse result.
 */
function buildManifestEntry(
  input: LegacyImportManifestFileInput,
  projectId: string,
  sourceApp: "reading-advantage" | "primary-advantage",
  existingDrafts: readonly workbooks.WorkbookDraft[],
): LegacyImportManifestEntry {
  const fileName = input.sourcePath.split("/").pop() ?? input.sourcePath;
  const fileHash = computeLegacyImportFileHash(input.raw);
  const exceptions: LegacyImportException[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(input.raw);
  } catch (error) {
    return {
      sourcePath: input.sourcePath,
      sourceId: fileName,
      fileHash,
      objectKey: computeLegacyImportObjectKey(projectId, fileName, fileHash),
      parseStatus: "error",
      contentHash: null,
      driftDetected: false,
      supersededDraftIds: [],
      exceptions: [
        {
          code: "INVALID_JSON",
          message:
            error instanceof Error
              ? error.message
              : "file is not valid JSON",
        },
      ],
      provenance: [],
    };
  }

  const sourceId = resolveLegacyLessonSourceId(parsed, fileName);

  let contentHash: string | null = null;
  try {
    const record = workbooks.importLegacyWorkbook({
      lesson: parsed,
      sourceApp,
      sourceId,
      sourceRevision: fileHash,
    });
    contentHash = record.identity.contentHash;
    const drift = workbooks.detectWorkbookSourceDrift(
      existingDrafts,
      record.identity,
    );
    const provenance: LegacyImportProvenance[] = (
      record.content.articleImages ?? []
    )
      .filter((image) => image.legacyUrl !== undefined)
      .map((image) => ({
        sourcePath: "article_image_url",
        legacyUrl: image.legacyUrl as string,
      }));
    return {
      sourcePath: input.sourcePath,
      sourceId,
      fileHash,
      objectKey: computeLegacyImportObjectKey(projectId, fileName, fileHash),
      parseStatus: "ok",
      contentHash,
      driftDetected: drift.driftDetected,
      supersededDraftIds: [...drift.supersededDraftIds],
      exceptions,
      provenance,
    };
  } catch (error) {
    if (error instanceof workbooks.WorkbookCatalogError) {
      exceptions.push({
        code: error.code,
        message: error.message,
        issues:
          error.issues.length > 0 ? [...error.issues] : undefined,
      });
    } else {
      exceptions.push({
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error ? error.message : "unknown import failure",
      });
    }
    return {
      sourcePath: input.sourcePath,
      sourceId,
      fileHash,
      objectKey: computeLegacyImportObjectKey(projectId, fileName, fileHash),
      parseStatus: "error",
      contentHash: null,
      driftDetected: false,
      supersededDraftIds: [],
      exceptions,
      provenance: [],
    };
  }
}

/**
 * Builds a dry-run import manifest for a legacy workbook project.
 * Pure and filesystem-free: every lesson file is supplied as raw text and the
 * returned manifest is validated against its Zod schema before being returned.
 * Existing drafts (when supplied) drive the per-entry source-drift fields.
 * @param input Project metadata, raw lesson files, optional existing drafts, and the manifest timestamp.
 * @returns A schema-validated dry-run import manifest.
 */
export function buildLegacyImportManifest(input: {
  project: LegacyImportManifestProjectInput;
  files: readonly LegacyImportManifestFileInput[];
  existingDrafts?: readonly workbooks.WorkbookDraft[];
  generatedAt: string;
}): LegacyImportManifest {
  const sourceApp = resolveImportSourceApp(input.project.type);
  const existingDrafts = input.existingDrafts ?? [];
  const entries = input.files.map((file) =>
    buildManifestEntry(file, input.project.projectId, sourceApp, existingDrafts),
  );
  const parseOk = entries.filter((entry) => entry.parseStatus === "ok").length;
  const exceptionCount = entries.reduce(
    (total, entry) => total + entry.exceptions.length,
    0,
  );
  const provenanceCount = entries.reduce(
    (total, entry) => total + entry.provenance.length,
    0,
  );
  return legacyImportManifestSchema.parse({
    manifestVersion: 3,
    generatedAt: input.generatedAt,
    project: input.project,
    counts: {
      lessons: entries.length,
      parseOk,
      parseError: entries.length - parseOk,
      exceptions: exceptionCount,
      provenance: provenanceCount,
    },
    entries,
  });
}
