"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { errorKey, postStudentLogin, type ClassLoginErrorKey, type ClassRoster } from "./api";

/** Props of {@link ClassSessionControl}. */
export interface ClassSessionControlProps {
  /** The class to start or end. */
  classroomId: string;
  /** The open class session from the live roster, or null when the class is not open. */
  openSession: ClassRoster["openSession"];
  /** Reads the roster again after a start or an end. */
  onChange: () => Promise<void> | void;
}

/**
 * Start/End class control (FR-1). Start shows the class code once, big enough to project on a
 * board, with its end time. New code replaces the open code. The server stores only a hash of the
 * code, so after a page reload the control asks the teacher to make a new code.
 * @param props The class, its open session, and the refresh callback.
 * @returns The control.
 */
export function ClassSessionControl({ classroomId, openSession, onChange }: ClassSessionControlProps) {
  const t = useTranslations("ClassLogin");
  const format = useFormatter();
  const [started, setStarted] = useState<{ sessionId: string; code: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ClassLoginErrorKey | null>(null);

  async function run(action: "start" | "end") {
    setBusy(true);
    setError(null);
    try {
      if (action === "start") {
        setStarted(await postStudentLogin<{ sessionId: string; code: string; expiresAt: string }>("class-session/start", { classroomId }));
      } else {
        await postStudentLogin("class-session/end", { classroomId });
        setStarted(null);
      }
      await onChange();
    } catch (caught) {
      setError(errorKey(caught));
    } finally {
      setBusy(false);
    }
  }

  // Show the code while the roster still reports the session it belongs to.
  const shown = started && (busy || openSession?.id === started.sessionId) ? started : null;
  const expiresAt = shown?.expiresAt ?? openSession?.expiresAt;
  const time = expiresAt ? format.dateTime(new Date(expiresAt), { hour: "numeric", minute: "2-digit" }) : "";

  return (
    <section className="space-y-4">
      {shown ? (
        <div className="rounded-xl border-2 border-primary p-6 text-center">
          <p className="text-muted-foreground text-sm font-medium">{t("session.codeLabel")}</p>
          <p
            role="status"
            aria-label={t("session.codeAria", { code: shown.code.split("").join(" ") })}
            className="font-mono text-6xl font-bold tracking-widest sm:text-8xl"
          >
            {shown.code}
          </p>
          <p className="mt-2 text-lg">{t("session.openUntil", { time })}</p>
        </div>
      ) : (
        <p>{openSession ? t("session.openNoCode", { time }) : t("session.startHelp")}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {shown || openSession ? (
          <>
            <Button size="lg" variant="outline" className="min-h-12" disabled={busy} onClick={() => run("start")}>
              {t("session.newCode")}
            </Button>
            <Button size="lg" variant="destructive" className="min-h-12" disabled={busy} onClick={() => run("end")}>
              {t("session.end")}
            </Button>
          </>
        ) : (
          <Button size="lg" className="min-h-12" disabled={busy} onClick={() => run("start")}>
            {t("session.start")}
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {t(`errors.${error}`)}
        </p>
      )}
    </section>
  );
}
