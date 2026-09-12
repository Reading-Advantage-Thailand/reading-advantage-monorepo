import {
  WorkbookRenderError,
  buildWorkbookArtifactKey,
  workbookArtifactSchema,
} from "./render-port.js";
import type { WorkbookArtifact, WorkbookArtifactFormat } from "./render-port.js";

/**
 * Minimal structural interface for the object-storage client injected into the
 * artifact store. Structurally compatible with
 * {@link @reading-advantage/storage} `StorageClient` while keeping the domain
 * provider-neutral.
 */
export interface WorkbookStorageClient {
  /**
   * Writes the artifact body under the given key.
   * @param key Canonical object-storage key for the artifact.
   * @param body Raw artifact bytes to persist.
   * @param options Optional content-type hint for the stored object.
   */
  put(
    key: string,
    body: Uint8Array,
    options?: { contentType?: string },
  ): Promise<void>;

  /**
   * Reports whether an object already exists under the given key.
   * @param key Canonical object-storage key to check.
   * @returns True when the key is already occupied.
   */
  exists(key: string): Promise<boolean>;
}

/** Durable artifact store for rendered workbook editions. */
export interface WorkbookArtifactStore {
  /**
   * Persists a rendered workbook artifact, never overwriting an existing one.
   * @param input Rendered artifact payload and metadata.
   * @throws WorkbookRenderError with code "VALIDATION_ERROR" when the artifact
   * already exists or fails schema validation.
   * @returns The validated, persisted artifact.
   */
  storeArtifact(input: {
    tenantId: string;
    editionId: string;
    format: WorkbookArtifactFormat;
    body: Uint8Array;
    checksum: string;
    renderedAt: string;
    artifactId: string;
  }): Promise<WorkbookArtifact>;
}

/**
 * Creates an artifact store that persists rendered workbook artifacts through
 * an injected storage client.
 * @param client Structural storage client compatible with
 * {@link @reading-advantage/storage} `StorageClient`.
 * @returns An artifact store bound to the given storage client.
 */
export function createWorkbookArtifactStore(
  client: WorkbookStorageClient,
): WorkbookArtifactStore {
  return {
    async storeArtifact({
      tenantId,
      editionId,
      format,
      body,
      checksum,
      renderedAt,
      artifactId,
    }) {
      const key = buildWorkbookArtifactKey(tenantId, editionId, format);

      if (await client.exists(key)) {
        throw new WorkbookRenderError(
          "VALIDATION_ERROR",
          `Artifact already exists and is immutable: ${key}`,
        );
      }

      const contentType =
        format === "pdf" ? "application/pdf" : "text/html";
      await client.put(key, body, { contentType });

      const parsed = workbookArtifactSchema.safeParse({
        artifactId,
        editionId,
        tenantId,
        format,
        storageKey: key,
        byteSize: body.byteLength,
        checksum,
        renderedAt,
      });

      if (!parsed.success) {
        throw new WorkbookRenderError(
          "VALIDATION_ERROR",
          "Artifact failed schema validation after storage.",
        );
      }

      return parsed.data;
    },
  };
}
