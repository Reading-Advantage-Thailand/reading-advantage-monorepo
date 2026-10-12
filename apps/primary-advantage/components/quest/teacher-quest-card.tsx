import { useFormatter, useLocale, useTranslations } from "next-intl";
import { SwordsIcon } from "lucide-react";
import type { TeacherQuestCard as TeacherQuestCardData } from "@reading-advantage/game-contracts";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Panel, rpgButton } from "@/components/rpg/chrome";
import { TEACHER_ACTION, TEACHER_CARD } from "@/components/teacher/teacher-shell";
import { CancelQuestButton } from "./cancel-quest-button";
import { QuestMeter } from "./quest-meter";
import { questText } from "./quest-copy";

/**
 * The quest card of the teacher dashboard and class page (FR-4): the quest, the boss, the days
 * left, the class meter, the roster numbers, and the actions; or the assign link when the class
 * has no quest this week.
 * @param props.classroomId The class.
 * @param props.card The card data, or null.
 * @param props.heading A heading above the quest, for example the class name on the dashboard.
 * @param props.className Extra classes.
 * @param props.panel True renders the card as a parchment panel, for a page inside a Scene.
 * @returns The card.
 */
export function TeacherQuestCard({ classroomId, card, heading, className, panel }: { classroomId: string; card: TeacherQuestCardData | null; heading?: string; className?: string; panel?: boolean }) {
  const t = useTranslations("Quest");
  const locale = useLocale();
  const format = useFormatter();
  const headingId = `quest-${classroomId}`;
  const Frame = panel ? Panel : "section";
  const actionClass = panel ? cn(rpgButton("wood", true), "min-h-12") : cn(buttonVariants({ variant: "default" }), TEACHER_ACTION, "rounded-xl");
  return (
    <Frame aria-labelledby={headingId} data-quest-card={classroomId} className={panel ? className : cn(TEACHER_CARD, className)}>
      <h2 id={headingId} className="flex items-center gap-2 text-lg font-semibold">
        <SwordsIcon className="text-primary size-5 shrink-0" aria-hidden="true" />
        {heading ?? t("teacher.title")}
      </h2>
      {card ? (
        <>
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-xl font-bold">{questText(card.title, locale)}</span>
            <span className="bg-muted rounded-full px-2 py-0.5 text-xs font-semibold">{t(`teacher.status.${card.quest.status}`)}</span>
          </p>
          <p className="text-muted-foreground text-sm">
            {t("boss", { name: questText(card.boss.name, locale) })} · {t("daysLeft", { count: card.daysLeft })} ·{" "}
            {t("teacher.battleAt", { time: format.dateTime(new Date(card.quest.battleAt), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }) })}
          </p>
          <QuestMeter committed={card.committed} target={card.quest.bossTarget} label={t("meterLabel")} />
          <p className="text-sm">
            {t("meter", { committed: card.committed, target: card.quest.bossTarget })} · {t("teacher.roster", { count: card.rosterSize })} · {t("teacher.earners", { count: card.studentsWithPowerUps })}
          </p>
          <div className="flex flex-wrap gap-2">
            {card.quest.status !== "done" ? (
              <Link href={`/teacher/quest/${card.quest.id}/live`} className={actionClass}>
                {t("teacher.live")}
              </Link>
            ) : null}
            {card.quest.status === "open" ? <CancelQuestButton questId={card.quest.id} /> : null}
          </div>
        </>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">{t("teacher.none")}</p>
          <Link href={`/teacher/quest?classroomId=${classroomId}`} className={cn(actionClass, "w-fit")}>
            {t("teacher.assign")}
          </Link>
        </>
      )}
    </Frame>
  );
}
