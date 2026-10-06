"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { TeacherLesson } from "@reading-advantage/domain/primary-books";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TEACHER_ACTION } from "./teacher-shell";

/**
 * Projector mode (FR-11): the article in large type with one paragraph in focus, the vocabulary
 * list, and the questions with an answer reveal. Per-option tallies are not available yet.
 * @param props.lesson The teacher lesson.
 * @param props.showThai True for the Thai locale: shows the Thai gloss of each word.
 * @returns The projector view.
 */
export function ProjectorView({ lesson, showThai }: { lesson: TeacherLesson; showThai: boolean }) {
  const t = useTranslations("TeacherUi.classBook.lesson");
  const paragraphs = lesson.article?.paragraphs ?? [];
  const [focus, setFocus] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setRevealed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <div className="flex flex-col gap-8">
      <section aria-label={lesson.article?.title ?? lesson.lesson.title} className="flex flex-col gap-4">
        {paragraphs.length ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" className={TEACHER_ACTION} disabled={focus === null || focus === 0} onClick={() => setFocus((focus ?? 0) - 1)}>
                {t("previous")}
              </Button>
              <Button type="button" variant="outline" className={TEACHER_ACTION} disabled={focus !== null && focus >= paragraphs.length - 1} onClick={() => setFocus(focus === null ? 0 : focus + 1)}>
                {t("next")}
              </Button>
              <Button type="button" variant="ghost" className={TEACHER_ACTION} disabled={focus === null} onClick={() => setFocus(null)}>
                {t("showAll")}
              </Button>
              <p className="text-muted-foreground text-sm" role="status">
                {focus === null ? t("projectorHint") : t("paragraph", { number: focus + 1, total: paragraphs.length })}
              </p>
            </div>
            <ol className="flex flex-col gap-4">
              {paragraphs.map((paragraph, index) => (
                <li key={index}>
                  <button
                    type="button"
                    aria-pressed={focus === index}
                    onClick={() => setFocus(focus === index ? null : index)}
                    className={cn(
                      "font-article w-full rounded-2xl p-4 text-left text-2xl leading-relaxed transition-opacity md:text-3xl",
                      focus === index && "bg-primary/10 ring-primary ring-2",
                      focus !== null && focus !== index && "opacity-30",
                    )}
                  >
                    {paragraph}
                  </button>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="text-muted-foreground">{t("noArticle")}</p>
        )}
      </section>

      {lesson.glossary.length ? (
        <section aria-labelledby="projector-vocab" className="flex flex-col gap-3">
          <h2 id="projector-vocab" className="text-2xl font-bold">
            {t("vocabulary")}
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {lesson.glossary.map((entry) => (
              <li key={entry.word} className="rounded-2xl border p-4">
                <p className="text-2xl font-bold">
                  {entry.word} {entry.pos ? <span className="text-muted-foreground text-base font-normal">({entry.pos})</span> : null}
                </p>
                {entry.definition ? <p className="text-lg">{entry.definition}</p> : null}
                {showThai && entry.thai ? (
                  <p lang="th" className="text-lg">
                    {entry.thai}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {lesson.bank.mcq.length || lesson.bank.saq.length ? (
        <section aria-labelledby="projector-questions" className="flex flex-col gap-3">
          <h2 id="projector-questions" className="text-2xl font-bold">
            {t("questions")}
          </h2>
          <ol className="flex flex-col gap-4">
            {[...lesson.bank.mcq.map((q, i) => ({ id: q.id ?? `m${i}`, question: q.question, options: q.options, answer: q.answer })), ...lesson.bank.saq.map((q, i) => ({ id: q.id ?? `s${i}`, question: q.question, options: [] as string[], answer: q.answer ?? "" }))].map((q, index) => {
              const open = revealed.has(q.id);
              return (
                <li key={q.id} className="flex flex-col gap-2 rounded-2xl border p-4">
                  <p className="text-xl font-semibold md:text-2xl">
                    {index + 1}. {q.question}
                  </p>
                  {q.options.length ? (
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {q.options.map((option) => (
                        <li key={option} className={cn("rounded-xl border px-3 py-2 text-lg", open && option === q.answer && "border-green-600 bg-green-100 font-semibold text-green-900 dark:bg-green-950 dark:text-green-200")}>
                          {option}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {open && !q.options.length ? <p className="text-lg font-semibold">{q.answer}</p> : null}
                  <Button type="button" variant={open ? "ghost" : "default"} className={cn(TEACHER_ACTION, "self-start")} aria-pressed={open} onClick={() => toggle(q.id)}>
                    {open ? t("hideAnswer") : t("showAnswer")}
                  </Button>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
