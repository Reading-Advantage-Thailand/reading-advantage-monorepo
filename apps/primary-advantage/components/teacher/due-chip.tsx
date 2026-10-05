"use client";

import { useTranslations } from "next-intl";
import { StatusChip } from "@reading-advantage/ui";
import { getDueDateStatus, type DueDateStatus } from "@reading-advantage/domain/assignments/due-date";

/** Chip tone for each due state. */
const TONE: Record<DueDateStatus["kind"], "danger" | "warning" | "info" | "neutral"> = {
  overdue: "danger",
  today: "warning",
  soon: "warning",
  upcoming: "info",
  none: "neutral",
};

/**
 * Due-date chip for teacher screens: Late, Due today, Due in n days, or No due date. Days are
 * calendar days in Asia/Bangkok (`getDueDateStatus`), so a whole due day is "Due today".
 * @param props.dueDate The due date (a Date, an ISO string, or empty).
 * @param props.className Extra classes.
 * @returns The chip.
 */
export function DueChip({ dueDate, className }: { dueDate: Date | string | null | undefined; className?: string }) {
  const t = useTranslations("TeacherUi.due");
  const status = getDueDateStatus(dueDate);
  const label =
    status.kind === "soon" || status.kind === "upcoming" ? t(status.kind, { days: status.days }) : t(status.kind);
  return (
    <StatusChip tone={TONE[status.kind]} className={className}>
      {label}
    </StatusChip>
  );
}
