import type { JSX } from "react";
import type { AccountingSubmission } from "@reading-advantage/backend/accounting";

/** Props for the pending submissions list. */
export interface PendingSubmissionsListProps {
  /** Submissions visible to the signed-in actor. */
  readonly submissions: readonly AccountingSubmission[];
  /** Role of the signed-in accounting actor. */
  readonly actorRole: "STAFF" | "OWNER" | "ACCOUNTANT";
}

/**
 * Renders pending submissions for the signed-in accounting actor.
 * @param props Visible submissions and the actor role.
 * @returns A placeholder until the review list is implemented.
 */
export function PendingSubmissionsList(
  _props: PendingSubmissionsListProps,
): JSX.Element {
  return <div />;
}
