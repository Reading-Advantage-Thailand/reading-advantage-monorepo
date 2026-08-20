import { z } from "zod";

import {
  financeMoneyInputSchema,
  financeOperationScopeSchema,
  privateEvidenceReferenceSchema,
  type FinanceMoneyInput,
  type FinanceOperationScope,
} from "../finance-operations/contracts.js";

function hasNoControlCharacters(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x1f || codePoint === 0x7f) {
      return false;
    }
  }
  return true;
}

const payeeSchema = z
  .string()
  .min(1)
  .max(256)
  .regex(/\S/u)
  .refine(hasNoControlCharacters, "Control characters are not allowed");
const categorySchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/\S/u)
  .refine(hasNoControlCharacters, "Control characters are not allowed");
const descriptionSchema = z
  .string()
  .min(1)
  .max(1024)
  .regex(/\S/u)
  .refine(hasNoControlCharacters, "Control characters are not allowed");

// Positive non-zero THB minor units; a bank/card settlement total is never zero or negative.
const settledThbMinorUnitSchema = z.string().regex(/^[1-9][0-9]*$/u);

/** Kind of staff accounting submission: an out-of-pocket expense or a vendor bill. */
export const accountingSubmissionKindSchema = z.enum(["expense", "bill"]);

/** Validated accounting submission kind. */
export type AccountingSubmissionKind = z.infer<
  typeof accountingSubmissionKindSchema
>;

/**
 * Lifecycle status of an accounting submission. Modelled as a single-member enum
 * (rather than a literal) so the approval workflow can append members in a later
 * phase without changing the schema's shape.
 */
export const accountingSubmissionStatusSchema = z.enum(["pending"]);

/** Validated accounting submission status. */
export type AccountingSubmissionStatus = z.infer<
  typeof accountingSubmissionStatusSchema
>;

const accountingSubmissionInputShape = {
  kind: accountingSubmissionKindSchema,
  payee: payeeSchema,
  category: categorySchema,
  description: descriptionSchema.optional(),
  money: financeMoneyInputSchema,
  evidenceReference: privateEvidenceReferenceSchema,
  settledThbAmount: settledThbMinorUnitSchema.optional(),
} satisfies z.ZodRawShape;

function addSettledThbIssues(
  submission: {
    readonly money: { readonly currency: string };
    readonly settledThbAmount?: string;
  },
  context: z.RefinementCtx,
): void {
  if (submission.money.currency === "THB") {
    if (submission.settledThbAmount !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["settledThbAmount"],
        message: "A THB submission cannot carry a settled THB amount",
      });
    }
    return;
  }
  if (submission.settledThbAmount === undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["settledThbAmount"],
      message:
        "A non-THB submission requires the bank-settled THB total in minor units",
    });
  }
}

/**
 * Runtime contract for an expense or bill submitted by staff. `settledThbAmount`
 * is the bank-settled THB total (minor units) the effective rate derives from:
 * required for non-THB money and forbidden when the money currency is THB.
 */
export const accountingSubmissionInputSchema = z
  .strictObject(accountingSubmissionInputShape)
  .superRefine(addSettledThbIssues);

/** Submission payload accepted at the Accounting boundary before persistence. */
export type AccountingSubmissionInput = Readonly<
  Omit<z.infer<typeof accountingSubmissionInputSchema>, "money"> & {
    readonly money: Readonly<FinanceMoneyInput>;
  }
>;

/**
 * Runtime contract for a stored accounting submission: the validated input plus
 * its identity, company-first scope, status, submitter, and submission instant.
 * Submissions are company-wide, so `scope.schoolId` stays absent.
 */
export const accountingSubmissionSchema = z
  .strictObject({
    id: z.string().uuid(),
    scope: financeOperationScopeSchema,
    status: accountingSubmissionStatusSchema,
    submittedByAccountId: z.string().uuid(),
    submittedAt: z.string().datetime({ offset: true }),
    ...accountingSubmissionInputShape,
  })
  .superRefine(addSettledThbIssues);

/** Immutable, company-scoped accounting submission snapshot. */
export type AccountingSubmission = Readonly<
  Omit<z.infer<typeof accountingSubmissionSchema>, "money" | "scope"> & {
    readonly money: Readonly<FinanceMoneyInput>;
    readonly scope: Readonly<FinanceOperationScope>;
  }
>;
