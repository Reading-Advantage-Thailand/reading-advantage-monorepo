"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type {
  AvatarProfile,
  LaunchAvatar,
  QuestBattleState,
  QuestPowerUp,
} from "@reading-advantage/game-contracts";
import {
  DASHBOARD_POLL_SECONDS,
  HEARTBEAT_SECONDS,
  STUDENT_HP,
  applyWrongAnswer,
  hitDamage,
} from "@reading-advantage/domain/primary-quest/rules";
import { Hearts, Meter, Panel, RpgLink, Sign } from "@/components/rpg/chrome";
import { RELIC_ART } from "@/lib/rpg/places";
import { cn } from "@/lib/utils";
import { AvatarPortrait } from "@/components/avatar/portrait-canvas";
import { StudentCartridgeHost } from "@/components/apk/StudentCartridgeHost";
import { BossSprite, useBossHit } from "./boss-sprite";
import { countdownText } from "./countdown";
import { questText } from "./quest-copy";

/** The cartridge the battle runs. */
export interface BattleCartridge {
  id: string;
  title: string;
  description: string;
  inputMode: "vocabulary" | "sentence";
}

/** The phone's own numbers for the heartbeat (FR-8). */
interface Tally {
  runId: string | null;
  answered: number;
  correct: number;
  hp: number;
  damage: number;
  rested: boolean;
  done: boolean;
}

/**
 * The student's numbers after the game: wrong answers cost HP (a shield absorbs the first), a
 * rest at 0 HP gives half HP back, and the damage is the correct answers with the armed power-ups.
 * @param result The saved completion numbers.
 * @param armed The power-ups applied to this run.
 * @returns The tally for the heartbeat.
 */
export function tallyRun(
  result: {
    challengeRunId?: string;
    correctAnswers: number;
    totalAttempts: number;
  },
  armed: ReadonlySet<QuestPowerUp>,
): Tally {
  let hp = STUDENT_HP;
  let shield = armed.has("shield");
  let rested = false;
  for (
    let wrong = Math.max(0, result.totalAttempts - result.correctAnswers);
    wrong > 0;
    wrong -= 1
  ) {
    const after = applyWrongAnswer(hp, shield);
    if (after.shieldUsed) shield = false;
    hp = after.rests ? after.restHp : after.hp;
    rested = rested || after.rests;
  }
  return {
    runId: result.challengeRunId ?? null,
    answered: result.totalAttempts,
    correct: result.correctAnswers,
    hp,
    damage:
      result.correctAnswers *
      hitDamage({
        sharpBlade: armed.has("sharp-blade"),
        rallyHorn: armed.has("rally-horn"),
      }),
    rested,
    done: true,
  };
}

/** The coins that rain when the boss falls. */
const RAIN = Array.from({ length: 12 }, (_, i) => ({
  left: `${6 + ((i * 37) % 88)}%`,
  delay: `${(i % 6) * 0.15}s`,
}));

/**
 * The phone battle page in the boss arena (FR-9, docs/primary-rpg-skin.md §4): the boss on the
 * dais with its meter, the hero with five hearts and the HP bar, the relics that glow when armed,
 * the game inside a stone archway, and the result. Polls the state every few seconds and posts a
 * heartbeat every 10 seconds and after the game is saved.
 * @param props.initial The state from the server.
 * @param props.cartridge The battle game.
 * @param props.ownerKey The student's owner key for the game host.
 * @param props.profile The student's avatar profile, for the portrait; null without one.
 * @param props.avatar The avatar the game receives.
 * @returns The page body.
 */
