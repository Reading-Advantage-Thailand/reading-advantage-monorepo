import { useLocale, useTranslations } from "next-intl";
import type { StudentQuestCard as StudentQuestCardData } from "@reading-advantage/game-contracts";
import { bossArt, RELIC_ART } from "@/lib/rpg/places";
import { Banner, Meter, Panel, RpgLink } from "@/components/rpg/chrome";
import { cn } from "@/lib/utils";
import { goalValues, questText } from "./quest-copy";

/**
 * The quest banner of the student home (FR-4, docs/primary-rpg-skin.md §4): the boss portrait,
 * the days left, the class meter in the iron frame, the week's goals with the earned relics lit,
 * and the way to the battle.
 * @param props.card The card data, or null when the student has no quest.
 * @param props.className Extra classes.
 * @returns The banner and panel, or nothing.
 */
export function StudentQuestCard({ card, className }: { card: StudentQuestCardData | null; className?: string }) {
  const t = useTranslations("Quest");
  const locale = useLocale();
  if (!card) return null;
  const earned = new Map(card.powerUps.map((p) => [p.goalKey, p.powerUp]));
  return (
    <section aria-labelledby="home-quest" data-quest-card className={cn("flex flex-col", className)}>
      <Banner>
        <h2 id="home-quest" className="m-0 text-[length:inherit] font-bold">
          {t("title")}
        </h2>
      </Banner>
      <Panel className="pt-6">
        <div className="grid grid-cols-[96px_1fr] items-center gap-3">
          <img src={bossArt(card.boss.artKey)} alt={questText(card.boss.name, locale)} className="cq-shadowed w-24" />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-lg font-bold leading-tight">{questText(card.title, locale)}</p>
            <p className="cq-muted text-sm">
              {t("boss", { name: questText(card.boss.name, locale) })} · {t("daysLeft", { count: card.daysLeft })}
            </p>
            <Meter value={card.committed} max={card.quest.bossTarget} label={t("meterLabel")} />
            <p className="text-sm">{t("meter", { committed: card.committed, target: card.quest.bossTarget })}</p>
          </div>
        </div>
        <ul className="flex flex-wrap gap-2" aria-label={t("goals")}>
          {card.goals.map((goal) => {
            const done = earned.has(goal.key);
            return (
              <li key={goal.key} className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold", done ? "border-[var(--cq-green)] bg-[rgba(79,180,90,0.2)]" : "border-[rgba(92,57,26,0.3)] bg-[rgba(92,57,26,0.12)]")}>
                <img src={RELIC_ART[goal.powerUp]} alt="" className={cn("size-4", !done && "opacity-60 grayscale")} />
                {t(`goal.${goal.kind}`, goalValues(goal))}
                <span className="cq-muted font-normal" aria-hidden="true">·</span>
                <span className="cq-muted font-normal">{t(`powerUp.${goal.powerUp}`)}</span>
                {done ? <span className="sr-only">{t("earned")}</span> : null}
              </li>
            );
          })}
        </ul>
        {card.powerUps.length === 0 ? <p className="cq-muted text-sm">{t("noPowerUps")}</p> : null}
        <RpgLink tone={card.quest.status === "open" ? "wood" : "gold"} href="/student/quest/battle" className="w-fit">
          {t("battle.go")}
        </RpgLink>
      </Panel>
    </section>
  );
}
