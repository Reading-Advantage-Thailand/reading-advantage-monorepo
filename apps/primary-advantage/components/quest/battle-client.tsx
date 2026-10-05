"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SwordsIcon } from "lucide-react";
import type { AvatarProfile, LaunchAvatar, QuestBattleState, QuestPowerUp } from "@reading-advantage/game-contracts";
import { DASHBOARD_POLL_SECONDS, HEARTBEAT_SECONDS, STUDENT_HP, applyWrongAnswer, hitDamage } from "@reading-advantage/domain/primary-quest/rules";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AvatarPortrait } from "@/components/avatar/portrait-canvas";
import { StudentCartridgeHost } from "@/components/apk/StudentCartridgeHost";
import { countdownText } from "./countdown";
import { QuestMeter } from "./quest-meter";
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
export function tallyRun(result: { challengeRunId?: string; correctAnswers: number; totalAttempts: number }, armed: ReadonlySet<QuestPowerUp>): Tally {
  let hp = STUDENT_HP;
  let shield = armed.has("shield");
  let rested = false;
  for (let wrong = Math.max(0, result.totalAttempts - result.correctAnswers); wrong > 0; wrong -= 1) {
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
    damage: result.correctAnswers * hitDamage({ sharpBlade: armed.has("sharp-blade"), rallyHorn: armed.has("rally-horn") }),
    rested,
    done: true,
  };
}

/**
 * The phone battle page (FR-9): the boss, the student's portrait with an HP bar, the damage
 * counter, the power-up toggles, and the game while the teacher runs the play state. Polls the
 * state every few seconds and posts a heartbeat every 10 seconds and after the game is saved.
 * @param props.initial The state from the server.
 * @param props.cartridge The battle game.
 * @param props.ownerKey The student's owner key for the game host.
 * @param props.profile The student's avatar profile, for the portrait; null without one.
 * @param props.avatar The avatar the game receives.
 * @returns The page body.
 */
