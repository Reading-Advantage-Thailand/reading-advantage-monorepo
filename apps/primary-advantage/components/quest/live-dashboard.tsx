"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { QuestDashboardState, QuestStatus } from "@reading-advantage/game-contracts";
import { DASHBOARD_POLL_SECONDS, STUDENT_HP } from "@reading-advantage/domain/primary-quest/rules";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AvatarPortrait } from "@/components/avatar/portrait-canvas";
import { countdownText } from "./countdown";
import { QuestMeter } from "./quest-meter";
import { questText } from "./quest-copy";

/** The next state the teacher's one button moves to. */
const NEXT: Partial<Record<QuestStatus, "rally" | "play" | "result" | "done">> = { open: "rally", rally: "play", play: "result", result: "done" };
/** How many hits the feed shows. */
const FEED = 8;

/**
 * The projector dashboard (FR-10, FR-11): the boss meter with the pending segment, a portrait
 * per student with an HP bar, the hit feed, the countdown, and the state control. Polls every
 * few seconds; shows no rank and no score per student.
 * @param props.initial The state from the server.
 * @returns The dashboard.
 */
export function LiveDashboard({ initial }: { initial: QuestDashboardState }) {
  const t = useTranslations("Quest");
  const locale = useLocale();
  const [state, setState] = useState(initial);
  const [now, setNow] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const questId = state.quest.id;
  const status = state.quest.status;

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);
  useEffect(() => {
    let active = true;
    const poll = async () => {
      const response = await fetch(`/api/v1/quest/${questId}/state`, { cache: "no-store" }).catch(() => null);
      if (!active || !response?.ok) return;
      const body = (await response.json().catch(() => null)) as QuestDashboardState | null;
      if (active && body) setState(body);
    };
    const polling = setInterval(() => void poll(), DASHBOARD_POLL_SECONDS * 1000);
    return () => {
      active = false;
      clearInterval(polling);
    };
  }, [questId]);

  const next = NEXT[status];
  const move = () => {
    if (!next) return;
    setError(null);
    start(async () => {
      const response = await fetch(`/api/v1/quest/${questId}/status`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: next }) });
      if (!response.ok) return setError(t("live.moveError"));
      const quest = (await response.json()) as QuestDashboardState["quest"];
      setState((s) => ({ ...s, quest }));
    });
  };
  const countdown = countdownText(state.countdownEndsAt, now);
  const present = state.students.filter((s) => s.present).length;

  return (
    <div className="flex flex-col gap-6" data-quest-live={status}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold md:text-5xl">{questText(state.title, locale)}</h1>
          <p className="text-muted-foreground text-xl">{t("boss", { name: questText(state.boss.name, locale) })}</p>
        </div>
        <div className="flex items-center gap-4">
          {countdown ? <span className="font-mono text-4xl font-bold md:text-6xl">{countdown}</span> : null}
          <span className="bg-muted rounded-full px-4 py-2 text-xl font-semibold">{t(`teacher.status.${status}`)}</span>
        </div>
      </header>
      <section aria-label={t("meterLabel")} className="bg-card flex flex-col gap-3 rounded-2xl border p-5 shadow-sm">
        <QuestMeter committed={state.committed} pending={state.pending} target={state.target} label={t("meterLabel")} className="h-10" />
        <p className="flex flex-wrap justify-between gap-2 text-2xl font-semibold">
          <span>{t("meter", { committed: state.committed, target: state.target })}</span>
          <span>{t("live.present", { count: present, total: state.students.length })}</span>
        </p>
      </section>
      {status === "result" || status === "done" ? (
        <section className={cn("rounded-2xl border p-6 text-center", state.bossFallen ? "bg-primary text-primary-foreground" : "bg-card")}>
          <p className="text-4xl font-bold md:text-6xl">{state.bossFallen ? t("battle.fell") : t("battle.held")}</p>
          <p className="mt-2 text-2xl">{t("live.helpers")}</p>
          <ul className="mt-2 flex flex-wrap justify-center gap-2 text-xl">
            {state.helpers.map((h) => (
              <li key={h.userId} className="rounded-full border px-4 py-1">
                {h.name}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section aria-label={t("live.students")}>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {state.students.map((s) => (
              <li key={s.userId} data-stale={s.stale} className={cn("bg-card flex flex-col items-center gap-1 rounded-2xl border p-2", !s.present && "opacity-40", s.stale && "opacity-60")}>
                {s.profile ? (
                  <AvatarPortrait classId={s.profile.classId} pieces={Object.values(s.loadout)} tints={s.profile.tints} alt={s.name} className="w-full rounded-xl" />
                ) : (
                  <div className="bg-muted aspect-square w-full rounded-xl" aria-hidden="true" />
                )}
                <span className="w-full truncate text-center text-base font-semibold">{s.name}</span>
                <div role="progressbar" aria-label={`${s.name} HP`} aria-valuemin={0} aria-valuemax={STUDENT_HP} aria-valuenow={s.hp ?? 0} className="bg-muted h-2 w-full overflow-hidden rounded-full">
                  <div className="h-full bg-emerald-500" style={{ width: `${((s.hp ?? 0) / STUDENT_HP) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section aria-label={t("live.hits")} className="bg-card flex flex-col gap-2 rounded-2xl border p-4">
          <h2 className="text-xl font-semibold">{t("live.hits")}</h2>
          {state.hits.length ? (
            <ul className="flex flex-col gap-1 text-lg">
              {state.hits.slice(-FEED).reverse().map((hit) => (
                <li key={`${hit.userId}-${hit.at}`}>{t("live.hit", { name: hit.name, damage: hit.damage })}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">{t("live.noHits")}</p>
          )}
        </section>
      </div>
      <footer className="flex flex-wrap items-center gap-3">
        {next ? (
          <Button type="button" disabled={pending} onClick={move} className="min-h-14 rounded-xl px-6 text-xl">
            {t(`live.next.${next}`)}
          </Button>
        ) : (
          <p className="text-muted-foreground text-xl">{t("live.closed")}</p>
        )}
        {error ? (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        ) : null}
      </footer>
    </div>
  );
}
