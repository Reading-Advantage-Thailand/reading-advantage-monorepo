"use client";

import { useEffect, useId, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { FileTextIcon, QrCodeIcon } from "lucide-react";
import { ShimmerSkeleton } from "@reading-advantage/ui";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TEACHER_ACTION, TEACHER_CARD } from "../teacher-shell";
import { ClassSessionControl } from "./class-session-control";
import { LiveRoster, type LiveRosterProps } from "./live-roster";
import { PicturePasswordSetting } from "./picture-password-setting";
import { useClassLogin } from "./use-class-login";

/** Props of {@link ClassLoginPanel}. */
export interface ClassLoginPanelProps {
  /** The class shown on the page. */
  classroomId: string;
  /** Management parts of each student row (the class page): see {@link LiveRosterProps}. */
  renderStudentExtras?: LiveRosterProps["renderStudentExtras"];
  /** Text filter of the student rows. */
  rosterFilter?: string;
  /** Text when the filter matches no student. */
  rosterFilterEmpty?: ReactNode;
  /** Controls above the student list, for example search and enroll. */
  rosterToolbar?: ReactNode;
  /** Shown in place of the student list when the live roster cannot load. */
  rosterFallback?: ReactNode;
  /** A change of this number reads the roster again (after an enroll or a removal on the page). */
  rosterVersion?: number;
}

/**
 * Class sign-in panel for the teacher class page. It reads the live roster and the locked
 * students (polled while the page is visible) and shows two cards: the class sign-in card
 * (Start/End class, the picture-password class setting, and links to the class sheet and QR card
 * print pages; the dashboard "Start class" link opens the page at its `#class-login` anchor), and
 * the student list (the live roster with the class page parts). When the roster cannot load, the
 * fallback takes the place of the student list.
 * @param props The class and the class page slots.
 * @returns The panel.
 */
export function ClassLoginPanel({
  classroomId,
  renderStudentExtras,
  rosterFilter,
  rosterFilterEmpty,
  rosterToolbar,
  rosterFallback,
  rosterVersion = 0,
}: ClassLoginPanelProps) {
  const t = useTranslations("ClassLogin");
  const titleId = useId();
  const { roster, locked, fetchedAt, error, refresh } = useClassLogin(classroomId);
  useEffect(() => {
    if (rosterVersion > 0) void refresh();
  }, [rosterVersion, refresh]);
  const linkClass = cn(buttonVariants({ variant: "outline" }), TEACHER_ACTION, "px-4");

  return (
    <div className="flex flex-col gap-4">
      <section id="class-login" aria-labelledby={titleId} className={cn(TEACHER_CARD, "scroll-mt-24 gap-5")}>
        <h2 id={titleId} className="text-lg font-semibold">
          {t("title")}
        </h2>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {t(`errors.${error}`)}
          </p>
        )}
        {roster ? (
          <>
            <ClassSessionControl classroomId={classroomId} openSession={roster.openSession} fetchedAt={fetchedAt} onChange={refresh} />
            <PicturePasswordSetting classroomId={classroomId} enabled={roster.picturePasswordEnabled} onChange={refresh} />
            <div className="flex flex-wrap gap-2">
              <Link href={`/teacher/class-roster/${classroomId}/class-sheet`} className={linkClass}>
                <FileTextIcon aria-hidden="true" />
                {t("links.classSheet")}
              </Link>
              <Link href={`/teacher/class-roster/${classroomId}/qr-cards`} className={linkClass}>
                <QrCodeIcon aria-hidden="true" />
                {t("links.qrCards")}
              </Link>
            </div>
          </>
        ) : (
          !error && (
            <div role="status" aria-busy="true" className="flex flex-col gap-3">
              <span className="sr-only">{t("loading")}</span>
              <ShimmerSkeleton className="h-12 w-40" />
              <ShimmerSkeleton className="h-12 w-full" />
            </div>
          )
        )}
      </section>
      {roster ? (
        <section className={TEACHER_CARD}>
          <LiveRoster
            classroomId={classroomId}
            classroomName={roster.classroomName}
            students={roster.students}
            locked={locked}
            fetchedAt={fetchedAt}
            onChange={refresh}
            renderStudentExtras={renderStudentExtras}
            filter={rosterFilter}
            filterEmpty={rosterFilterEmpty}
            toolbar={rosterToolbar}
          />
        </section>
      ) : error ? (
        rosterFallback
      ) : null}
    </div>
  );
}