export function BattleClient({ initial, cartridge, ownerKey, profile, avatar }: { initial: QuestBattleState; cartridge: BattleCartridge; ownerKey: string; profile: AvatarProfile | null; avatar: LaunchAvatar | null }) {
  const t = useTranslations("Quest");
  const locale = useLocale();
  const [state, setState] = useState(initial);
  const [now, setNow] = useState(() => new Date());
  const [armed, setArmed] = useState<Set<QuestPowerUp>>(() => new Set(initial.powerUps.filter((p) => !p.usedAt).map((p) => p.powerUp)));
  const [tally, setTally] = useState<Tally>({ runId: initial.runId, answered: 0, correct: 0, hp: STUDENT_HP, damage: 0, rested: false, done: false });
  const tallyRef = useRef(tally);
  tallyRef.current = tally;
  const armedRef = useRef(armed);
  armedRef.current = armed;
  const status = state.quest.status;

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      const response = await fetch("/api/v1/quest/battle", { cache: "no-store" }).catch(() => null);
      if (!active || !response?.ok) return;
      const body = (await response.json().catch(() => null)) as { state: QuestBattleState | null } | null;
      if (active && body?.state) setState(body.state);
    };
    const beat = () => {
      const current = tallyRef.current;
      if (!["rally", "play", "result"].includes(status)) return;
      void fetch("/api/v1/quest/heartbeat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questId: state.quest.id, runId: current.runId, answered: current.answered, correct: current.correct, hp: current.hp, damage: current.damage, powerUpsUsed: current.done ? [...armedRef.current] : [] }),
      }).catch(() => undefined);
    };
    beat();
    const polling = setInterval(() => void poll(), DASHBOARD_POLL_SECONDS * 1000);
    const beating = setInterval(beat, HEARTBEAT_SECONDS * 1000);
    return () => {
      active = false;
      clearInterval(polling);
      clearInterval(beating);
    };
  }, [state.quest.id, status]);

  const onCompleted = (result: { challengeRunId?: string; correctAnswers: number; totalAttempts: number; victory: boolean }) => {
    const next = tallyRun(result, armedRef.current);
    setTally(next);
    void fetch("/api/v1/quest/heartbeat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questId: state.quest.id, runId: next.runId, answered: next.answered, correct: next.correct, hp: next.hp, damage: next.damage, powerUpsUsed: [...armedRef.current] }),
    }).catch(() => undefined);
  };

  const countdown = countdownText(state.countdownEndsAt, now);
  const bossFallen = state.committed >= state.target;
  return (
    <div className="flex flex-col gap-4" data-quest-battle={status}>
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <SwordsIcon className="text-primary size-6" aria-hidden="true" />
          {questText(state.title, locale)}
        </h1>
        <p className="text-muted-foreground">{t("boss", { name: questText(state.boss.name, locale) })}</p>
      </header>
      <section aria-label={t("meterLabel")} className="bg-card flex flex-col gap-2 rounded-2xl border p-4 shadow-sm">
        <QuestMeter committed={state.committed} pending={state.pending} target={state.target} label={t("meterLabel")} className="h-6" />
        <p className="flex flex-wrap justify-between gap-2 text-sm">
          <span>{t("meter", { committed: state.committed, target: state.target })}</span>
          {countdown ? <span className="font-mono text-base font-bold">{countdown}</span> : null}
        </p>
      </section>
      <section aria-label={t("battle.you")} className="bg-card flex items-center gap-4 rounded-2xl border p-4 shadow-sm">
        {profile ? (
          <AvatarPortrait classId={profile.classId} pieces={avatar?.pieces ?? []} tints={profile.tints} alt={t("battle.you")} className="w-24 rounded-xl" />
        ) : (
          <div className="bg-muted size-24 rounded-xl" aria-hidden="true" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-sm font-semibold">{t("battle.hp", { hp: tally.hp, max: STUDENT_HP })}</p>
          <div role="progressbar" aria-label={t("battle.hpLabel")} aria-valuemin={0} aria-valuemax={STUDENT_HP} aria-valuenow={tally.hp} className="bg-muted h-3 w-full overflow-hidden rounded-full">
            <div className="h-full bg-emerald-500" style={{ width: `${(tally.hp / STUDENT_HP) * 100}%` }} />
          </div>
          <p className="text-sm">{t("battle.damage", { damage: tally.damage })}</p>
          {tally.rested ? <p className="text-muted-foreground text-sm">{t("battle.rested")}</p> : null}
        </div>
      </section>
      <section aria-label={t("powerUps")} className="flex flex-wrap gap-2">
        {state.powerUps.length ? (
          state.powerUps.map((p) => {
            const used = Boolean(p.usedAt) || tally.done;
            const on = armed.has(p.powerUp);
            return (
              <Button
                key={p.goalKey}
                type="button"
                variant={on ? "default" : "outline"}
                disabled={used}
                aria-pressed={on}
                onClick={() => setArmed((set) => {
                  const next = new Set(set);
                  if (next.has(p.powerUp)) next.delete(p.powerUp);
                  else next.add(p.powerUp);
                  return next;
                })}
                className="min-h-12 rounded-xl"
              >
                {t(`powerUp.${p.powerUp}`)}
                {used ? ` · ${t("battle.used")}` : ""}
              </Button>
            );
          })
        ) : (
          <p className="text-muted-foreground text-sm">{t("noPowerUps")}</p>
        )}
      </section>
      {status === "open" ? <p className={cn("rounded-2xl border p-4 text-center text-lg")}>{t("battle.waiting")}</p> : null}
      {status === "rally" ? <p className="rounded-2xl border p-4 text-center text-lg font-semibold">{t("battle.present")}</p> : null}
      {status === "play" && !tally.done ? (
        <StudentCartridgeHost cartridgeId={cartridge.id} title={cartridge.title} description={cartridge.description} inputMode={cartridge.inputMode} locale={locale} ownerKey={ownerKey} challengeId={state.quest.challengeId} avatar={avatar} onCompleted={onCompleted} />
      ) : null}
      {status === "play" && tally.done ? <p className="rounded-2xl border p-4 text-center text-lg font-semibold">{t("battle.saved", { damage: tally.damage })}</p> : null}
      {status === "result" || status === "done" ? (
        <section className={cn("rounded-2xl border p-4 text-center", bossFallen ? "bg-primary text-primary-foreground" : "bg-card")}>
          <p className="text-2xl font-bold">{bossFallen ? t("battle.fell") : t("battle.held")}</p>
          <p className="mt-1 text-sm">{t("meter", { committed: state.committed, target: state.target })}</p>
        </section>
      ) : null}
      <Link href="/student/home" className="text-muted-foreground min-h-11 self-start text-sm underline-offset-4 hover:underline">
        {t("battle.home")}
      </Link>
    </div>
  );
}
