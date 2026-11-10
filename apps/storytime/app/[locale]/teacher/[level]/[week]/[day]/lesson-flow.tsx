"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { StorytimeWeek } from "../../../../../../lib/contracts/week";
import {
  hasSignedMedia,
  stepMediaOf,
  type StepMedia,
} from "../../../../../../lib/teacher-media";
import { StorytimeDecodable } from "../../../../st/[level]/[week]/decodable";
import { StorytimeReader } from "../../../../st/[level]/[week]/reader";
import { StorytimeSong } from "../../../../st/[level]/[week]/song";

/**
 * The teacher lesson flow (plan task 4.3, spec FR-9, AC-9.2).
 *
 * The route `/<locale>/teacher/<level>/<week>/<day>` shows one lesson day of the week to the
 * teacher. The first screen holds the opening routine, the review strip of the day, and the first
 * step of the day. Each later screen holds one step. The last screen of day 5 holds the Friday
 * check of the week.
 *
 * A step screen shows the id of the step, its title, its minutes, the four headings of the
 * teacher note, and the three variant lines. The control "Next step" moves to the next screen,
 * and the last screen holds no such control.
 *
 * A step with media holds the control "Open media" (plan task 4.4, rule D1). The control opens
 * the at-home player of the week in class-screen mode, and the flow stays open, so the teacher
 * keeps the place of the step. The control "Close" and the Escape key close the player, and the
 * focus returns to the control that opened it.
 *
 * Every value comes from the week file. The view holds no string that names a week item, so the
 * flow of a draft week and the flow of a published week differ only by their data.
 *
 * The view uses no next-intl hook, the same as the teacher week view of task 4.2. The control
 * "ไทย" switches every `{ en, th }` field of the flow to its Thai text.
 */

/** One step of a lesson day. */
type LessonStep = StorytimeWeek["scripts"][number]["steps"][number];

/** One teacher note of a step. */
type LessonNote = StorytimeWeek["scripts"][number]["steps"][number]["en"];

/** One item of the Friday check. */
type CheckItem = StorytimeWeek["check"]["items"][number];

/** The state of the media player of a step. */
type PlayerState = "closed" | "open" | "missing";

/** One text with its Thai. */
interface Bilingual {
  /** The English text. */
  en: string;
  /** The Thai text. An empty text means "not yet". */
  th: string;
}

/** The four headings of a teacher note (spec FR-9). */
const STEP_HEADINGS = [
  { key: "teacherActions", label: "What the teacher does" },
  { key: "teacherLanguage", label: "What the teacher says" },
  { key: "studentActions", label: "What the students do" },
  { key: "watchFor", label: "What to watch" },
] as const;

/** The three variant lines of a step (spec FR-9). */
const VARIANT_LINES = [
  { key: "easier", label: "Easier" },
  { key: "harder", label: "Harder" },
  { key: "group", label: "Group" },
] as const;

/** The accessible name of the player region. */
const PLAYER_REGION = "The media player";

/** The English message of a media part with no signed URL. */
const MEDIA_MISSING_EN = "This media is not available.";

/** The Thai message of a media part with no signed URL. */
const MEDIA_MISSING_TH = "สื่อนี้ยังไม่พร้อม";

/** The English labels of the read-along controls. */
const READER_LABELS = {
  readToMe: "Read it to me",
  myTurn: "My turn",
  slow: "Slow",
  previousPage: "Previous page",
  nextPage: "Next page",
  audioError: "The sound could not be played.",
  finished: "The book is finished.",
  playing: "Playing",
};

/**
 * Picks the text of a bilingual field in the language of the flow.
 * @param value The field with its English text and its Thai text.
 * @param thai `true` when the Thai toggle is on.
 * @returns The Thai text when the toggle is on and the Thai text exists, and the English text
 *   otherwise.
 */
function pick(value: Bilingual, thai: boolean): string {
  if (!thai) return value.en;
  return value.th.trim() === "" ? value.en : value.th;
}

/**
 * Picks the teacher note of a step in the language of the flow.
 * @param step The step of the day.
 * @param thai `true` when the Thai toggle is on.
 * @returns The Thai note when the toggle is on and the step holds one, and the English note
 *   otherwise.
 */
function noteOf(step: LessonStep, thai: boolean): LessonNote {
  if (!thai) return step.en;
  return step.th ?? step.en;
}

/**
 * Renders the at-home player of one media part in class-screen mode.
 * @param props.media The media part of the step.
 * @param props.week The week of the lesson day.
 * @param props.locale The locale segment of the route.
 * @param props.mediaUrls The signed URLs of the week.
 * @returns The player of the media part.
 */
