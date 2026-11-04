"use client";

/**
 * The question screen of the at-home read-along (plan task 3.9, spec FR-13, AC-13.6).
 *
 * The screen shows the picture of each distinct answer page one time. A right tap marks the picture
 * and moves to the next question. A wrong tap shows a gentle mark and stays, with no sound. The skip
 * control ends the screen. The end shows the three tiles of the week page.
 */
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { questionChoices, type BookQuestion, type QuestionPage } from "../../../../../lib/questions";

/** One entry tile of the week page, as the end of the question screen shows it. */
export interface QuestionTile {
  /** The tile id. */
  id: string;
  /** The link of the tile, as the week page builds it. */
  href: string;
  /** The visible tile label. */
  label: string;
  /** The tile picture, relative to the media base. */
  pictureFile?: string;
  /** The alt text of the tile picture. */
  pictureAlt: string;
}

/** The translated labels of the question screen. */
export interface QuestionLabels {
  /** The skip control. */
  skip: string;
  /** The right mark. */
  right: string;
  /** The gentle mark of a wrong tap. */
  gentle: string;
}

/** The props of the question screen. */
interface StorytimeQuestionsProps {
  /** The questions of the read-along book, in book order. */
  questions: BookQuestion[];
  /** The pages of the read-along book. */
  pages: QuestionPage[];
  /** The three tiles of the week page. */
  tiles: QuestionTile[];
  /** The page language. */
  locale: string;
  /** The translated labels. */
  labels: QuestionLabels;
  /** The media base URL; the default is `/media`. */
  mediaBase?: string;
}

/** One mark of a choice. */
type QuestionMark = "right" | "gentle";

/**
 * Builds the URL of one recorded or picture file.
 * @param base The media base URL.
 * @param file The file, relative to the base.
 * @returns The URL, with one slash between the base and the file.
 */
function mediaUrl(base: string, file: string): string {
  return `${base.replace(/\/+$/, "")}/${file.replace(/^\/+/, "")}`;
}

/**
 * Renders the question screen of the read-along (spec FR-13).
 * @param props See `StorytimeQuestionsProps`.
 * @returns The question, its picture choices, the skip control, or the end view.
 */
export function StorytimeQuestions({
  questions,
  pages,
  tiles,
  locale,
  labels,
  mediaBase = "/media",
}: StorytimeQuestionsProps) {
  const choices = useMemo(() => questionChoices(questions, pages), [questions, pages]);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const [marks, setMarks] = useState<Record<number, QuestionMark>>({});
  const [ended, setEnded] = useState(false);
  const endedRef = useRef(false);
  const question = questions[index];

  /**
   * Ends the screen and shows the three tiles of the week page.
   */
  function endScreen(): void {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
  }

  /**
   * Marks one choice and moves to the next question after a right tap.
   * @param page The page of the tapped choice.
   */
  function choose(page: number): void {
    if (endedRef.current) return;
    const current = questions[indexRef.current];
    if (!current) return;
    if (page !== current.answer.page) {
      setMarks((previous) => ({ ...previous, [page]: "gentle" }));
      return;
    }
    setMarks((previous) => ({ ...previous, [page]: "right" }));
    if (indexRef.current + 1 >= questions.length) {
      endScreen();
      return;
    }
    indexRef.current += 1;
    setIndex(indexRef.current);
  }

  if (ended) {
    return (
      <section data-question-screen data-question-end className="flex flex-col gap-4">
        <ul className="flex flex-col gap-3">
          {tiles.map((tile) => (
            <li key={tile.id}>
              <Link
                href={tile.href}
                className="flex min-h-16 items-center gap-3 rounded-2xl border border-neutral-300 p-3"
              >
                {tile.pictureFile ? (
                  <img
                    src={mediaUrl(mediaBase, tile.pictureFile)}
                    alt={tile.pictureAlt}
                    loading="lazy"
                    decoding="async"
                    className="h-20 w-20 rounded-xl object-cover"
                  />
                ) : null}
                <span className="text-lg font-semibold" lang="en">
                  {tile.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (!question) return null;

  return (
    <section
      data-question-screen
      lang={locale === "th" ? "th" : "en"}
      aria-live="polite"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <p className="text-lg font-semibold" lang="en">
          {question.ask.en}
        </p>
        {question.ask.th.trim() ? (
          <p className="text-base" lang="th">
            {question.ask.th}
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {choices.map((choice) => {
          const mark = marks[choice.page];
          return (
            <button
              key={choice.page}
              type="button"
              data-choice-page={choice.page}
              data-mark={mark}
              aria-pressed={mark === "right" ? true : mark === "gentle" ? false : undefined}
              onClick={() => choose(choice.page)}
              className="flex min-h-16 min-w-16 flex-col items-center gap-2 rounded-2xl border border-neutral-300 p-2"
            >
              {choice.file ? (
                <img
                  src={mediaUrl(mediaBase, choice.file)}
                  alt={choice.caption}
                  loading="lazy"
                  decoding="async"
                  className="h-28 w-full rounded-xl object-cover"
                />
              ) : null}
              {mark ? (
                <span
                  aria-hidden="true"
                  className={mark === "right" ? "text-2xl text-green-700" : "text-2xl text-amber-700"}
                >
                  {mark === "right" ? "✓" : "↺"}
                </span>
              ) : null}
              {mark ? (
                <span className="sr-only">{mark === "right" ? labels.right : labels.gentle}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={endScreen}
        className="min-h-12 rounded-xl border border-neutral-300 px-4"
      >
        {labels.skip}
      </button>
    </section>
  );
}
