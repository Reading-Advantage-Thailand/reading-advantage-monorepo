"use client";

import { useActionState, useEffect, useId } from "react";
import { useTranslations } from "next-intl";
import type { CatalogueBook } from "@reading-advantage/domain/primary-books";
import { assignClassBookAction } from "@/actions/class-books";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { TEACHER_ACTION } from "./teacher-shell";

/** Native select and date input styled like the shadcn input. */
const FIELD = "border-input bg-background min-h-11 w-full rounded-md border px-3 text-sm";

/**
 * Form that assigns a catalogue book to a class (FR-1): book, mode, and start date.
 * @param props.classroomId The class.
 * @param props.catalogue The books a teacher can choose from.
 * @returns The form, or a note when the catalogue is empty.
 */
export function AssignBookForm({ classroomId, catalogue }: { classroomId: string; catalogue: CatalogueBook[] }) {
  const t = useTranslations("TeacherUi.classBook");
  const router = useRouter();
  const id = useId();
  const [state, formAction, pending] = useActionState(assignClassBookAction, null);
  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state, router]);
  if (!catalogue.length) return <p className="text-muted-foreground text-sm">{t("noCatalogue")}</p>;
  return (
    <form action={formAction} aria-labelledby={`${id}-title`} className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
      <h3 id={`${id}-title`} className="text-sm font-semibold sm:col-span-4">
        {t("assign")}
      </h3>
      <input type="hidden" name="classroomId" value={classroomId} />
      <label className="flex flex-col gap-1 text-sm font-medium">
        {t("book")}
        <select name="bookId" required defaultValue="" className={FIELD}>
          <option value="" disabled>
            {t("chooseBook")}
          </option>
          {catalogue.map((book) => (
            <option key={book.id} value={book.id}>
              {book.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        {t("mode")}
        <select name="mode" defaultValue="teacher_led" className={FIELD}>
          <option value="teacher_led">{t("modeTeacherLed")}</option>
          <option value="independent">{t("modeIndependent")}</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        {t("startDate")}
        <input type="date" name="startDate" className={FIELD} />
      </label>
      <Button type="submit" disabled={pending} className={TEACHER_ACTION}>
        {t("assignButton")}
      </Button>
      {state && !state.success ? (
        <p role="alert" className="text-destructive text-sm sm:col-span-4">
          {t("assignError")}
        </p>
      ) : null}
      {state?.success ? (
        <p role="status" className="text-sm sm:col-span-4">
          {t("assigned")}
        </p>
      ) : null}
    </form>
  );
}
