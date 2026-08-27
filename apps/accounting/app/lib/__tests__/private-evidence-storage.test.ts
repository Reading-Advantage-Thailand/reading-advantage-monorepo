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
 * - generates a strict filename-free reference with one UUID upload segment.
 */
import { describe, expect, it, vi } from "vitest";

import type { StorageClient } from "@reading-advantage/storage";
import * as privateEvidenceStorage from "@/app/lib/private-evidence-storage";
import { putPrivateEvidence } from "@/app/lib/private-evidence-storage";

const COMPANY_ID = "33333333-3333-4333-8333-333333333333";
const EVIDENCE_REFERENCE_PATTERN = new RegExp(
  "^private-evidence://[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?/submissions/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/evidence$",
);

function createFakeStorage() {
  return {
    put: vi.fn<StorageClient["put"]>(async () => {}),
    get: vi.fn<StorageClient["get"]>(async () => new Uint8Array()),
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
    contentType: "application/pdf",
    body: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
    ...overrides,
  };
}

type DeletePrivateEvidence = (input: {
  readonly storage: StorageClient;
  readonly companyId: string;
  readonly evidenceReference: string;
}) => Promise<void>;

type ReadPrivateEvidence = (input: {
  readonly storage: StorageClient;
  readonly companyId: string;
  readonly evidenceReference: string;
}) => Promise<Uint8Array>;

const deletePrivateEvidence = (
  privateEvidenceStorage as unknown as Record<string, unknown>
).deletePrivateEvidence as DeletePrivateEvidence | undefined;

const readPrivateEvidence = (
  privateEvidenceStorage as unknown as Record<string, unknown>
).readPrivateEvidence as ReadPrivateEvidence | undefined;

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

  it("does not include the untrusted file name in the generated reference", async () => {
    const request = upload();

    const result = await putPrivateEvidence(request);

    const segments = result.evidenceReference
      .slice("private-evidence://".length)
      .split("/");
    expect(segments).toHaveLength(4);
    expect(segments[1]).toBe("submissions");
    expect(segments[3]).toBe("evidence");
    expect(result.evidenceReference).not.toContain("receipt.pdf");
    expect(result.evidenceReference).toMatch(EVIDENCE_REFERENCE_PATTERN);
    expect(request.storage.put).toHaveBeenCalledTimes(1);
  });

  it("deletes the preallocated object when storage rejects and preserves the put error", async () => {
    const request = upload();
    const putError = new Error("provider response lost");
    request.storage.put.mockRejectedValue(putError);

    await expect(putPrivateEvidence(request)).rejects.toBe(putError);

    const key = request.storage.put.mock.calls[0]?.[0];
    expect(key).toEqual(
      expect.stringMatching(
        /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\/submissions\/[0-9a-f-]{36}\/evidence$/u,
      ),
    );
    expect(request.storage.delete).toHaveBeenCalledWith(key);
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

describe("deletePrivateEvidence", () => {
  it("deletes the uploaded object for the caller's company", async () => {
    expect(deletePrivateEvidence).toBeTypeOf("function");
    if (!deletePrivateEvidence) return;
    const request = upload();
    const result = await putPrivateEvidence(request);

    await deletePrivateEvidence({
      storage: request.storage,
      companyId: COMPANY_ID,
      evidenceReference: result.evidenceReference,
    });

    expect(request.storage.delete).toHaveBeenCalledWith(
      result.evidenceReference.slice("private-evidence://".length),
    );
  });

  it("rejects an evidence reference outside the caller's company", async () => {
    expect(deletePrivateEvidence).toBeTypeOf("function");
    if (!deletePrivateEvidence) return;
    const request = upload();

    await expect(
      deletePrivateEvidence({
        storage: request.storage,
        companyId: COMPANY_ID,
        evidenceReference:
          "private-evidence://other-company/submissions/0001/receipt.pdf",
      }),
    ).rejects.toThrow(/company/i);
    expect(request.storage.delete).not.toHaveBeenCalled();
  });
});

describe("readPrivateEvidence", () => {
  it("reads the object bytes for the caller's company", async () => {
    expect(readPrivateEvidence).toBeTypeOf("function");
    if (!readPrivateEvidence) return;
    const request = upload();
    const expected = new Uint8Array([0x01, 0x02]);
    request.storage.get.mockResolvedValue(expected);

    const result = await readPrivateEvidence({
      storage: request.storage,
      companyId: COMPANY_ID,
      evidenceReference: `private-evidence://${COMPANY_ID}/submissions/00000000-0000-4000-8000-000000000001/evidence`,
    });

    expect(result).toEqual(expected);
    expect(request.storage.get).toHaveBeenCalledWith(
      `${COMPANY_ID}/submissions/00000000-0000-4000-8000-000000000001/evidence`,
    );
  });

  it.each([
    `private-evidence://${COMPANY_ID}/submissions/receipt.pdf`,
    `private-evidence://${COMPANY_ID}/submissions/upload-0001/nested/receipt.pdf`,
  ])(
    "rejects a reference that is not an exact generated path: %s",
    async (evidenceReference) => {
      expect(readPrivateEvidence).toBeTypeOf("function");
      if (!readPrivateEvidence) return;
      const request = upload();

      await expect(
        readPrivateEvidence({
          storage: request.storage,
          companyId: COMPANY_ID,
          evidenceReference,
        }),
      ).rejects.toThrow(/company/i);
      expect(request.storage.get).not.toHaveBeenCalled();
    },
  );
});
