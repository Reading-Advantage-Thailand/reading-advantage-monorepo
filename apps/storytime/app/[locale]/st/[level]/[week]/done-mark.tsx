"use client";

/**
 * The Done mark of a finished part card on the week page (look task 2.3f, council round 2).
 * Round 3 (task 2.3g) turns it into a 32 CSS px gold badge with a navy check in place of the
 * chevron; the localized label stays as text for screen readers.
 *
 * The mark reads the per-device completion record after the first render, so the server HTML and
 * the first client render agree and a part that is not done shows nothing.
 */
import { useEffect, useState } from "react";
import { isPartDone } from "../../../../../lib/done";

/** The props of the done mark. */
interface DoneMarkProps {
  /** The `<level>:<week>:<part>` key of the part. */
  doneKey: string;
  /** The localized Done label. */
  label: string;
}

/**
 * Renders the gold check badge with the localized Done label when the part is finished on this
 * device.
 * @param props See `DoneMarkProps`.
 * @returns The mark, or nothing when the part is not done.
 */
export function DoneMark({ doneKey, label }: DoneMarkProps) {
  const [done, setDone] = useState(false);
  useEffect(() => setDone(isPartDone(doneKey)), [doneKey]);
  if (!done) return null;
  return (
    <span data-done-mark data-done-badge aria-label={label}>
      <svg data-done-icon aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
        <path
          d="M5 12.5l4.5 4.5L19 7.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
