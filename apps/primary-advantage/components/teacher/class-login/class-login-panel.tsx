"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClassSessionControl } from "./class-session-control";
import { LiveRoster } from "./live-roster";
import { PicturePasswordSetting } from "./picture-password-setting";
import { useClassLogin } from "./use-class-login";

/** Props of {@link ClassLoginPanel}. */
export interface ClassLoginPanelProps {
  /** The class shown on the page. */
  classroomId: string;
}

/**
 * Class sign-in panel for the teacher class page. It reads the live roster and the locked
 * students (polled while the page is visible) and shows the Start/End class control, the
 * picture-password class setting, links to the class sheet and QR card print pages, and the
 * live roster.
 * @param props The class.
 * @returns The panel.
 */
export function ClassLoginPanel({ classroomId }: ClassLoginPanelProps) {
  const t = useTranslations("ClassLogin");
  const { roster, locked, fetchedAt, error, refresh } = useClassLogin(classroomId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {t(`errors.${error}`)}
          </p>
        )}
        {roster ? (
          <>
            <ClassSessionControl classroomId={classroomId} openSession={roster.openSession} onChange={refresh} />
            <PicturePasswordSetting classroomId={classroomId} enabled={roster.picturePasswordEnabled} onChange={refresh} />
            <div className="flex flex-wrap gap-4 text-sm">
              <Link href={`/teacher/class-roster/${classroomId}/class-sheet`} className="underline">
                {t("links.classSheet")}
              </Link>
              <Link href={`/teacher/class-roster/${classroomId}/qr-cards`} className="underline">
                {t("links.qrCards")}
              </Link>
            </div>
            <LiveRoster
              classroomId={classroomId}
              classroomName={roster.classroomName}
              students={roster.students}
              locked={locked}
              fetchedAt={fetchedAt}
              onChange={refresh}
            />
          </>
        ) : (
          !error && <p className="text-muted-foreground">{t("loading")}</p>
        )}
      </CardContent>
    </Card>
  );
}
