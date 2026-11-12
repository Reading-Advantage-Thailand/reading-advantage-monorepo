/**
 * Application adapter of the evidence port of spec section 5.4.
 *
 * The backend domain function never imports an app module. This file wires
 * `putPrivateEvidence`, `readPrivateEvidence`, and the byte loop into the
 * `AccountingEvidenceStore` interface the intake domain receives.
 */
import {
  putPrivateEvidence,
  readPrivateEvidence,
} from "@/app/lib/private-evidence-storage";
import type {
  AccountingEvidenceStore,
  AccountingEvidenceRecord,
} from "@reading-advantage/backend/accounting";

/**
 * Compares two evidence byte arrays without creating a derived artifact.
 * @param left First byte array.
 * @param right Second byte array.
 * @returns True when both arrays hold equal bytes.
 */
export function haveSameBytes(
  left: Uint8Array,
  right: Uint8Array,
): boolean {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

/**
 * Builds the evidence store over the private-evidence port. The store keeps
 * one definition of the byte compare for the submissions route and the intake
 * poll.
 * @returns The evidence store implementation.
 */
export function createAccountingEvidenceStore(): AccountingEvidenceStore {
  return {
    /**
     * Stores one evidence object inside the company scope.
     * @param input Trusted company scope, declared content type, and bytes.
     * @returns The stored reference and its byte length.
     */
    async put(input: {
      readonly companyId: string;
      readonly contentType: string;
      readonly body: Uint8Array;
    }): Promise<AccountingEvidenceRecord> {
      const { evidenceReference } = await putPrivateEvidence({
        companyId: input.companyId,
        contentType: input.contentType,
        body: input.body,
      });
      return { evidenceReference, byteSize: input.body.byteLength };
    },

    /**
     * Reads one stored evidence object inside the company scope.
     * @param input Trusted company scope and evidence reference.
     * @returns The stored evidence bytes.
     */
    async read(input: {
      readonly companyId: string;
      readonly evidenceReference: string;
    }): Promise<Uint8Array> {
      return readPrivateEvidence({
        companyId: input.companyId,
        evidenceReference: input.evidenceReference,
      });
    },

    /**
     * Compares two evidence references byte by byte inside one company scope.
     * @param input Company scope and the two references to compare.
     * @returns True when both objects hold equal bytes.
     */
    async sameEvidenceBytes(input: {
      readonly companyId: string;
      readonly leftEvidenceReference: string;
      readonly rightEvidenceReference: string;
    }): Promise<boolean> {
      const left = await readPrivateEvidence({
        companyId: input.companyId,
        evidenceReference: input.leftEvidenceReference,
      });
      const right = await readPrivateEvidence({
        companyId: input.companyId,
        evidenceReference: input.rightEvidenceReference,
      });
      return haveSameBytes(left, right);
    },
  };
}
