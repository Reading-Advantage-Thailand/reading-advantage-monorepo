"use client";

import { useActionState, useEffect, useId } from "react";
import { useTranslations } from "next-intl";
import type { CatalogueBook } from "@reading-advantage/domain/primary-books";
import { assignClassBookAction } from "@/actions/class-books";
import { useRouter } from "@/i18n/navigation";
import { RpgButton } from "@/components/rpg/chrome";

/** Native select and date input on the parchment panel (Phase D design). */
const FIELD = "min-h-12 w-full rounded-[10px] border-[3px] px-3 text-base";
const FIELD_STYLE = { background: "var(--cq-parchment-2)", borderColor: "var(--cq-parchment-edge)", color: "var(--cq-ink)", fontFamily: "var(--cq-font)" } as const;

/**
 * Form that assigns a catalogue book to a class (FR-1): book, mode, and start date.
 * @param props.classroomId The class.
 * @param props.catalogue The books a teacher can choose from.
 * @returns The form, or the empty-catalogue note (what to do next) with no form.
 */
export function AssignBookForm({ classroomId, catalogue }: { classroomId: string; catalogue: CatalogueBook[] }) {
  const t = useTranslations("TeacherUi.classBook");
  const router = useRouter();
  const id = useId();
  const [state, formAction, pending] = useActionState(assignClassBookAction, null);
  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state, router]);
  if (!catalogue.length)
    return (
      <div role="status" className="flex flex-col gap-2 rounded-[10px] border-2 border-dashed p-3" style={{ borderColor: "var(--cq-parchment-edge)" }}>
        <p className="text-base font-bold">{t("emptyCatalogueTitle")}</p>
        <p className="text-base">{t("emptyCatalogueBody")}</p>
      </div>
    );
  return (
    <form action={formAction} aria-labelledby={`${id}-title`} className="grid gap-3 sm:grid-cols-2">
      <h3 id={`${id}-title`} className="text-base font-bold sm:col-span-2">
        {t("assign")}
      </h3>
      <input type="hidden" name="classroomId" value={classroomId} />
      <label className="flex flex-col gap-1 text-sm font-bold sm:col-span-2">
        {t("book")}
        <select name="bookId" required defaultValue="" className={FIELD} style={FIELD_STYLE}>
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
      <label className="flex flex-col gap-1 text-sm font-bold">
        {t("mode")}
        <select name="mode" defaultValue="teacher_led" className={FIELD} style={FIELD_STYLE}>
          <option value="teacher_led">{t("modeTeacherLed")}</option>
          <option value="independent">{t("modeIndependent")}</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-bold">
        {t("startDate")}
        <input type="date" name="startDate" className={FIELD} style={FIELD_STYLE} />
      </label>
      <div className="sm:col-span-2">
        <RpgButton type="submit" tone="gold" disabled={pending} className="w-full sm:w-auto">
          {t("assignButton")}
        </RpgButton>
      </div>
      {state && !state.success ? (
        <p role="alert" className="text-base font-bold sm:col-span-2" style={{ color: "var(--cq-red)" }}>
          {t("assignError")}
        </p>
      ) : null}
      {state?.success ? (
        <p role="status" className="text-base sm:col-span-2">
          {t("assigned")}
        </p>
      ) : null}
    </form>
  );
}
