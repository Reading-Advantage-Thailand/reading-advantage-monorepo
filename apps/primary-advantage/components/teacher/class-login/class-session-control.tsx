"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { calendarDayNumber, SCHOOL_TIME_ZONE } from "@reading-advantage/domain/calendar-day";
import { useIntlFormatter } from "@/lib/intl-locale";
import { Button } from "@/components/ui/button";
import { errorKey, postStudentLogin, type ClassLoginErrorKey, type ClassRoster } from "./api";

/** Result of the start route: the one-time code of the new session and its end time. */
type StartResult = { sessionId: string; code: string; expiresAt: string };

/** Lifetime choices of the start control, in display order. The server owns the time values. */
const LIFETIME_CHOICES = ["6h", "until_17", "7d"] as const;

type LifetimeChoice = (typeof LIFETIME_CHOICES)[number];

/**
 * Reads the minutes since midnight in the school time zone from the client clock.
 * @param date The instant to read.
 * @returns Minutes from 0 (midnight) to 1439.
 */
function minutesOfDay(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SCHOOL_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return read("hour") * 60 + read("minute");
}

/** Props of {@link ClassSessionControl}. */
export interface ClassSessionControlProps {
  /** The class to start or end. */
  classroomId: string;
  /** The open class session from the live roster, or null when the class is not open. */
  openSession: ClassRoster["openSession"];
  /** Time in milliseconds of the last successful roster read. */
  fetchedAt: number;
  /** Reads the roster again after a start or an end. */
  onChange: () => Promise<void> | void;
}

/**
 * Start/End class control (FR-1). Start shows the class code once, big enough to project on a
 * board, with its end time. New code replaces the open code. The new code stays on screen until a
 * successful roster read after the start reports another session or none, so a failed read does not
 * hide it. The server stores only a hash of the code, so after a page reload the control asks the
 * teacher to make a new code. Before a start the control offers the session lifetime (FR-4); the
 * server computes the expiry and the control hides "until 17:00" from 17:00 Bangkok on.
 * @param props The class, its open session, the time of the last roster read, and the refresh callback.
 * @returns The control.
 */
export function ClassSessionControl({ classroomId, openSession, fetchedAt, onChange }: ClassSessionControlProps) {
  const t = useTranslations("ClassLogin");
  const format = useIntlFormatter();
  const [lifetime, setLifetime] = useState<LifetimeChoice>("6h");
  const [started, setStarted] = useState<(StartResult & { at: number }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ClassLoginErrorKey | null>(null);

  // The client clock decides which options show; the server stays the authority (OQ-2).
  const before1700 = minutesOfDay(new Date()) < 17 * 60;
  const choices = LIFETIME_CHOICES.filter((choice) => choice !== "until_17" || before1700);
  // A hidden choice falls back to the default, so one radio is always checked and the start
  // never posts a hidden choice (review F121).
  const effectiveLifetime: LifetimeChoice = choices.includes(lifetime) ? lifetime : "6h";

  async function run(action: "start" | "end") {
    setBusy(true);
    setError(null);
    try {
      if (action === "start") {
        const result = await postStudentLogin<StartResult>("class-session/start", { classroomId, lifetime: effectiveLifetime });
        setStarted({ ...result, at: Date.now() });
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

  // Show the code until a successful roster read made after the start reports another session or none.
  const shown = started && (busy || fetchedAt <= started.at || openSession?.id === started.sessionId) ? started : null;
  const expiresAt = shown?.expiresAt ?? openSession?.expiresAt;
  // A later Bangkok date shows the date with the time, so a 7-day session is not ambiguous (D-6).
  const sameBangkokDay = expiresAt
    ? calendarDayNumber(new Date()) === calendarDayNumber(new Date(expiresAt))
    : true;
  const time = expiresAt
    ? format.dateTime(
        new Date(expiresAt),
        sameBangkokDay ? { hour: "numeric", minute: "2-digit" } : { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
      )
    : "";

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
      <p id="class-session-lifetime-label" className="font-medium">
        {t("session.lifetimeLabel")}
      </p>
      <div
        role="radiogroup"
        aria-labelledby="class-session-lifetime-label"
        aria-describedby={effectiveLifetime === "7d" ? "class-session-lifetime-help" : undefined}
        className="space-y-1"
      >
        {choices.map((choice) => (
          <label key={choice} className="flex min-h-11 items-center gap-2">
            <input
              type="radio"
              name="class-session-lifetime"
              value={choice}
              checked={effectiveLifetime === choice}
              disabled={busy}
              onChange={() => {
                setLifetime(choice);
                setError(null);
              }}
            />
            <span>{t(`session.lifetime.${choice}`)}</span>
          </label>
        ))}
      </div>
      {effectiveLifetime === "7d" && (
        <p id="class-session-lifetime-help" className="text-muted-foreground text-sm">
          {t("session.lifetimeHelp7d")}
        </p>
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
