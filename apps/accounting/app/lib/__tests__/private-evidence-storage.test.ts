/**
 * Red tests for the private-evidence write port
 * (`@/app/lib/private-evidence-storage.ts` — does not exist yet).
 *
 * `@reading-advantage/storage` currently ships only an authorized READ
 * adapter for private evidence plus a generic `StorageClient.put`. These
 * tests define the minimal write port the submissions route consumes:
 *
 *   putPrivateEvidence({
 *     storage,        // generic StorageClient-shaped port (faked here)
 *     companyId,      // trusted company scope from the session actor
 *     fileName,       // original upload file name (untrusted input)
 *     contentType,    // declared MIME type of the upload
 *     body,           // file bytes
 *   }): Promise<{ evidenceReference: string }>
 *
 * Contract expectations:
 * - returns a `private-evidence://` reference rooted at the company scope and
 *   matching the reference grammar enforced by the DB (no traversal segments);
 * - stores the object under the reference's key (reference minus the
 *   `private-evidence://` scheme) via `storage.put` exactly once;
 * - never opts in to a public ACL, regardless of input;
 * - sanitizes untrusted file names so `..`/`.` segments and control
 *   characters can never reach the reference.
 */
import { describe, expect, it, vi } from "vitest";

import type { StorageClient } from "@reading-advantage/storage";
import { putPrivateEvidence } from "@/app/lib/private-evidence-storage";

const COMPANY_ID = "33333333-3333-4333-8333-333333333333";
const EVIDENCE_REFERENCE_PATTERN = new RegExp(
  "^private-evidence://[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(/[A-Za-z0-9._~-]+)+$",
);

function createFakeStorage() {
  return {
    put: vi.fn<StorageClient["put"]>(async () => {}),
    getUrl: vi.fn(() => ""),
    getSignedUrl: vi.fn(async () => ""),
    delete: vi.fn(async () => {}),
    exists: vi.fn(async () => false),
  } satisfies StorageClient;
}

function upload(overrides: Record<string, unknown> = {}) {
  return {
    storage: createFakeStorage(),
    companyId: COMPANY_ID,
    fileName: "receipt.pdf",
    contentType: "application/pdf",
    body: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
    ...overrides,
  };
}

describe("putPrivateEvidence", () => {
  it("stores the bytes once through the storage port and returns a company-scoped private evidence reference", async () => {
    const request = upload();

    const result = await putPrivateEvidence(request);

    expect(result.evidenceReference).toMatch(EVIDENCE_REFERENCE_PATTERN);
    expect(
      result.evidenceReference.startsWith(`private-evidence://${COMPANY_ID}/`),
    ).toBe(true);
    expect(request.storage.put).toHaveBeenCalledTimes(1);
    const [key, body] = request.storage.put.mock.calls[0] as [
      string,
      Uint8Array,
      unknown,
    ];
    expect(key).toBe(
      result.evidenceReference.slice("private-evidence://".length),
    );
    expect(Buffer.from(body)).toEqual(Buffer.from(request.body));
  });

  it("never opts the stored object into a public ACL", async () => {
    const request = upload();

    await putPrivateEvidence(request);

    const options = request.storage.put.mock.calls[0]?.[2] as
      | { readonly public?: boolean }
      | undefined;
    expect(options?.public ?? false).toBe(false);
    expect(request.storage.getUrl).not.toHaveBeenCalled();
    expect(request.storage.getSignedUrl).not.toHaveBeenCalled();
  });

  it("sanitizes traversal segments and control characters out of the file name", async () => {
    const request = upload({ fileName: "../../etc/passwd\u0007" });

    const result = await putPrivateEvidence(request);

    const segments = result.evidenceReference
      .slice("private-evidence://".length)
      .split("/");
    expect(segments).not.toContain("..");
    expect(segments).not.toContain(".");
    expect(result.evidenceReference).toMatch(EVIDENCE_REFERENCE_PATTERN);
    // eslint-disable-next-line no-control-regex
    expect(result.evidenceReference).not.toMatch(/[\u0000-\u001f\u007f]/u);
    expect(request.storage.put).toHaveBeenCalledTimes(1);
  });

  it("scopes every reference to the caller's company, never a request-supplied tenant", async () => {
    const request = upload({ companyId: "other-company" });

    const result = await putPrivateEvidence(request);

    expect(
      result.evidenceReference.startsWith("private-evidence://other-company/"),
    ).toBe(true);
    expect(result.evidenceReference).not.toContain(COMPANY_ID);
  });
});
