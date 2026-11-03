// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import type { StorageClient } from "@reading-advantage/storage";
import {
  deletePrivateEvidence,
  putPrivateEvidence,
  readPrivateEvidence,
} from "@/app/lib/private-evidence-storage";

const COMPANY_ID = "33333333-3333-4333-8333-333333333333";
const OTHER_COMPANY_ID = "44444444-4444-4444-8444-444444444444";
const UPLOAD_ID = "00000000-0000-4000-8000-000000000001";
const SCOPE_ERROR = "Evidence reference is outside the caller's company scope";

/**
 * Creates an in-memory storage port double.
 * @returns A storage client whose methods are spies.
 */
function fakeStorage() {
  return {
    put: vi.fn<StorageClient["put"]>(async () => {}),
    get: vi.fn<StorageClient["get"]>(async () => new Uint8Array([7])),
    getUrl: vi.fn(() => ""),
    getSignedUrl: vi.fn(async () => ""),
    delete: vi.fn(async () => {}),
    exists: vi.fn(async () => false),
  } satisfies StorageClient;
}

describe("private evidence company scope", () => {
  it.each([
    ["a non-private scheme", `s3://${COMPANY_ID}/submissions/${UPLOAD_ID}/evidence`],
    ["an empty reference", ""],
    [
      "another company's generated reference",
      `private-evidence://${OTHER_COMPANY_ID}/submissions/${UPLOAD_ID}/evidence`,
    ],
    [
      "another company's legacy reference",
      `private-evidence://${OTHER_COMPANY_ID}/submissions/receipt.pdf`,
    ],
    [
      "a legacy reference outside submissions",
      `private-evidence://${COMPANY_ID}/payroll/receipt.pdf`,
    ],
    [
      "a four-segment legacy reference with a non-UUID upload id",
      `private-evidence://${COMPANY_ID}/submissions/upload-1/receipt.pdf`,
    ],
  ])("refuses to read %s", async (_label, evidenceReference) => {
    const storage = fakeStorage();

    await expect(
      readPrivateEvidence({ storage, companyId: COMPANY_ID, evidenceReference }),
    ).rejects.toThrow(SCOPE_ERROR);
    expect(storage.get).not.toHaveBeenCalled();
  });

  it("refuses to delete another company's generated reference", async () => {
    const storage = fakeStorage();

    await expect(
      deletePrivateEvidence({
        storage,
        companyId: COMPANY_ID,
        evidenceReference: `private-evidence://${OTHER_COMPANY_ID}/submissions/${UPLOAD_ID}/evidence`,
      }),
    ).rejects.toThrow(SCOPE_ERROR);
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it("refuses to delete a four-segment legacy reference", async () => {
    const storage = fakeStorage();

    await expect(
      deletePrivateEvidence({
        storage,
        companyId: COMPANY_ID,
        evidenceReference: `private-evidence://${COMPANY_ID}/submissions/${UPLOAD_ID}/receipt.pdf`,
      }),
    ).rejects.toThrow(SCOPE_ERROR);
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it("round-trips an uploaded reference through read and delete", async () => {
    const storage = fakeStorage();
    const { evidenceReference } = await putPrivateEvidence({
      storage,
      companyId: COMPANY_ID,
      contentType: "image/jpeg",
      body: new Uint8Array([1, 2]),
    });
    const key = storage.put.mock.calls[0][0];

    await expect(
      readPrivateEvidence({ storage, companyId: COMPANY_ID, evidenceReference }),
    ).resolves.toEqual(new Uint8Array([7]));
    await deletePrivateEvidence({
      storage,
      companyId: COMPANY_ID,
      evidenceReference,
    });

    expect(evidenceReference).toBe(`private-evidence://${key}`);
    expect(storage.get).toHaveBeenCalledWith(key);
    expect(storage.delete).toHaveBeenCalledWith(key);
  });

  it("rejects an upload for a company id that breaks the reference grammar", async () => {
    const storage = fakeStorage();

    await expect(
      putPrivateEvidence({
        storage,
        companyId: "../other",
        contentType: "application/pdf",
        body: new Uint8Array([1]),
      }),
    ).rejects.toThrow();
    expect(storage.put).not.toHaveBeenCalled();
  });
});