function MediaPart({
  media,
  week,
  locale,
  mediaUrls,
}: {
  media: StepMedia;
  week: StorytimeWeek;
  locale: string;
  mediaUrls: Record<string, string>;
}) {
  if (media.kind === "song") {
    const song = week.song;
    if (!song) return null;
    return (
      <StorytimeSong song={song} mediaUrls={mediaUrls} playerMode="class-screen" />
    );
  }
  if (media.kind === "readalong") {
    const book = week.books.find(
      (entry) => entry.kind === "readalong" && entry.title === media.title,
    );
    if (!book) return null;
    return (
      <StorytimeReader
        book={book}
        locale={locale}
        labels={READER_LABELS}
        mediaUrls={mediaUrls}
        playerMode="class-screen"
      />
    );
  }
  return (
    <StorytimeDecodable
      week={week}
      locale={locale}
      mediaUrls={mediaUrls}
      playerMode="class-screen"
    />
  );
}

/** The props of the teacher lesson flow. */
export interface TeacherLessonFlowProps {
  /** The week of the lesson day. */
  week: StorytimeWeek;
  /** The lesson day, 1 to 5. */
  day: number;
  /** The locale segment of the route. */
  locale: string;
  /** The signed media URL of each file name. */
  mediaUrls?: Record<string, string>;
}

/** The props of the step view. */
interface StepViewProps {
  /** The step of the day. */
  step: LessonStep;
  /** The 0-based place of the step among the steps of the day. */
  index: number;
  /** `true` when the Thai toggle is on. */
  thai: boolean;
  /** The media part of the step, or `null` when the step opens no player. */
  media: StepMedia | null;
  /** The signed media URL of each file name. */
  mediaUrls: Record<string, string>;
  /** The state of the media player. */
  player: PlayerState;
  /** The control that opens the player. */
  openerRef: RefObject<HTMLButtonElement | null>;
  /** The action that opens the player. */
  onOpen: () => void;
  /** The action that closes the player. */
  onClose: () => void;
  /** The week of the lesson day. */
  week: StorytimeWeek;
  /** The locale segment of the route. */
  locale: string;
}

/**
 * Renders one step of the lesson day.
 * @param props The props of the step view.
 * @returns The step of the day.
 */
