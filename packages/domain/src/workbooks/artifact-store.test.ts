import { describe, expect, it } from "vitest";

import {
  createWorkbookArtifactStore,
  type WorkbookStorageClient,
} from "./artifact-store.js";
import { buildWorkbookArtifactKey, WorkbookRenderError } from "./render-port.js";

interface PutRecord {
  key: string;
  body: Uint8Array;
  options?: { contentType?: string };
}

function createStorageClient() {
  const puts: PutRecord[] = [];
  const existsCalls: string[] = [];
  const existingKeys = new Set<string>();
  const client: WorkbookStorageClient = {
    put: async (key, body, options) => {
      puts.push({ key, body, options });
      existingKeys.add(key);
    },
    exists: async (key) => {
      existsCalls.push(key);
      return existingKeys.has(key);
    },
  };
  return {
    client,
    puts,
    existsCalls,
    markExisting: (key: string) => {
      existingKeys.add(key);
    },
  };
}

const PDF_ARTIFACT = {
  tenantId: "tenant-1",
  editionId: "edition-1",
  format: "pdf",
  body: new TextEncoder().encode("PDF-BYTES"),
  checksum: "sha256:9e0acd98a44f5b2e5f0d4f2e2a9e0acd98a44f5b2e5f0d4f2e2a9e0acd98a4",
  renderedAt: "2026-08-03T00:00:00.000Z",
  artifactId: "artifact-1",
} as const;

describe("createWorkbookArtifactStore", () => {
  it("stores a pdf artifact under the canonical key with application/pdf content type", async () => {
    const { client, puts } = createStorageClient();
    const store = createWorkbookArtifactStore(client);

    await store.storeArtifact({ ...PDF_ARTIFACT });

    expect(puts).toHaveLength(1);
    expect(puts[0].key).toBe("workbooks/tenant-1/editions/edition-1.pdf");
    expect(puts[0].options?.contentType).toBe("application/pdf");
    expect(puts[0].body).toEqual(new TextEncoder().encode("PDF-BYTES"));
  });

  it("stores an html artifact under the canonical key with text/html content type", async () => {
    const { client, puts } = createStorageClient();
    const store = createWorkbookArtifactStore(client);

    await store.storeArtifact({ ...PDF_ARTIFACT, format: "html" });

    expect(puts[0].key).toBe("workbooks/tenant-1/editions/edition-1.html");
    expect(puts[0].options?.contentType).toBe("text/html");
  });

  it("checks immutability via exists with the canonical key before writing", async () => {
    const { client, existsCalls, puts } = createStorageClient();
    const store = createWorkbookArtifactStore(client);

    await store.storeArtifact({ ...PDF_ARTIFACT });

    expect(existsCalls).toEqual(["workbooks/tenant-1/editions/edition-1.pdf"]);
    expect(puts).toHaveLength(1);
  });

  it("refuses to overwrite an existing artifact and never calls put", async () => {
    const { client, puts, markExisting } = createStorageClient();
    const store = createWorkbookArtifactStore(client);
    markExisting("workbooks/tenant-1/editions/edition-1.pdf");

    const error = (await store
      .storeArtifact({ ...PDF_ARTIFACT })
      .catch((e: unknown) => e)) as WorkbookRenderError;

    expect(error).toBeInstanceOf(WorkbookRenderError);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.message).toContain("already exists and is immutable");
    expect(error.retryable).toBe(false);
    expect(puts).toHaveLength(0);
  });

  it("returns the validated artifact with storageKey and byteSize provenance", async () => {
    const { client } = createStorageClient();
    const store = createWorkbookArtifactStore(client);

    const artifact = await store.storeArtifact({
      ...PDF_ARTIFACT,
      body: new TextEncoder().encode("12345"),
    });

    expect(artifact.storageKey).toBe("workbooks/tenant-1/editions/edition-1.pdf");
    expect(artifact.byteSize).toBe(5);
    expect(artifact.checksum).toBe(PDF_ARTIFACT.checksum);
    expect(artifact.artifactId).toBe("artifact-1");
    expect(artifact.tenantId).toBe("tenant-1");
    expect(artifact.editionId).toBe("edition-1");
    expect(artifact.format).toBe("pdf");
    expect(artifact.renderedAt).toBe("2026-08-03T00:00:00.000Z");
  });

  it("propagates a storage put rejection unchanged (no STORAGE_UNAVAILABLE mapping)", async () => {
    const cause = new Error("bucket unavailable");
    const client: WorkbookStorageClient = {
      put: async () => {
        throw cause;
      },
      exists: async () => false,
    };
    const store = createWorkbookArtifactStore(client);

    const error = await store.storeArtifact({ ...PDF_ARTIFACT }).catch((e: unknown) => e);

    expect(error).toBe(cause);
  });

  it("rejects with VALIDATION_ERROR when the stored metadata fails schema validation", async () => {
    const { client, puts } = createStorageClient();
    const store = createWorkbookArtifactStore(client);

    const error = (await store
      .storeArtifact({ ...PDF_ARTIFACT, checksum: "" })
      .catch((e: unknown) => e)) as WorkbookRenderError;

    expect(error).toBeInstanceOf(WorkbookRenderError);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.message).toBe("Artifact failed schema validation after storage.");
    expect(puts).toHaveLength(1);
  });

  it("rejects an identifier containing a slash with INVALID_ARTIFACT_KEY before any storage call", async () => {
    const { client, existsCalls, puts } = createStorageClient();
    const store = createWorkbookArtifactStore(client);

    const error = (await store
      .storeArtifact({ ...PDF_ARTIFACT, tenantId: "tenant/../other" })
      .catch((e: unknown) => e)) as WorkbookRenderError;

    expect(error).toBeInstanceOf(WorkbookRenderError);
    expect(error.code).toBe("INVALID_ARTIFACT_KEY");
    expect(existsCalls).toHaveLength(0);
    expect(puts).toHaveLength(0);
  });

  it("uses the same canonical key the artifact store exposes for key building", () => {
    expect(buildWorkbookArtifactKey("tenant-1", "edition-1", "pdf")).toBe(
      "workbooks/tenant-1/editions/edition-1.pdf",
    );
  });
});
