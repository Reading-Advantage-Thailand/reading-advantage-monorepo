"use client";

/**
 * The Done mark of a finished part card on the week page (look task 2.3f, council round 2).
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
 * Renders the Done label with a check icon when the part is finished on this device.
 * @param props See `DoneMarkProps`.
 * @returns The mark, or nothing when the part is not done.
 */
export function DoneMark({ doneKey, label }: DoneMarkProps) {
  const [done, setDone] = useState(false);
  useEffect(() => setDone(isPartDone(doneKey)), [doneKey]);
  if (!done) return null;
  return (
    <span data-done-mark className="inline-flex w-fit items-center gap-1 text-base font-semibold">
      <span data-done-icon aria-hidden="true">✓</span>
      {label}
    </span>
  );
}
