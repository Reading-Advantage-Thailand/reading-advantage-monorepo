"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import type {
  QuestDashboardState,
  QuestStatus,
} from "@reading-advantage/game-contracts";
import {
  DASHBOARD_POLL_SECONDS,
  STUDENT_HP,
} from "@reading-advantage/domain/primary-quest/rules";
import { Meter, Panel, RpgButton, Sign } from "@/components/rpg/chrome";
import { useRenderer } from "@/lib/rpg/use-renderer";
import { cn } from "@/lib/utils";
import { AvatarPortrait } from "@/components/avatar/portrait-canvas";
import { BossSprite, useBossHit } from "./boss-sprite";
import { countdownText } from "./countdown";
import { questText } from "./quest-copy";

/** The next state the teacher's one button moves to. */
const NEXT: Partial<Record<QuestStatus, "rally" | "play" | "result" | "done">> =
  { open: "rally", rally: "play", play: "result", result: "done" };
/** How many hits the feed shows. */
const FEED = 8;
/** The coins that rain when the boss falls. */
const RAIN = Array.from({ length: 24 }, (_, i) => ({
  left: `${3 + ((i * 41) % 94)}%`,
  delay: `${(i % 8) * 0.12}s`,
}));

/**
 * The projector dashboard on the battle field (FR-10, FR-11, docs/primary-rpg-skin.md §4): the
 * boss east, every student's hero west with an HP bar, the big meter on top, the hit feed, the
 * countdown, and the state control. A new hit makes the hero lunge and the boss play its hit
 * clip with a floating number; the fall plays the death clip and the coins rain. Polls every few
 * seconds; shows no rank and no score per student. The field is the 2D sprite field; the 3D
 * field follows the games port and reads the same renderer switch.
 * @param props.initial The state from the server.
 * @returns The dashboard.
 */
export function LiveDashboard({ initial }: { initial: QuestDashboardState }) {
  const t = useTranslations("Quest");
  const locale = useLocale();
  const renderer = useRenderer();
  const [state, setState] = useState(initial);
  // The clock starts after mount so the server and the client render the same text.
  const [now, setNow] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const questId = state.quest.id;
  const status = state.quest.status;
  const hit = useBossHit(state.committed + state.pending);
  const lastHit = state.hits[state.hits.length - 1];

  useEffect(() => {
    setNow(new Date());
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);
  useEffect(() => {
    let active = true;
    const poll = async () => {
      const response = await fetch(`/api/v1/quest/${questId}/state`, {
        cache: "no-store",
      }).catch(() => null);
      if (!active || !response?.ok) return;
      const body = (await response
        .json()
        .catch(() => null)) as QuestDashboardState | null;
      if (active && body) setState(body);
    };
    const polling = setInterval(
      () => void poll(),
      DASHBOARD_POLL_SECONDS * 1000,
    );
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
      const response = await fetch(`/api/v1/quest/${questId}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) return setError(t("live.moveError"));
      const quest = (await response.json()) as QuestDashboardState["quest"];
      setState((s) => ({ ...s, quest }));
    });
  };
  const countdown = now ? countdownText(state.countdownEndsAt, now) : null;
  const present = state.students.filter((s) => s.present).length;
  const bossName = questText(state.boss.name, locale);
  const over = status === "result" || status === "done";

  return (
    <div
      className="flex flex-col gap-5"
      data-quest-live={status}
      data-renderer={renderer}
    >
      <header className="cq-on-scene flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold md:text-5xl">
            {questText(state.title, locale)}
          </h1>
          <p className="text-xl">{t("boss", { name: bossName })}</p>
        </div>
        <div className="flex items-center gap-4">
          {countdown ? (
            <span className="cq-clock text-5xl md:text-7xl">{countdown}</span>
          ) : null}
          <Sign>{t(`teacher.status.${status}`)}</Sign>
        </div>
      </header>
      <section aria-label={t("meterLabel")} className="flex flex-col gap-2">
        <Meter
          value={state.committed}
          pending={state.pending}
          max={state.target}
          label={t("meterLabel")}
          className="h-10"
        />
        <p className="cq-on-scene flex flex-wrap justify-between gap-2 text-2xl font-bold">
          <span>
            {t("meter", { committed: state.committed, target: state.target })}
          </span>
          <span>
            {t("live.present", {
              count: present,
              total: state.students.length,
            })}
          </span>
        </p>
      </section>
      <section aria-label={t("live.field")} className="cq-field relative">
        <ul className="cq-field-heroes m-0 list-none p-0">
          {state.students.map((s) => (
            <li
              key={s.userId}
              data-stale={s.stale}
              className={cn(
                "cq-field-hero",
                !s.present && "cq-field-hero--away",
                s.stale && "cq-field-hero--stale",
                hit && lastHit?.userId === s.userId && "cq-lunge",
              )}
            >
              {s.profile ? (
                <AvatarPortrait
                  classId={s.profile.classId}
                  pieces={Object.values(s.loadout)}
                  tints={s.profile.tints}
                  alt={s.name}
                />
              ) : (
                <div
                  className="bg-muted size-18 rounded-xl"
                  aria-hidden="true"
                />
              )}
              <span className="w-full truncate text-center">{s.name}</span>
              <Meter
                value={s.hp ?? 0}
                max={STUDENT_HP}
                label={`${s.name} HP`}
                tone="green"
                thin
              />
            </li>
          ))}
        </ul>
        <BossSprite
          artKey={state.boss.artKey}
          name={bossName}
          size={224}
          hit={hit}
          fallen={over && state.bossFallen}
        />
        {over && state.bossFallen ? (
          <span aria-hidden="true">
            {RAIN.map((coin, i) => (
              <span
                key={i}
                className="cq-coin-rain"
                style={{ left: coin.left, animationDelay: coin.delay }}
              />
            ))}
          </span>
        ) : null}
      </section>
      {over ? (
        <Panel dark className="items-center text-center">
          <p className="text-4xl font-bold md:text-6xl">
            {state.bossFallen ? t("battle.fell") : t("battle.held")}
          </p>
          <p className="mt-2 text-2xl">{t("live.helpers")}</p>
          <ul className="mt-2 flex flex-wrap justify-center gap-2 text-xl">
            {state.helpers.map((h) => (
              <li key={h.userId}>
                <Sign small>{h.name}</Sign>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
      <Panel aria-label={t("live.hits")} className="gap-2">
        <h2 className="m-0 text-xl font-bold">{t("live.hits")}</h2>
        {state.hits.length ? (
          <ul className="flex flex-col gap-1 text-lg">
            {state.hits
              .slice(-FEED)
              .reverse()
              .map((hit) => (
                <li key={`${hit.userId}-${hit.at}`}>
                  {t("live.hit", { name: hit.name, damage: hit.damage })}
                </li>
              ))}
          </ul>
        ) : (
          <p className="cq-muted">{t("live.noHits")}</p>
        )}
      </Panel>
      <footer className="flex flex-wrap items-center gap-3">
        {next ? (
          <RpgButton
            tone="gold"
            disabled={pending}
            onClick={move}
            className="min-h-14 px-6 text-xl"
          >
            {t(`live.next.${next}`)}
          </RpgButton>
        ) : (
          <p className="cq-on-scene text-xl">{t("live.closed")}</p>
        )}
        {error ? (
          <p role="alert" className="text-destructive font-semibold">
            {error}
          </p>
        ) : null}
      </footer>
    </div>
  );
}
