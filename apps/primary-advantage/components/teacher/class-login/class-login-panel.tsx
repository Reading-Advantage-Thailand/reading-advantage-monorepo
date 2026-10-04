"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClassSessionControl } from "./class-session-control";
import { useClassLogin } from "./use-class-login";

/** Props of {@link ClassLoginPanel}. */
export interface ClassLoginPanelProps {
  /** The class shown on the page. */
  classroomId: string;
}

/**
 * Class sign-in panel for the teacher class page. It reads the live roster (polled while the
 * page is visible) and shows the Start/End class control.
 * @param props The class.
 * @returns The panel.
 */
export function ClassLoginPanel({ classroomId }: ClassLoginPanelProps) {
  const t = useTranslations("ClassLogin");
  const { roster, error, refresh } = useClassLogin(classroomId);

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
          <ClassSessionControl classroomId={classroomId} openSession={roster.openSession} onChange={refresh} />
        ) : (
          !error && <p className="text-muted-foreground">{t("loading")}</p>
        )}
      </CardContent>
    </Card>
  );
}
