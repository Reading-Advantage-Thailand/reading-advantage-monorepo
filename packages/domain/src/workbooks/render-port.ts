import { z } from "zod";
import type { WorkbookEdition } from "./edition-contracts.js";

/** Legal artifact formats a workbook edition may be rendered into. */
export const workbookArtifactFormatSchema = z.enum(["pdf", "html"]);

/** Concrete artifact format a workbook edition may be rendered into. */
export type WorkbookArtifactFormat = z.infer<
  typeof workbookArtifactFormatSchema
>;

/** Persisted shape of a durable artifact rendered from an immutable workbook edition. */
export const workbookArtifactSchema = z
  .object({
    artifactId: z.string().min(1),
    editionId: z.string().min(1),
    tenantId: z.string().min(1),
    format: workbookArtifactFormatSchema,
    storageKey: z
      .string()
      .min(1)
      .refine(
        (key) => !key.startsWith("http://") && !key.startsWith("https://"),
        { message: "artifact storage key must be a canonical key, not a URL" },
      ),
    byteSize: z.number().int().nonnegative(),
    checksum: z.string().min(1),
    renderedAt: z.string().datetime(),
  })
  .strict();

/** Concrete persisted shape of a durable workbook artifact. */
export type WorkbookArtifact = z.infer<typeof workbookArtifactSchema>;

/** Stable failure codes raised when a workbook edition cannot be rendered. */
export type WorkbookRenderErrorCode =
  | "VALIDATION_ERROR"
  | "EDITION_NOT_PUBLISHED"
  | "INVALID_ARTIFACT_KEY"
  | "RENDER_FAILED"
  | "STORAGE_UNAVAILABLE"
  | "INTERNAL_ERROR";

/** Construction metadata for a workbook render error. */
export interface WorkbookRenderErrorOptions {
  /** Whether callers may safely retry the rejected render. */
  retryable?: boolean;
  /** Provider or internal error retained for server-side diagnostics. */
  cause?: unknown;
}

const DEFAULT_RETRYABILITY: Readonly<
  Record<WorkbookRenderErrorCode, boolean>
> = {
  VALIDATION_ERROR: false,
  EDITION_NOT_PUBLISHED: false,
  INVALID_ARTIFACT_KEY: false,
  RENDER_FAILED: true,
  STORAGE_UNAVAILABLE: true,
  INTERNAL_ERROR: false,
};

/** Structured error returned when a workbook edition cannot be rendered. */
export class WorkbookRenderError extends Error {
  /** Stable machine-readable failure code. */
  readonly code: WorkbookRenderErrorCode;

  /** Whether callers may safely retry the failed render. */
  readonly retryable: boolean;

  /**
   * Creates a structured workbook render error.
   * @param code Stable machine-readable failure code.
   * @param message Safe provider-neutral explanation.
   * @param options Retryability and internal diagnostic cause.
   */
  constructor(
    code: WorkbookRenderErrorCode,
    message: string,
    options: WorkbookRenderErrorOptions = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "WorkbookRenderError";
    this.code = code;
    this.retryable = options.retryable ?? DEFAULT_RETRYABILITY[code];
  }
}

/**
 * Builds the canonical object-storage key for a rendered workbook artifact.
 * @param tenantId Tenant the workbook belongs to.
 * @param editionId Edition the artifact was rendered from.
 * @param format Artifact format being stored.
 * @throws WorkbookRenderError with code "INVALID_ARTIFACT_KEY" when tenantId or
 * editionId is empty or contains a "/", so keys cannot be forged across tenants.
 * @returns The canonical storage key `workbooks/{tenantId}/editions/{editionId}.{format}`.
 */
export function buildWorkbookArtifactKey(
  tenantId: string,
  editionId: string,
  format: WorkbookArtifactFormat,
): string {
  if (
    tenantId.length === 0 ||
    editionId.length === 0 ||
    tenantId.includes("/") ||
    editionId.includes("/")
  ) {
    throw new WorkbookRenderError(
      "INVALID_ARTIFACT_KEY",
      "Artifact storage key requires non-empty tenant and edition identifiers that contain no slashes.",
    );
  }
  return `workbooks/${tenantId}/editions/${editionId}.${format}`;
}

/**
 * Transport- and storage-implementation-independent boundary for rendering an
 * immutable workbook edition into a durable artifact held in S3-compatible
 * object storage.
 *
 * Implementations MUST only render published (non-revoked) editions; they MUST
 * throw WorkbookRenderError with code "EDITION_NOT_PUBLISHED" for a revoked
 * edition. Rendered artifacts are immutable and MUST never be overwritten for a
 * given edition+format.
 */
export interface WorkbookRenderPort {
  /**
   * Renders a workbook edition into a durable artifact in the chosen format.
   * @param edition Immutable published edition to render.
   * @param format Artifact format to produce.
   * @throws WorkbookRenderError when the edition is revoked or rendering or
   * storage fails.
   * @returns The stored artifact, which is never overwritten for this edition+format.
   */
  renderEdition(
    edition: WorkbookEdition,
    format: WorkbookArtifactFormat,
  ): Promise<WorkbookArtifact>;
}