export function BattleClient({
  initial,
  cartridge,
  ownerKey,
  profile,
  avatar,
}: {
  initial: QuestBattleState;
  cartridge: BattleCartridge;
  ownerKey: string;
  profile: AvatarProfile | null;
  avatar: LaunchAvatar | null;
}) {
  const t = useTranslations("Quest");
  const locale = useLocale();
  const [state, setState] = useState(initial);
  // The clock starts after mount so the server and the client render the same text.
  const [now, setNow] = useState<Date | null>(null);
  const [armed, setArmed] = useState<Set<QuestPowerUp>>(
    () =>
      new Set(initial.powerUps.filter((p) => !p.usedAt).map((p) => p.powerUp)),
  );
  // A reload keeps the tally: the server returns the phone's own latest heartbeat.
  const [tally, setTally] = useState<Tally>(() => {
    const mine = initial.heartbeat;
    const done = Boolean(mine && mine.answered > 0);
    return mine
      ? {
          runId: mine.runId ?? initial.runId,
          answered: mine.answered,
          correct: mine.correct,
          hp: mine.hp,
          damage: mine.damage,
          rested: false,
          done,
        }
      : {
          runId: initial.runId,
          answered: 0,
          correct: 0,
          hp: STUDENT_HP,
          damage: 0,
          rested: false,
          done: false,
        };
  });
  const tallyRef = useRef(tally);
  tallyRef.current = tally;
  const armedRef = useRef(armed);
  armedRef.current = armed;
  const status = state.quest.status;
  const hit = useBossHit(state.committed + state.pending + tally.damage);

  useEffect(() => {
    setNow(new Date());
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      const response = await fetch("/api/v1/quest/battle", {
        cache: "no-store",
      }).catch(() => null);
      if (!active || !response?.ok) return;
      const body = (await response.json().catch(() => null)) as {
        state: QuestBattleState | null;
      } | null;
      if (active && body?.state) setState(body.state);
    };
    const beat = () => {
      const current = tallyRef.current;
      if (!["rally", "play", "result"].includes(status)) return;
      void fetch("/api/v1/quest/heartbeat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          questId: state.quest.id,
          runId: current.runId,
          answered: current.answered,
          correct: current.correct,
          hp: current.hp,
          damage: current.damage,
          powerUpsUsed: current.done ? [...armedRef.current] : [],
        }),
      }).catch(() => undefined);
    };
    beat();
    const polling = setInterval(
      () => void poll(),
      DASHBOARD_POLL_SECONDS * 1000,
    );
    const beating = setInterval(beat, HEARTBEAT_SECONDS * 1000);
    return () => {
      active = false;
      clearInterval(polling);
      clearInterval(beating);
    };
  }, [state.quest.id, status]);

  const onCompleted = (result: {
    challengeRunId?: string;
    correctAnswers: number;
    totalAttempts: number;
    victory: boolean;
  }) => {
    const next = tallyRun(result, armedRef.current);
    setTally(next);
    void fetch("/api/v1/quest/heartbeat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        questId: state.quest.id,
        runId: next.runId,
        answered: next.answered,
        correct: next.correct,
        hp: next.hp,
        damage: next.damage,
        powerUpsUsed: [...armedRef.current],
      }),
    }).catch(() => undefined);
  };

  const countdown = now ? countdownText(state.countdownEndsAt, now) : null;
  const bossName = questText(state.boss.name, locale);
  const over = status === "result" || status === "done";
  const bossFallen = state.committed >= state.target;
  const shielded = armed.has("shield") && !tally.done;
  return (
    <div className="flex flex-col gap-4" data-quest-battle={status}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="cq-on-scene flex flex-col">
          <h1 className="text-2xl font-bold">
            {questText(state.title, locale)}
          </h1>
          <p className="text-sm">{t("boss", { name: bossName })}</p>
        </div>
        {countdown ? <span className="cq-clock">{countdown}</span> : null}
      </header>
      <section
        aria-label={t("meterLabel")}
        className="relative flex flex-col items-center gap-2"
      >
        <BossSprite
          artKey={state.boss.artKey}
          name={bossName}
          size={200}
          hit={hit}
          fallen={over && bossFallen}
        />
        {over && bossFallen ? (
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
        <div className="w-full max-w-xl">
          <Meter
            value={state.committed}
            pending={state.pending}
            max={state.target}
            label={t("meterLabel")}
          />
          <p className="cq-on-scene flex flex-wrap justify-center gap-2 text-sm font-bold">
            {t("meter", { committed: state.committed, target: state.target })}
          </p>
        </div>
      </section>
      <Panel
        aria-label={t("battle.you")}
        className="grid grid-cols-[96px_1fr] items-center gap-3"
      >
        <div className="relative w-24">
          {profile ? (
            <AvatarPortrait
              classId={profile.classId}
              pieces={avatar?.pieces ?? []}
              tints={profile.tints}
              alt={t("battle.you")}
              className="cq-shadowed"
            />
          ) : (
            <div className="bg-muted size-24 rounded-xl" aria-hidden="true" />
          )}
          {shielded ? (
            <span
              className="cq-fx-shield cq-fx-shield--on"
              aria-hidden="true"
            />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold">{t("battle.you")}</span>
            <Hearts
              hp={tally.hp}
              max={STUDENT_HP}
              label={t("battle.hp", { hp: tally.hp, max: STUDENT_HP })}
            />
          </div>
          <Meter
            value={tally.hp}
            max={STUDENT_HP}
            label={t("battle.hpLabel")}
            tone="green"
            thin
          />
          <p className="text-sm font-bold">
            {t("battle.damage", { damage: tally.damage })}
          </p>
          {tally.rested ? (
            <p className="cq-muted text-sm">{t("battle.rested")}</p>
          ) : null}
        </div>
      </Panel>
      <section
        aria-label={t("powerUps")}
        className="flex flex-wrap justify-center gap-4"
      >
        {state.powerUps.length ? (
          state.powerUps.map((p) => {
            const used = Boolean(p.usedAt) || tally.done;
            const on = armed.has(p.powerUp);
            return (
              <button
                key={p.goalKey}
                type="button"
                disabled={used}
                aria-pressed={on}
                onClick={() =>
                  setArmed((set) => {
                    const next = new Set(set);
                    if (next.has(p.powerUp)) next.delete(p.powerUp);
                    else next.add(p.powerUp);
                    return next;
                  })
                }
                className={cn(
                  "cq-on-scene flex min-h-12 flex-col items-center gap-1 text-xs font-bold",
                  used && "opacity-60",
                )}
              >
                <span
                  className={cn("cq-relic", on && !used && "cq-relic--armed")}
                >
                  <img src={RELIC_ART[p.powerUp]} alt="" />
                </span>
                {t(`powerUp.${p.powerUp}`)}
                {used ? ` · ${t("battle.used")}` : ""}
              </button>
            );
          })
        ) : (
          <p className="cq-on-scene text-sm">{t("noPowerUps")}</p>
        )}
      </section>
      {status === "open" ? (
        <Panel className="text-center text-lg">{t("battle.waiting")}</Panel>
      ) : null}
      {status === "rally" ? (
        <Panel className="text-center text-lg font-bold">
          {t("battle.present")}
        </Panel>
      ) : null}
      {status === "play" && !tally.done ? (
        <div className="cq-arch">
          <StudentCartridgeHost
            cartridgeId={cartridge.id}
            title={cartridge.title}
            description={cartridge.description}
            inputMode={cartridge.inputMode}
            locale={locale}
            ownerKey={ownerKey}
            challengeId={state.quest.challengeId}
            avatar={avatar}
            onCompleted={onCompleted}
          />
        </div>
      ) : null}
      {status === "play" && tally.done ? (
        <Panel className="text-center text-lg font-bold">
          {t("battle.saved", { damage: tally.damage })}
        </Panel>
      ) : null}
      {over ? (
        <Panel dark className="items-center text-center">
          <Sign>{bossFallen ? t("battle.fell") : t("battle.held")}</Sign>
          <p className="mt-1 text-sm">
            {t("meter", { committed: state.committed, target: state.target })}
          </p>
        </Panel>
      ) : null}
      <RpgLink href="/student/home" tone="iron" className="self-start">
        {t("battle.home")}
      </RpgLink>
    </div>
  );
}
