"use client";

import { useId, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { QuestTemplate } from "@reading-advantage/game-contracts";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { goalValues, questText } from "./quest-copy";

/** Native select and date input styled like the shadcn input. */
const FIELD = "border-input bg-background min-h-11 w-full rounded-md border px-3 text-sm";
const KNOWN_ERRORS = new Set(["ALREADY_OPEN", "NO_CONTENT", "BAD_TIME", "GAME_UNAVAILABLE"]);

/**
 * The next Friday at 14:30 local time as a `datetime-local` value.
 * @param now The current time.
 * @returns The value for the input.
 */
export function defaultBattleAt(now: Date): string {
  const date = new Date(now);
  date.setDate(date.getDate() + ((5 - date.getDay() + 7) % 7 || 7));
  date.setHours(14, 30, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * The assign form (FR-2): a quest template, a class, and the battle time; posts to
 * `POST /api/v1/quest` and goes to the class page.
 * @param props.templates The fixed template list.
 * @param props.classes The teacher's classes.
 * @param props.defaultClassId The class to preselect.
 * @returns The form.
 */
export function AssignQuestForm({ templates, classes, defaultClassId }: { templates: QuestTemplate[]; classes: { id: string; name: string }[]; defaultClassId?: string }) {
  const t = useTranslations("Quest");
  const locale = useLocale();
  const router = useRouter();
  const id = useId();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [classId, setClassId] = useState(defaultClassId && classes.some((c) => c.id === defaultClassId) ? defaultClassId : (classes[0]?.id ?? ""));
  const [battleAt, setBattleAt] = useState(() => defaultBattleAt(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    start(async () => {
      const response = await fetch("/api/v1/quest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateId, classId, battleAt: new Date(battleAt).toISOString() }),
      });
      if (response.ok) return router.push(`/teacher/class-roster/${classId}`);
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(t(`assign.errors.${body.error && KNOWN_ERRORS.has(body.error) ? body.error : "generic"}`));
    });
  };

  if (!classes.length) return <p className="text-muted-foreground">{t("assign.noClasses")}</p>;
  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold">{t("assign.template")}</legend>
        {templates.map((template) => (
          <label key={template.id} className={cn("flex cursor-pointer gap-3 rounded-xl border p-3", templateId === template.id && "border-primary bg-primary/5")}>
            <input type="radio" name="templateId" value={template.id} checked={templateId === template.id} onChange={() => setTemplateId(template.id)} className="mt-1 size-5" />
            <span className="flex flex-col gap-1">
              <span className="font-semibold">{questText(template.title, locale)}</span>
              <span className="text-muted-foreground text-sm">{t("boss", { name: questText(template.boss.name, locale) })}</span>
              <span className="text-muted-foreground text-sm">{template.goals.map((goal) => `${t(`goal.${goal.kind}`, goalValues(goal))} → ${t(`powerUp.${goal.powerUp}`)}`).join(" · ")}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-class`} className="text-sm font-semibold">
          {t("assign.class")}
        </label>
        <select id={`${id}-class`} value={classId} onChange={(e) => setClassId(e.target.value)} className={FIELD}>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-battle`} className="text-sm font-semibold">
          {t("assign.battleAt")}
        </label>
        <input id={`${id}-battle`} type="datetime-local" value={battleAt} onChange={(e) => setBattleAt(e.target.value)} required className={FIELD} />
      </div>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending || !templateId || !classId} className="min-h-11 w-fit rounded-xl">
        {t("assign.submit")}
      </Button>
    </form>
  );
}
