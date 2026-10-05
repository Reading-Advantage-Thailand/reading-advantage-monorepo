"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { BookMarkedIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TEACHER_CARD } from "./teacher-shell";

/**
 * Slot for the class book on the teacher dashboard and the class page. The teacher-books track
 * (Lane D+E, `primary_teacher_books_lesson_support_20261003`) fills it with the book, today's
 * lesson, and the lesson support; until then it shows the heading and a short note.
 * @param props.classroomId The class on a class page; empty on the dashboard (all classes).
 * @param props.className Extra classes.
 * @returns The class book card.
 */
export function ClassBookSlot({ classroomId, className }: { classroomId?: string; className?: string }) {
  const t = useTranslations("TeacherUi.classBook");
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} data-class-book-slot={classroomId ?? "all"} className={cn(TEACHER_CARD, className)}>
      <h2 id={headingId} className="flex items-center gap-2 text-lg font-semibold">
        <BookMarkedIcon className="text-primary size-5" aria-hidden="true" />
        {t("title")}
      </h2>
      <p className="text-muted-foreground text-sm">{t("hint")}</p>
    </section>
  );
}
