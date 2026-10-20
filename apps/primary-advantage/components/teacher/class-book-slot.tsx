"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { BookMarkedIcon, ChevronRightIcon, TriangleAlertIcon } from "lucide-react";
import type { TeacherBookSlot } from "@reading-advantage/domain/primary-books";
import { WORKBOOK_STEPS } from "@reading-advantage/domain/primary-books/step-map";
import { Link } from "@/i18n/navigation";
import { Panel, RpgLink } from "@/components/rpg/chrome";

/**
 * The class book slot: one parchment panel that is self-contained, so a page can place it in any
 * grid cell (the teacher dashboard puts it in `lg:col-span-2`, about 400 px high for three rows).
 * With `slots` it shows one row link for each class book (book, lesson N of M, lesson title, next
 * step with its period) and an "Assign a book" row for a class with no book. When no class has a
 * book it shows the empty text (or the no-class text when the teacher has no class) and a link to the
 * classes. With `failed` it
 * shows the load error. With neither (`slots` undefined) it shows the short placeholder that the
 * class page uses when it has no session user.
 * @param props.slots The slot rows from `getTeacherBookSlots`; undefined for the placeholder.
 * @param props.failed True when the page could not load the slots.
 * @param props.classroomId The class on a class page; sets the `data-class-book-slot` value.
 * @param props.className Extra classes for the panel.
 * @returns The slot panel.
 */
export function ClassBookSlot({ slots, failed, classroomId, className }: { slots?: TeacherBookSlot[]; failed?: boolean; classroomId?: string; className?: string }) {
  const t = useTranslations("TeacherUi.classBook");
  const headingId = useId();
  const placeholder = !failed && slots === undefined;
  return (
    <Panel aria-labelledby={headingId} data-class-book-slot={classroomId ?? "all"} className={className}>
      <h2 id={headingId} className="flex items-center gap-2 text-xl font-bold">
        <BookMarkedIcon className="size-6" aria-hidden="true" />
        {placeholder ? t("title") : t("slotTitle")}
      </h2>
      {failed ? (
        <div role="alert" className="flex items-start gap-3">
          <TriangleAlertIcon className="mt-1 size-6 shrink-0" style={{ color: "var(--cq-red)" }} aria-hidden="true" />
          <p className="text-base">{t("slotError")}</p>
        </div>
      ) : placeholder ? (
        <p className="text-base">{t("hint")}</p>
      ) : slots && slots.some((slot) => slot.classBookId) ? (
        <ul className="flex flex-col gap-2">
          {slots.map((slot) => (
            <SlotRow key={slot.classBookId ?? slot.classroomId} slot={slot} />
          ))}
        </ul>
      ) : (
        <>
          <p className="text-base">{slots?.length ? t("slotEmpty") : t("slotNoClass")}</p>
          <div>
            <RpgLink href="/teacher/my-classes" tone="gold" className="w-full sm:w-auto">
              {t("goToClasses")}
            </RpgLink>
          </div>
        </>
      )}
    </Panel>
  );
}

/**
 * One row of the slot: the whole row is a link, at least 72 px high. A class with a book links to
 * the lesson page of its current lesson; a class with no book links to the assign form.
 * @param props.slot The slot row.
 * @returns The list item.
 */
function SlotRow({ slot }: { slot: TeacherBookSlot }) {
  const t = useTranslations("TeacherUi.classBook");
  const next = slot.nextStep ? WORKBOOK_STEPS.find((step) => step.step === slot.nextStep) : null;
  const href = slot.classBookId
    ? `/teacher/class-roster/${slot.classroomId}/books/${slot.classBookId}/lessons/${slot.currentLesson}`
    : `/teacher/class-roster/${slot.classroomId}#class-book`;
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-[72px] items-center justify-between gap-3 rounded-[10px] border-2 p-3"
        style={{ borderColor: "var(--cq-parchment-edge)", background: "rgba(255,255,255,0.35)", color: "inherit", textDecoration: "none" }}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="cq-muted text-sm font-bold break-words">{slot.classroomName}</span>
          {slot.classBookId ? (
            <>
              <span className="text-base font-bold break-words">
                {slot.bookName} · {t("pointer", { current: slot.currentLesson ?? 1, total: slot.lessonCount ?? 0 })}
              </span>
              {slot.lessonTitle ? <span className="text-sm break-words">{slot.lessonTitle}</span> : null}
              <span className="text-sm">
                <span className="cq-muted">{t("slotNext")}</span>
                {" · "}
                {next ? `${t("nextStepValue", { step: next.step, title: next.title })} · ${t("period", { period: next.period })}` : t("allStepsDone")}
              </span>
            </>
          ) : (
            <span className="text-base font-bold">{t("assignRow")}</span>
          )}
        </div>
        <ChevronRightIcon className="size-6 shrink-0" aria-hidden="true" />
      </Link>
    </li>
  );
}
