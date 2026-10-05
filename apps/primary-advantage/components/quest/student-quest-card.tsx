import { useLocale, useTranslations } from "next-intl";
import { SwordsIcon } from "lucide-react";
import type { StudentQuestCard as StudentQuestCardData } from "@reading-advantage/game-contracts";
import { cn } from "@/lib/utils";
import { QuestMeter } from "./quest-meter";
import { goalValues, questText } from "./quest-copy";

const CARD = "bg-card text-card-foreground flex flex-col gap-3 rounded-2xl border p-5 shadow-sm";

/**
 * The quest card of the student home (FR-4): the boss, the days left, the class meter, the
 * student's power-ups, and the week's goals with the earned ones marked.
 * @param props.card The card data, or null when the student has no quest.
 * @param props.className Extra classes.
 * @returns The card, or nothing.
 */
export function StudentQuestCard({ card, className }: { card: StudentQuestCardData | null; className?: string }) {
  const t = useTranslations("Quest");
  const locale = useLocale();
  if (!card) return null;
  const earned = new Map(card.powerUps.map((p) => [p.goalKey, p.powerUp]));
  return (
    <section aria-labelledby="home-quest" data-quest-card className={cn(CARD, className)}>
      <h2 id="home-quest" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
        <SwordsIcon className="text-primary size-4" aria-hidden="true" />
        {t("title")}
      </h2>
      <p className="text-xl font-bold">{questText(card.title, locale)}</p>
      <p className="text-muted-foreground text-sm">
        {t("boss", { name: questText(card.boss.name, locale) })} · {t("daysLeft", { count: card.daysLeft })}
      </p>
      <QuestMeter committed={card.committed} target={card.quest.bossTarget} label={t("meterLabel")} />
      <p className="text-sm">{t("meter", { committed: card.committed, target: card.quest.bossTarget })}</p>
      <h3 className="text-sm font-semibold">{t("powerUps")}</h3>
      {card.powerUps.length ? (
        <ul className="flex flex-wrap gap-2">
          {card.powerUps.map((p) => (
            <li key={p.goalKey} className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-semibold">
              {t(`powerUp.${p.powerUp}`)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">{t("noPowerUps")}</p>
      )}
      <h3 className="text-sm font-semibold">{t("goals")}</h3>
      <ul className="flex flex-col gap-1 text-sm">
        {card.goals.map((goal) => (
          <li key={goal.key} className="flex flex-wrap items-center justify-between gap-2">
            <span>{t(`goal.${goal.kind}`, goalValues(goal))}</span>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", earned.has(goal.key) ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
              {earned.has(goal.key) ? t("earned") : t(`powerUp.${goal.powerUp}`)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