function StepView({
  step,
  index,
  thai,
  media,
  mediaUrls,
  player,
  openerRef,
  onOpen,
  onClose,
  week,
  locale,
}: StepViewProps) {
  const note = noteOf(step, thai);
  return (
    <section
      aria-label={`The step ${step.id}`}
      data-step-id={step.id}
      data-step-index={index}
      className="flex flex-col gap-4"
    >
      <header className="flex flex-wrap items-baseline gap-3">
        <span className="rounded-full border border-[#92400e] bg-[#fcd34d] px-3 py-1 text-lg text-[#92400e]">
          {step.id}
        </span>
        <h2 className="text-2xl font-semibold" lang={thai ? "th" : "en"}>
          {pick(step.title, thai)}
        </h2>
        <span className="text-lg text-neutral-600">{step.minutes} min</span>
      </header>

      {media ? (
        <div className="flex flex-col gap-3">
          <button
            ref={openerRef}
            type="button"
            onClick={onOpen}
            className="w-fit rounded-xl border border-[#92400e] bg-[#fcd34d] px-4 py-2 text-[#92400e]"
          >
            Open media
          </button>
          {player === "missing" ? (
            <p role="alert" className="text-lg text-[#92400e]">
              <span lang="en">{MEDIA_MISSING_EN}</span>{" "}
              <span lang="th">{MEDIA_MISSING_TH}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {player === "open" && media ? (
        <section
          aria-label={PLAYER_REGION}
          className="flex flex-col gap-3 rounded-2xl border border-[#92400e] bg-[#fffaf0] p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-semibold" lang="en">
              {media.title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#92400e] bg-[#92400e] px-4 py-2 text-white"
            >
              Close
            </button>
          </div>
          <MediaPart media={media} week={week} locale={locale} mediaUrls={mediaUrls} />
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {STEP_HEADINGS.map((heading) => (
          <section
            key={heading.key}
            className="flex flex-col gap-2 rounded-2xl border border-[#92400e] p-4"
          >
            <h3 className="text-lg font-semibold">{heading.label}</h3>
            <ul className="flex flex-col gap-1">
              {note[heading.key].map((line, index) => (
                <li key={index} className="text-lg">
                  {line}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {VARIANT_LINES.map((variant) => (
          <section
            key={variant.key}
            className="flex flex-col gap-2 rounded-2xl border border-[#92400e] p-4"
          >
            <h3 className="text-lg font-semibold">{variant.label}</h3>
            <p className="text-lg" lang={thai ? "th" : "en"}>
              {pick(step[variant.key], thai)}
            </p>
          </section>
        ))}
      </div>
    </section>
  );
}

/**
 * Renders one item of the Friday check.
 * @param props.item The item of the check.
 * @returns The item of the check.
 */
function CheckItemView({ item }: { item: CheckItem }) {
  if (item.kind === "circle-picture") {
    return (
      <>
        <span className="font-semibold">{item.sound}</span>
        <span>Circle the {item.position} picture: {item.pictures.join(", ")}</span>
        <span>The answer is {item.answer}.</span>
      </>
    );
  }
  if (item.kind === "write-word") {
    return (
      <>
        <span className="font-semibold">Write the word</span>
        <span>{item.word}</span>
      </>
    );
  }
  if (item.kind === "write-letter") {
    return (
      <>
        <span className="font-semibold">Write the letter</span>
        <span>{item.letter}</span>
      </>
    );
  }
  if (item.kind === "picture-sort") {
    return (
      <>
        <span className="font-semibold">Sort the pictures into {item.groups.length} groups</span>
        {item.groups.map((group, index) => (
          <span key={index}>
            {group.sound}: {group.pictures.join(", ")}
          </span>
        ))}
      </>
    );
  }
  return (
    <>
      <span>Circle the word: {item.words.join(", ")}</span>
      <span>The answer is {item.answer}.</span>
    </>
  );
}

/**
 * Renders the Friday check of the week.
 * @param props.items The items of the check.
 * @returns The Friday check.
 */
function CheckView({ items }: { items: CheckItem[] }) {
  return (
    <section aria-label="The Friday check" className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">The Friday check</h2>
      <ol className="flex flex-col gap-3">
        {items.map((item, index) => (
          <li
            key={index}
            className="flex flex-col gap-2 rounded-2xl border border-[#92400e] p-4"
          >
            <CheckItemView item={item} />
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Renders the lesson day of the teacher.
 * @param props.week The week of the lesson day.
 * @param props.day The lesson day, 1 to 5.
 * @param props.locale The locale segment of the route.
 * @param props.mediaUrls The signed media URL of each file name.
 * @returns The lesson flow of the day.
 */
export function TeacherLessonFlow({
  week,
  day,
  locale,
  mediaUrls = {},
}: TeacherLessonFlowProps) {
  const [screen, setScreen] = useState(0);
  const [thai, setThai] = useState(false);
  const [player, setPlayer] = useState<PlayerState>("closed");
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const script = week.scripts.find((entry) => entry.day === day);
  const steps = script?.steps ?? [];
  const strip = week.review.find((entry) => entry.day === day);
  const step = steps[screen];
  const last = screen >= steps.length - 1;
  const media = step ? stepMediaOf(step, week) : null;
  const available = media !== null && hasSignedMedia(media, mediaUrls);

  // The Escape key closes the open player, and the focus returns to the control that opened it.
  useEffect(() => {
    if (player !== "open") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPlayer("closed");
      openerRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [player]);

  /**
   * Opens the player of the media part of the step. A part with no signed URL opens no player,
   * and the flow shows the missing media message.
   */
  function openMedia(): void {
    if (!media) return;
    if (!available) {
      setPlayer("missing");
      return;
    }
    setPlayer("open");
  }

  /** Closes the player and gives the focus back to the control that opened it. */
  function closeMedia(): void {
    setPlayer("closed");
    openerRef.current?.focus();
  }

  /** Moves to the next screen of the day and closes the player. */
  function nextScreen(): void {
    setPlayer("closed");
    setScreen((value) => value + 1);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold" lang={thai ? "th" : "en"}>
            {script ? pick(script.title, thai) : ""}
          </h1>
          <p className="text-neutral-600">Day {day}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setThai((value) => !value)}
            aria-pressed={thai}
            className="rounded-xl border border-[#92400e] bg-[#fcd34d] px-4 py-2 text-[#92400e]"
          >
            ไทย
          </button>
          <Link
            href={`/${locale}/teacher/${week.meta.level}/${week.meta.week}`}
            className="rounded-xl border border-[#92400e] bg-[#92400e] px-4 py-2 text-white"
          >
            Back to the week
          </Link>
        </div>
      </header>

      {screen === 0 ? (
        <>
          <section aria-label="The opening routine" className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">The opening routine</h2>
            <ol className="flex flex-col gap-2">
              {(week.opening?.pa ?? []).map((prompt, index) => (
                <li
                  key={index}
                  className="rounded-2xl border border-[#92400e] p-4 text-lg"
                  lang={thai ? "th" : "en"}
                >
                  {pick(prompt, thai)}
                </li>
              ))}
            </ol>
          </section>

          <section aria-label="The review strip" className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">The review strip</h2>
            <ul className="flex flex-wrap gap-2">
              {(strip?.cards ?? []).map((card, index) => (
                <li
                  key={index}
                  className="rounded-full border border-[#92400e] bg-[#fcd34d] px-4 py-2 text-lg text-[#92400e]"
                >
                  {card.text}
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}

      {step ? (
        <StepView
          step={step}
          index={screen}
          thai={thai}
          media={media}
          mediaUrls={mediaUrls}
          player={player}
          openerRef={openerRef}
          onOpen={openMedia}
          onClose={closeMedia}
          week={week}
          locale={locale}
        />
      ) : null}

      {day === 5 && last ? <CheckView items={week.check.items} /> : null}

      {last ? null : (
        <div>
          <button
            type="button"
            onClick={nextScreen}
            className="w-fit rounded-xl border border-[#92400e] bg-[#92400e] px-4 py-2 text-white"
          >
            Next step
          </button>
        </div>
      )}
    </main>
  );
}
