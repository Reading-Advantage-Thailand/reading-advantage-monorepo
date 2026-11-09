import type { AccountingActor } from "./submissions.js";

/**
 * Minimal close shape the read permission needs: its lifecycle status.
 * The permission reads the status only; it never reads finance data.
 */
export interface AccountingMonthlyCloseReadTarget {
  /** Lifecycle status of the close being read. */
  readonly status: string;
}

/** Roles that submit an accounting submission. */
const SUBMITTER_ROLES: ReadonlySet<string> = new Set([
  "OWNER",
  "ACCOUNTANT",
  "CONTRACTOR",
  "STAFF",
]);

/** Roles that see their own submissions only. */
const OWN_ITEM_ROLES: ReadonlySet<string> = new Set(["CONTRACTOR", "STAFF"]);

/** Roles that see every submission of the company. */
const ALL_ITEM_ROLES: ReadonlySet<string> = new Set(["OWNER", "ACCOUNTANT"]);

/** Roles that see approved submissions and their evidence, read only. */
const APPROVED_ITEM_ROLES: ReadonlySet<string> = new Set([
  "OWNER",
  "ACCOUNTANT",
  "CEO",
]);

/** Roles that read every evidence object of the company. */
const EVIDENCE_READER_ROLES: ReadonlySet<string> = new Set([
  "OWNER",
  "ACCOUNTANT",
]);

/** Roles that open a monthly close. */
const CLOSE_OPENER_ROLES: ReadonlySet<string> = new Set([
  "OWNER",
  "ACCOUNTANT",
]);

/** Roles that sign and lock a monthly close. */
const CLOSE_SIGNER_ROLES: ReadonlySet<string> = new Set(["CEO"]);

/** Returns true when the actor holds one of the listed roles.
 * @param actor Caller derived from the session.
 * @param roles Role set that holds the permission.
 * @returns True when the actor role is in the set.
 */
function holds(actor: AccountingActor, roles: ReadonlySet<string>): boolean {
  return roles.has(actor.role);
}

/**
 * Decides whether the actor may submit an expense or a bill.
 * @param actor Caller derived from the session.
 * @returns True for OWNER, ACCOUNTANT, CONTRACTOR, and STAFF.
 */
export function canSubmitAccountingSubmission(
  actor: AccountingActor,
): boolean {
  return holds(actor, SUBMITTER_ROLES);
}

/**
 * Decides whether the actor sees its own submissions only.
 * @param actor Caller derived from the session.
 * @returns True for CONTRACTOR and STAFF.
 */
export function canViewOwnAccountingSubmission(
  actor: AccountingActor,
): boolean {
  return holds(actor, OWN_ITEM_ROLES);
}

/**
 * Decides whether the actor sees every submission of the company.
 * @param actor Caller derived from the session.
 * @returns True for OWNER and ACCOUNTANT.
 */
export function canViewAllAccountingSubmissions(
  actor: AccountingActor,
): boolean {
  return holds(actor, ALL_ITEM_ROLES);
}

/**
 * Decides whether the actor sees approved submissions with their evidence.
 * @param actor Caller derived from the session.
 * @returns True for OWNER, ACCOUNTANT, and CEO.
 */
export function canViewApprovedAccountingSubmission(
  actor: AccountingActor,
): boolean {
  return holds(actor, APPROVED_ITEM_ROLES);
}

/**
 * Decides whether the actor may approve a pending submission.
 * @param actor Caller derived from the session.
 * @returns True for OWNER and ACCOUNTANT.
 */
export function canApproveAccountingSubmission(
  actor: AccountingActor,
): boolean {
  return holds(actor, ALL_ITEM_ROLES);
}

/**
 * Decides whether the actor may reject a pending submission.
 * @param actor Caller derived from the session.
 * @returns True for OWNER and ACCOUNTANT.
 */
export function canRejectAccountingSubmission(
  actor: AccountingActor,
): boolean {
  return holds(actor, ALL_ITEM_ROLES);
}

/**
 * Decides whether the actor may export the submission list.
 * @param actor Caller derived from the session.
 * @returns True for OWNER and ACCOUNTANT.
 */
export function canExportAccountingSubmissions(
  actor: AccountingActor,
): boolean {
  return holds(actor, ALL_ITEM_ROLES);
}

/**
 * Decides whether the actor reads every evidence object of the company.
 * @param actor Caller derived from the session.
 * @returns True for OWNER and ACCOUNTANT.
 */
export function canReadAccountingEvidence(
  actor: AccountingActor,
): boolean {
  return holds(actor, EVIDENCE_READER_ROLES);
}

/**
 * Decides whether the actor reads the evidence of approved items only.
 * @param actor Caller derived from the session.
 * @returns True for OWNER, ACCOUNTANT, and CEO.
 */
export function canReadApprovedAccountingEvidence(
  actor: AccountingActor,
): boolean {
  return holds(actor, APPROVED_ITEM_ROLES);
}

/**
 * Decides whether the actor opens a monthly close.
 * @param actor Caller derived from the session.
 * @returns True for OWNER and ACCOUNTANT.
 */
export function canOpenMonthlyClose(actor: AccountingActor): boolean {
  return holds(actor, CLOSE_OPENER_ROLES);
}

/**
 * Decides whether the actor signs a monthly close.
 * @param actor Caller derived from the session.
 * @returns True for the CEO only.
 */
export function canSignMonthlyClose(actor: AccountingActor): boolean {
  return holds(actor, CLOSE_SIGNER_ROLES);
}

/**
 * Decides whether the actor locks a monthly close.
 * @param actor Caller derived from the session.
 * @returns True for the CEO only.
 */
export function canLockMonthlyClose(actor: AccountingActor): boolean {
  return holds(actor, CLOSE_SIGNER_ROLES);
}

/**
 * Decides whether the actor reads one monthly close. An OWNER and an
 * ACCOUNTANT read any close; the CEO reads a locked close only.
 * @param actor Caller derived from the session.
 * @param close Close whose status gates the read.
 * @returns True when the actor may read the close.
 */
export function canReadMonthlyClose(
  actor: AccountingActor,
  close: AccountingMonthlyCloseReadTarget,
): boolean {
  if (holds(actor, CLOSE_OPENER_ROLES)) return true;
  return holds(actor, CLOSE_SIGNER_ROLES) && close.status === "locked";
}
