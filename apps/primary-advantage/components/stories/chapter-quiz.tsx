"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckIcon, XIcon } from "lucide-react";
import type {
  GetChapterQuestionsOutput,
  GradeChapterMcqOutput,
} from "@reading-advantage/domain/stories";
import { STORY_LA_FEEDBACK_TRIES } from "@reading-advantage/domain/stories/contracts";
import {
  getChapterWrittenFeedback,
  retakeChapterMcq,
  submitChapterMcq,
  submitChapterWritten,
} from "@/actions/story-question";
import { usePreviewSave } from "@/components/student/student-view-provider";
import { toTranslationLanguage } from "@/lib/translation-language";
import { cn, convertLocaleFull } from "@/lib/utils";

type Quiz = GetChapterQuestionsOutput;
type Mcq = Quiz["mcq"][number];
type Written = NonNullable<Quiz["saq"]>;
type FeedbackState = { feedback: string; score: number } | null;

const PANEL = "rounded-md border-2 border-[#8a6a3b] bg-[#fff4dc] p-4 text-[#2a2117]";
const GOLD_BUTTON =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#c9a227] px-6 font-bold text-[#2a2117] shadow-[0_4px_0_#8a6a3b] transition-transform active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50";
const IRON_BUTTON =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-[#8a6a3b] bg-[#f3e6c4] px-6 font-bold text-[#2a2117] disabled:cursor-not-allowed disabled:opacity-50";

/**
 * The question panels of a story chapter: 5 MCQ with done and retake states, and the SAQ/LAQ
 * written boxes with feedback, the LA minimum length, and one submit each. XP shows when the
 * submit pays it; a retake practices with no second XP (spec D4).
 * @param props.chapterId The chapter id.
 * @param props.userLevel The student reading level (sets the LAQ length rule).
 * @param props.initial The quiz from `getChapterQuestions` (no answers).
 * @returns The MCQ, SAQ, and LAQ panels.
 */
export function ChapterQuiz({ chapterId, userLevel, initial }: { chapterId: string; userLevel: number; initial: Quiz }) {
  const t = useTranslations("Stories");
  const locale = useLocale();
  // The AI reads "STUDENT'S L1" as a language name: a bare code such as "th" gave feedback in
  // another language (manual test run 2, U5).
  const feedbackLanguage = convertLocaleFull(toTranslationLanguage(locale));
  const { isPreview, notSaved } = usePreviewSave();
  const [mcq, setMcq] = useState<Mcq[]>(initial.mcq);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [mcResult, setMcResult] = useState<GradeChapterMcqOutput | null>(null);
  const [mcDone, setMcDone] = useState(initial.done.mc);
  const [mcScore, setMcScore] = useState<number | null>(initial.mcScore);
  const [xpAvailable, setXpAvailable] = useState(!initial.done.mc);
  const [mcBusy, setMcBusy] = useState(false);
  const [mcError, setMcError] = useState<string | null>(null);

  /** The LA minimum, in characters, for this student level. */
  const laMin = Math.max(1, Math.floor(userLevel)) * 30;

  const guardPreview = () => {
    if (isPreview) {
      notSaved();
      return true;
    }
    return false;
  };

  const handleMcSubmit = async () => {
    if (guardPreview()) return;
    setMcBusy(true);
    setMcError(null);
    const answers = mcq.map((q) => ({ questionId: q.id, answer: picked[q.id] ?? "" }));
    const res = await submitChapterMcq(chapterId, answers);
    setMcBusy(false);
    if (!res || typeof res !== "object" || !("success" in res)) {
      setMcError(t("chapterLoadError"));
      return;
    }
    const graded = res as unknown as GradeChapterMcqOutput;
    setMcResult(graded);
    setMcDone(true);
    setMcScore(graded.score);
  };

  const handleRetake = async () => {
    if (guardPreview()) return;
    setMcBusy(true);
    setMcError(null);
    const res = await retakeChapterMcq(chapterId);
    setMcBusy(false);
    if (!res || typeof res !== "object" || !("mcq" in res)) {
      setMcError(t("chapterLoadError"));
      return;
    }
    const fresh = res as unknown as { mcq: Mcq[]; xpAvailable: boolean };
    setMcq(fresh.mcq);
    setPicked({});
    setMcResult(null);
    setMcDone(false);
    setXpAvailable(fresh.xpAvailable);
  };

  const correctById = new Map((mcResult?.results ?? []).map((r) => [r.questionId, r]));

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">{t("quizTitle")}</h2>

      <section aria-label={t("mcTitle")} className={PANEL}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-bold">{t("mcTitle")}</h3>
          {mcDone && mcScore !== null ? (
            <span className="inline-flex items-center gap-1 rounded-full border-2 border-[#2f7d4b] bg-[#d9f0df] px-2 py-0.5 text-xs font-bold text-[#1d4d2d]">
              <CheckIcon className="size-3.5" aria-hidden /> {t("mcDone", { score: mcScore, total: mcq.length })}
            </span>
          ) : null}
        </div>

        {!xpAvailable ? (
          <p className="mt-2 text-sm font-bold text-[#8a6a3b]">{t("noXpLeft")}</p>
        ) : null}

        {mcDone && mcResult?.xpEarned ? (
          <p className="mt-2 text-sm font-bold text-[#2f7d4b]">{t("xpEarned", { xp: mcResult.xpEarned })}</p>
        ) : null}

        {mcDone && !mcResult ? (
          <div className="mt-3 flex flex-col gap-2">
            <button type="button" className={IRON_BUTTON} disabled={mcBusy} onClick={handleRetake}>
              {t("retakeQuiz")}
            </button>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-4">
            <p className="text-sm opacity-80">{t("answerAll", { total: mcq.length })}</p>
            {mcq.map((q, qi) => (
              <fieldset key={q.id} className="flex flex-col gap-2">
                <legend className="font-bold">
                  {qi + 1}. {q.question}
                </legend>
                {q.options.map((option) => {
                  const mark = correctById.get(q.id);
                  const isPick = picked[q.id] === option;
                  const isAnswer = mark?.correctAnswer === option;
                  return (
                    <label
                      key={option}
                      className={cn(
                        "flex min-h-12 cursor-pointer items-center gap-3 rounded-md border-2 border-[#8a6a3b] bg-[#fffdf4] px-3 py-2",
                        mcResult && isAnswer && "border-[#2f7d4b] bg-[#d9f0df]",
                        mcResult && isPick && !mark?.correct && "border-[#a33] bg-[#f6d9d9]",
                      )}
                    >
                      <input
                        type="radio"
                        name={`mc-${q.id}`}
                        value={option}
                        className="size-5"
                        checked={isPick}
                        disabled={!!mcResult || mcBusy}
                        onChange={() => setPicked((p) => ({ ...p, [q.id]: option }))}
                      />
                      <span className="flex-1">{option}</span>
                      {mcResult && isAnswer ? (
                        <CheckIcon className="size-5 shrink-0 text-[#2f7d4b]" aria-label={t("doneLabel")} />
                      ) : null}
                      {mcResult && isPick && !mark?.correct ? (
                        <XIcon className="size-5 shrink-0 text-[#a33]" aria-hidden />
                      ) : null}
                    </label>
                  );
                })}
                {mcResult?.results.find((r) => r.questionId === q.id)?.textualEvidence ? (
                  <p className="text-xs opacity-70">
                    {mcResult.results.find((r) => r.questionId === q.id)?.textualEvidence}
                  </p>
                ) : null}
              </fieldset>
            ))}
            {mcError ? (
              <p role="alert" className="text-sm font-bold text-[#a33]">
                {mcError}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {!mcResult ? (
                <button
                  type="button"
                  className={GOLD_BUTTON}
                  disabled={mcBusy || mcq.length === 0 || mcq.some((q) => !picked[q.id])}
                  onClick={handleMcSubmit}
                >
                  {t("submitQuiz")}
                </button>
              ) : (
                <button type="button" className={IRON_BUTTON} disabled={mcBusy} onClick={handleRetake}>
                  {t("retakeQuiz")}
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {initial.saq ? (
        <WrittenPanel
          chapterId={chapterId}
          kind="sa"
          question={initial.saq as Written}
          done={initial.done.sa}
          minChars={1}
          maxChars={2000}
          maxTries={null}
          preferredLanguage={feedbackLanguage}
        />
      ) : null}
      {initial.laq ? (
        <WrittenPanel
          chapterId={chapterId}
          kind="la"
          question={initial.laq as Written}
          done={initial.done.la}
          minChars={laMin}
          maxChars={2000}
          maxTries={STORY_LA_FEEDBACK_TRIES}
          preferredLanguage={feedbackLanguage}
        />
      ) : null}
    </div>
  );
}

/**
 * One written question (SAQ or LAQ): the answer box, the feedback button with the LA minimum
 * length and try cap, and one submit. A second submit is refused (spec D4).
 */
function WrittenPanel({
  chapterId,
  kind,
  question,
  done: initialDone,
  minChars,
  maxChars,
  maxTries,
  preferredLanguage,
}: {
  chapterId: string;
  kind: "sa" | "la";
  question: Written;
  done: boolean;
  minChars: number;
  maxChars: number;
  maxTries: number | null;
  preferredLanguage: string;
}) {
  const t = useTranslations("Stories");
  const { isPreview, notSaved } = usePreviewSave();
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [tries, setTries] = useState(0);
  const [done, setDone] = useState(initialDone);
  const [paid, setPaid] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tooShort = answer.trim().length < minChars;
  const triesOut = maxTries !== null && tries >= maxTries;

  const handleFeedback = async () => {
    if (isPreview) {
      notSaved();
      return;
    }
    if (tooShort || triesOut) return;
    setBusy(true);
    setError(null);
    const res = await getChapterWrittenFeedback(chapterId, kind, question.id, answer, preferredLanguage);
    setBusy(false);
    if (!res || typeof res !== "object" || !("success" in res)) {
      const err = (res as { error?: string; minChars?: number } | null)?.error;
      setError(err === "too_short" ? t("tooShort", { min: (res as { minChars?: number })?.minChars ?? minChars }) : t("chapterLoadError"));
      return;
    }
    const ok = res as unknown as { feedback: string; score: number };
    setFeedback({ feedback: ok.feedback, score: ok.score });
    setTries((n) => n + 1);
  };

  const handleSubmit = async () => {
    if (isPreview) {
      notSaved();
      return;
    }
    if (!feedback || done) return;
    setBusy(true);
    setError(null);
    const res = await submitChapterWritten(chapterId, kind, question.id, answer, feedback.score);
    setBusy(false);
    if (!res || typeof res !== "object" || !("success" in res)) {
      setError(t("alreadySubmitted"));
      return;
    }
    setDone(true);
    setPaid((res as unknown as { xpEarned: number }).xpEarned);
  };

  return (
    <section aria-label={kind === "sa" ? t("saTitle") : t("laTitle")} className={PANEL}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold">{kind === "sa" ? t("saTitle") : t("laTitle")}</h3>
        {done ? (
          <span className="inline-flex items-center gap-1 rounded-full border-2 border-[#2f7d4b] bg-[#d9f0df] px-2 py-0.5 text-xs font-bold text-[#1d4d2d]">
            <CheckIcon className="size-3.5" aria-hidden /> {t("doneLabel")}
          </span>
        ) : null}
      </div>
      <p className="mt-2 font-bold">{question.question}</p>
      {done ? (
        paid !== null && paid > 0 ? (
          <p className="mt-2 text-sm font-bold text-[#2f7d4b]">{t("xpEarned", { xp: paid })}</p>
        ) : null
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <label htmlFor={`written-${kind}-${question.id}`} className="text-sm font-bold">
            {t("yourAnswer")}
          </label>
          <textarea
            id={`written-${kind}-${question.id}`}
            className="min-h-24 rounded-md border-2 border-[#8a6a3b] bg-[#fffdf4] p-3"
            placeholder={t("answerPlaceholder")}
            value={answer}
            maxLength={maxChars}
            disabled={busy}
            onChange={(e) => setAnswer(e.target.value)}
          />
          {kind === "la" ? (
            <p className="text-xs opacity-80">
              {t("tooShort", { min: minChars })}
              {maxTries !== null ? ` · ${t("triesLeft", { n: Math.max(0, maxTries - tries) })}` : ""}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm font-bold text-[#a33]">
              {error}
            </p>
          ) : null}
          {feedback ? (
            <div className="rounded-md border-2 border-dashed border-[#8a6a3b] bg-[#fffdf4] p-3">
              <p className="text-sm font-bold">
                {t("feedbackTitle")} · {t("scoreLabel", { score: feedback.score })}
              </p>
              <p className="mt-1 text-sm">{feedback.feedback}</p>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={IRON_BUTTON}
              disabled={busy || tooShort || triesOut}
              onClick={handleFeedback}
            >
              {t("getFeedback")}
            </button>
            <button
              type="button"
              className={GOLD_BUTTON}
              disabled={busy || !feedback}
              onClick={handleSubmit}
            >
              {t("submitAnswer")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
