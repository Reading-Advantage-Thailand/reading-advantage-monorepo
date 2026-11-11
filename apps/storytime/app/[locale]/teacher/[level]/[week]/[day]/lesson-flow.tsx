"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { StorytimeWeek } from "../../../../../../lib/contracts/week";
import { loopsApproved } from "../../../../../../lib/loops";
import { loopPanelsShow, loopsShow, stepTimeMinutes } from "../../../../../../lib/teacher-loops";
import {
  shareShotsAt,
  SHARE_CONSENT_LINE,
  SHARE_MEDIA_LABELS,
  type ShareMoment,
  type ShareShot,
} from "../../../../../../lib/share-moment";
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
 * A step of an approved week holds the share moment (plan task 4.6a, rule D23). The moment
 * shows at the steps that its shots name, with the caption and the consent line in the language
 * of the flow; two shots on one step both render. The moment shows only when the loops part of
 * the week is approved, and it shows only at a step of its own day. The app sends no photo and
 * no video.
 *
 * An approved week of level 2, 3, or 4 holds the teacher loops (plan task 4.6, spec AC-13.7 and
 * AC-13.8). The opening screen shows the recall cards of the day, a step field shows its loop
 * panel by the field, and the step time is `loopMinutes ?? minutes`. A review week holds only
 * the recall and the step time. Every clip plays from the signed map, nothing autoplays, and
 * one clip plays at a time: a new click stops the last clip, and "Next step" stops the clip.
 *
 * Every value comes from the week file. The view holds no string that names a week item, so the
 * flow of a draft week and the flow of a published week differ only by their data.
 *
 * The view uses no next-intl hook, the same as the teacher week view of task 4.2. The control
 * "ไทย" switches every `{ en, th }` field of the flow to its Thai text.
 */

/** One step of a lesson day. */
type LessonStep = StorytimeWeek["scripts"][number]["steps"][number];

/** One lesson day. */
type LessonScript = StorytimeWeek["scripts"][number];

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

/** The accessible name of the share moment region. */
const SHARE_MOMENT_REGION = "The share moment";

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
 * Picks the language mark of a bilingual field in the language of the text that shows.
 *
 * An empty Thai text falls back to the English text, so the mark follows the text that shows
 * and not the toggle (review finding F433a).
 * @param value The field with its English text and its Thai text.
 * @param thai `true` when the Thai toggle is on.
 * @returns `"th"` when the Thai text shows, and `"en"` when the English text shows.
 */
function pickLang(value: Bilingual, thai: boolean): "th" | "en" {
  return pick(value, thai) === value.th && thai ? "th" : "en";
}

/**
 * Picks the language mark of each teacher-note array of a step.
 *
 * Each of the four arrays falls back on its own (review finding F404), so a mark follows the
 * array that supplies the lines: an empty Thai array keeps the English mark (review finding
 * F433a).
 * @param step The step of the day.
 * @param thai `true` when the Thai toggle is on.
 * @returns For each heading key, `"th"` when the Thai array supplies the lines, and `"en"`
 *   when the English array supplies them.
 */
function noteLangsOf(step: LessonStep, thai: boolean): Record<keyof LessonNote, "th" | "en"> {
  const mark = (lines: string[] | undefined): "th" | "en" =>
    thai && step.th && (lines?.length ?? 0) > 0 ? "th" : "en";
  return {
    teacherActions: mark(step.th?.teacherActions),
    teacherLanguage: mark(step.th?.teacherLanguage),
    studentActions: mark(step.th?.studentActions),
    watchFor: mark(step.th?.watchFor),
  };
}

/** One run of a split text: Thai script, or other text. */
export interface TextRun {
  /** The characters of the run. */
  text: string;
  /** `true` when the run is Thai script (Unicode block U+0E00 to U+0E7F). */
  thai: boolean;
}

/**
 * Splits a string into runs of Thai script and other text (review finding F671).
 *
 * The English teacher notes quote Thai letters as sound guides, so an English line can hold
 * Thai runs. The flow and the week view render each Thai run in its own element with
 * `lang="th"`, so a screen reader reads the run with the Thai voice (WCAG 3.1.2).
 * @param text The text to split.
 * @returns One run per block of Thai script or other text, in order; empty for an empty text.
 */
export function splitThaiRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];
  for (const char of text) {
    const thai = char >= "\u0E00" && char <= "\u0E7F";
    const last = runs[runs.length - 1];
    if (last && last.thai === thai) last.text += char;
    else runs.push({ text: char, thai });
  }
  return runs;
}

/**
 * Renders a text in one language, and wraps every Thai run of an English text in a span with
 * `lang="th"` (review finding F671).
 *
 * A Thai text renders as one plain run, because its element already carries `lang="th"`. An
 * English text renders as plain runs with each Thai run wrapped, so the Thai run reads with
 * the Thai voice and the English runs read with the voice of the English element around them.
 * @param props.text The text to render.
 * @param props.lang The language of the text, as the element around it marks it.
 * @returns The runs of the text.
 */
export function LanguageRuns({
  text,
  lang,
}: {
  text: string;
  lang: "en" | "th";
}) {
  if (lang === "th") return <>{text}</>;
  return (
    <>
      {splitThaiRuns(text).map((run, index) =>
        run.thai ? (
          <span key={index} lang="th">
            {run.text}
          </span>
        ) : (
          run.text
        ),
      )}
    </>
  );
}

/**
 * Picks the teacher note of a step in the language of the flow.
 *
 * Each of the four arrays falls back on its own: an empty Thai array keeps the English array
 * (review finding F404), so a partial Thai note shows no empty heading.
 * @param step The step of the day.
 * @param thai `true` when the Thai toggle is on.
 * @returns The note of the step in the language of the flow.
 */
function noteOf(step: LessonStep, thai: boolean): LessonNote {
  if (!thai || !step.th) return step.en;
  const th = step.th;
  const take = (thLines: string[], enLines: string[]): string[] =>
    thLines.length > 0 ? thLines : enLines;
  return {
    teacherActions: take(th.teacherActions, step.en.teacherActions),
    teacherLanguage: take(th.teacherLanguage, step.en.teacherLanguage),
    studentActions: take(th.studentActions, step.en.studentActions),
    watchFor: take(th.watchFor, step.en.watchFor),
  };
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
      week={decodableWeekOf(week, media.title)}
      locale={locale}
      mediaUrls={mediaUrls}
      playerMode="class-screen"
    />
  );
}

/**
 * Narrows the week to the decodable book that the media title names.
 *
 * `StorytimeDecodable` shows the first decodable book of the week it gets. The teacher flow
 * picks the book by the title of the materials entry (rule D1), so the flow hands the player a
 * week whose books hold only that book. A week with two decodables then opens the titled book,
 * not the first one (review finding F414).
 * @param week The week of the lesson day.
 * @param title The book title that the step names.
 * @returns The week with the titled decodable book only.
 */
function decodableWeekOf(week: StorytimeWeek, title: string): StorytimeWeek {
  const book = week.books.find((entry) => entry.kind === "decodable" && entry.title === title);
  return book ? { ...week, books: [book] } : week;
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

/**
 * Renders the share moment of one shot (plan task 4.6a, rule D23).
 *
 * The moment names the shot with the id of the step and the kind of the media. It shows the
 * label of the kind and the caption of the day in the language of the flow, and the consent
 * line when the prop asks for it. The moment holds no control and sends nothing. The consent
 * line is a statement for the whole step, so the flow renders it once, in the last moment of
 * the step (review finding F434).
 * @param props.share The share part of the day.
 * @param props.shot The shot of the step.
 * @param props.thai `true` when the Thai toggle is on.
 * @param props.consent `true` when the moment holds the consent line of the step.
 * @returns The share moment of the shot.
 */
function ShareMomentView({
  share,
  shot,
  thai,
  consent,
}: {
  share: ShareMoment;
  shot: ShareShot;
  thai: boolean;
  consent: boolean;
}) {
  const labels = SHARE_MEDIA_LABELS[shot.media];
  return (
    <section
      aria-label={SHARE_MOMENT_REGION}
      data-share-moment={shot.step}
      data-share-media={shot.media}
      className="flex flex-col gap-2 rounded-2xl border border-[#92400e] bg-[#fffaf0] p-4"
    >
      <h3 className="text-lg font-semibold" data-share-label lang={pickLang(labels, thai)}>
        <LanguageRuns text={pick(labels, thai)} lang={pickLang(labels, thai)} />
      </h3>
      <p className="text-lg" lang={pickLang(share.caption, thai)}>
        <LanguageRuns text={pick(share.caption, thai)} lang={pickLang(share.caption, thai)} />
      </p>
      {consent ? (
        <p className="text-neutral-700" lang={pickLang(SHARE_CONSENT_LINE, thai)}>
          <LanguageRuns text={pick(SHARE_CONSENT_LINE, thai)} lang={pickLang(SHARE_CONSENT_LINE, thai)} />
        </p>
      ) : null}
    </section>
  );
}

/**
 * Renders the play control of one bank clip.
 *
 * The control shows only when the signed map holds the file. The control plays nothing on
 * render; a click hands the signed URL to the flow, which plays one clip at a time and stops
 * the last clip (review finding F405). The accessible name starts with the visible text
 * "Play clip" and then holds the word and the sound, or the card text, so a speech-input user
 * matches the name and the controls of a drill stay apart (review findings F401 and F441).
 * @param props.file The bank file of the clip.
 * @param props.mediaUrls The signed media URL of each file name.
 * @param props.label The accessible name of the control.
 * @param props.onPlay The action that plays one clip of the flow.
 * @returns The clip control, or `null` when the map holds no signed URL.
 */
function ClipControl({
  file,
  mediaUrls,
  label,
  onPlay,
}: {
  file: string;
  mediaUrls: Record<string, string>;
  label: string;
  onPlay: (url: string) => void;
}) {
  const url = mediaUrls[file];
  if (!url) return null;
  return (
    <button
      type="button"
      data-clip-path={file}
      data-clip-url={url}
      aria-label={label}
      onClick={() => onPlay(url)}
      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[#92400e] bg-[#fcd34d] px-3 text-[#92400e]"
    >
      <span lang="en">Play clip</span>
    </button>
  );
}

/** The props of the recall view. */
interface RecallViewProps {
  /** The lesson day, 1 to 5. */
  day: number;
  /** The recall of the day. */
  recall: NonNullable<LessonScript["recall"]>;
  /** `true` when the Thai toggle is on. */
  thai: boolean;
  /** The signed media URL of each file name. */
  mediaUrls: Record<string, string>;
  /** The action that plays one clip of the flow. */
  onPlay: (url: string) => void;
}

/**
 * Renders the recall cards of a lesson day (plan task 4.6, spec AC-13.7).
 *
 * The view shows the ask line of the day and one card for each item, with the play control of
 * the recording of the card when the signed map holds the file.
 * @param props The props of the recall view.
 * @returns The recall region of the day.
 */
function RecallView({ day, recall, thai, mediaUrls, onPlay }: RecallViewProps) {
  return (
    <section
      aria-label="The recall cards"
      data-recall-day={day}
      className="flex flex-col gap-3 rounded-2xl border border-[#92400e] bg-[#fffaf0] p-4"
    >
      <h2 className="text-xl font-semibold" lang="en">
        The recall cards
      </h2>
      <p className="text-lg" lang={pickLang(recall.ask, thai)}>
        <LanguageRuns text={pick(recall.ask, thai)} lang={pickLang(recall.ask, thai)} />
      </p>
      <ul className="flex flex-wrap gap-2">
        {recall.items.map((card, index) => (
          <li
            key={index}
            data-recall-card={index}
            lang="en"
            className="flex items-center gap-2 rounded-full border border-[#92400e] bg-[#fcd34d] px-4 py-2 text-lg text-[#92400e]"
          >
            <LanguageRuns text={card.text} lang="en" />
            {card.audio ? (
              <ClipControl
                file={card.audio}
                mediaUrls={mediaUrls}
                label={`Play clip: the recording of ${card.text}`}
                onPlay={onPlay}
              />
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
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
  /** The share of the lesson day, or `null` when the week holds none. */
  share: ShareMoment | null;
  /** The shots of the step, in the order of the week; empty when no shot names the step. */
  shots: ShareShot[];
  /** `true` when the loops of the week show, so the step shows the loop minutes. */
  loops: boolean;
  /** `true` when the loop panels show, so a step field shows its panel. */
  panels: boolean;
  /** The action that plays one clip of the flow. */
  onPlay: (url: string) => void;
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
  share,
  shots,
  loops,
  panels,
  onPlay,
}: StepViewProps) {
  const note = noteOf(step, thai);
  const noteLangs = noteLangsOf(step, thai);
  const drill = panels ? (step.blendDrill ?? null) : null;
  const sound = panels ? (step.soundLoop ?? null) : null;
  const sight = panels ? (step.sightWords ?? null) : null;
  const mediaDescriptionId = `open-media-title-${step.id}`;
  return (
    <section
      aria-label={`The step ${step.id}`}
      data-step-id={step.id}
      data-step-index={index}
      className="flex flex-col gap-4"
    >
      <header className="flex flex-wrap items-baseline gap-3">
        <span
          className="rounded-full border border-[#92400e] bg-[#fcd34d] px-3 py-1 text-lg text-[#92400e]"
          lang="en"
        >
          {step.id}
        </span>
        <h2 className="text-2xl font-semibold" lang={pickLang(step.title, thai)}>
          <LanguageRuns text={pick(step.title, thai)} lang={pickLang(step.title, thai)} />
        </h2>
        <span className="text-lg text-neutral-600" lang="en">
          {stepTimeMinutes(step, loops)} min
        </span>
      </header>

      {sound ? (
        <section
          data-loop="sound-loop"
          className="flex flex-col gap-2 rounded-2xl border border-[#92400e] bg-[#fcd34d] p-4 text-[#92400e]"
        >
          <h3 className="text-lg font-semibold" lang="en">
            The sound loop
          </h3>
          <p className="text-lg" lang={pickLang(sound.correct, thai)}>
            <LanguageRuns text={pick(sound.correct, thai)} lang={pickLang(sound.correct, thai)} />
          </p>
          <p className="text-lg" lang={pickLang(sound.practise, thai)}>
            <LanguageRuns text={pick(sound.practise, thai)} lang={pickLang(sound.practise, thai)} />
          </p>
          <p className="text-lg" lang={pickLang(sound.retest, thai)}>
            <LanguageRuns text={pick(sound.retest, thai)} lang={pickLang(sound.retest, thai)} />
          </p>
        </section>
      ) : null}

      {drill ? (
        <section
          data-loop="blend-drill"
          data-drill-repeats={drill.repeats}
          className="flex flex-col gap-2 rounded-2xl border border-[#92400e] bg-[#fcd34d] p-4 text-[#92400e]"
        >
          <h3 className="text-lg font-semibold" lang="en">
            The blend drill
          </h3>
          <p className="text-lg" lang={pickLang(drill.model, thai)}>
            <LanguageRuns text={pick(drill.model, thai)} lang={pickLang(drill.model, thai)} />
          </p>
          <p className="text-lg" lang={pickLang(drill.lead, thai)}>
            <LanguageRuns text={pick(drill.lead, thai)} lang={pickLang(drill.lead, thai)} />
          </p>
          <p className="text-lg" lang={pickLang(drill.test, thai)}>
            <LanguageRuns text={pick(drill.test, thai)} lang={pickLang(drill.test, thai)} />
          </p>
          <p className="text-lg" lang={pickLang(drill.correction, thai)}>
            <LanguageRuns text={pick(drill.correction, thai)} lang={pickLang(drill.correction, thai)} />
          </p>
          <ul className="flex flex-col gap-1">
            {drill.words.map((word, wordIndex) => (
              <li key={wordIndex} className="flex flex-wrap items-center gap-2 text-lg">
                <span className="font-semibold" lang="en">
                  <LanguageRuns text={word.word} lang="en" />
                </span>
                <span lang="en">
                  <LanguageRuns text={word.sounds.join(" ")} lang="en" />
                </span>
                {(word.audio ?? []).map((file, soundIndex) => (
                  <ClipControl
                    key={`${file}-${soundIndex}`}
                    file={file}
                    mediaUrls={mediaUrls}
                    label={`Play clip: ${word.sounds[soundIndex] ?? word.sounds[0] ?? ""} of ${word.word}`}
                    onPlay={onPlay}
                  />
                ))}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sight ? (
        <section
          data-loop="sight-words"
          data-sight-seconds={sight.seconds}
          className="flex flex-col gap-2 rounded-2xl border border-[#92400e] bg-[#92400e] p-4 text-white"
        >
          <h3 className="text-lg font-semibold" lang="en">
            The sight words
          </h3>
          <p className="text-lg" lang="en">
            <LanguageRuns text={sight.words.join(" · ")} lang="en" />
          </p>
          <p className="text-lg" lang={pickLang(sight.slide, thai)}>
            <LanguageRuns text={pick(sight.slide, thai)} lang={pickLang(sight.slide, thai)} />
          </p>
          <p className="text-lg" lang={pickLang(sight.check, thai)}>
            <LanguageRuns text={pick(sight.check, thai)} lang={pickLang(sight.check, thai)} />
          </p>
        </section>
      ) : null}

      {share && shots.length > 0
        ? shots.map((shot, shotIndex) => (
            <ShareMomentView
              key={shotIndex}
              share={share}
              shot={shot}
              thai={thai}
              consent={shotIndex === shots.length - 1}
            />
          ))
        : null}

      {media ? (
        <div className="flex flex-col gap-3">
          <button
            ref={openerRef}
            type="button"
            onClick={onOpen}
            aria-describedby={mediaDescriptionId}
            className="min-h-11 w-fit rounded-xl border border-[#92400e] bg-[#fcd34d] px-4 py-2 text-[#92400e]"
          >
            <span lang="en">Open media</span>
          </button>
          <span id={mediaDescriptionId} className="sr-only" lang="en">
            <LanguageRuns text={media.title} lang="en" />
          </span>
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
              <LanguageRuns text={media.title} lang="en" />
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-xl border border-[#92400e] bg-[#92400e] px-4 py-2 text-white"
            >
              <span lang="en">Close</span>
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
            <h3 className="text-lg font-semibold" lang="en">
              {heading.label}
            </h3>
            <ul className="flex flex-col gap-1">
              {note[heading.key].map((line, index) => (
                <li key={index} className="text-lg" lang={noteLangs[heading.key]}>
                  <LanguageRuns text={line} lang={noteLangs[heading.key]} />
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
            <h3 className="text-lg font-semibold" lang="en">
              {variant.label}
            </h3>
            <p className="text-lg" lang={pickLang(step[variant.key], thai)}>
              <LanguageRuns text={pick(step[variant.key], thai)} lang={pickLang(step[variant.key], thai)} />
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
    <section aria-label="The Friday check" className="flex flex-col gap-3" lang="en">
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
  // The focus target of the last screen of the day (review finding F421d).
  const endRef = useRef<HTMLDivElement | null>(null);
  // `true` after the first "Next step" press, so the focus move never runs on first render
  // (review finding F483).
  const movedRef = useRef(false);
  // One audio element at a time: a new click stops the last clip (review finding F405).
  const clipAudioRef = useRef<HTMLAudioElement | null>(null);

  const script = week.scripts.find((entry) => entry.day === day);
  const steps = script?.steps ?? [];
  const strip = week.review.find((entry) => entry.day === day);
  const step = steps[screen];
  const last = screen >= steps.length - 1;
  const media = step ? stepMediaOf(step, week) : null;
  const available = media !== null && hasSignedMedia(media, mediaUrls);
  // The share moment shows only when the loops part of the week is approved (rule D23).
  const share = loopsApproved(week) ? (script?.share ?? null) : null;
  // Every shot that names the step shows, so two shots on one step both render (F408).
  const shots = shareShotsAt(share ?? undefined, step?.id);
  const openingPrompts = week.opening?.pa ?? [];
  const stripCards = strip?.cards ?? [];
  // The teacher loops show only under the approval and level rule (plan task 4.6).
  const loops = loopsShow(week);
  const panels = loopPanelsShow(week);

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

  // A clip that plays stops when the flow unmounts, for example on "Back to the week"
  // (review findings F435 and F443).
  useEffect(
    () => () => {
      clipAudioRef.current?.pause();
      clipAudioRef.current = null;
    },
    [],
  );

  // The last screen holds no "Next step" control, so the flow moves the focus to its end
  // region instead of the body (review finding F421d). The move runs only after a "Next step"
  // press (review finding F483) and keeps the scroll place (review finding F482). When the
  // region sits wholly below the viewport, the flow scrolls it into view with block
  // "nearest", so a keyboard user sees where the focus went (review finding F681); a region
  // that is already inside the viewport moves no scroll.
  useEffect(() => {
    if (last && movedRef.current) {
      const region = endRef.current;
      region?.focus({ preventScroll: true });
      const box = region?.getBoundingClientRect();
      if (region && box && box.top >= window.innerHeight) {
        region.scrollIntoView({ block: "nearest" });
      }
    }
  }, [last]);

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

  /**
   * Plays one signed clip. The flow holds one audio element, so a new click stops the last
   * clip and no two clips overlap.
   */
  function playClip(url: string): void {
    clipAudioRef.current?.pause();
    const audio = new Audio(url);
    clipAudioRef.current = audio;
    void audio.play().catch(() => {});
  }

  /** Stops the clip that plays, if one plays. */
  function stopClip(): void {
    clipAudioRef.current?.pause();
    clipAudioRef.current = null;
  }

  /** Closes the player and gives the focus back to the control that opened it. */
  function closeMedia(): void {
    setPlayer("closed");
    openerRef.current?.focus();
  }

  /** Moves to the next screen of the day, stops the clip, and closes the player. */
  function nextScreen(): void {
    movedRef.current = true;
    stopClip();
    setPlayer("closed");
    setScreen((value) => value + 1);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold" lang={script ? pickLang(script.title, thai) : "en"}>
            {script ? (
              <LanguageRuns text={pick(script.title, thai)} lang={pickLang(script.title, thai)} />
            ) : (
              ""
            )}
          </h1>
          <p className="text-neutral-600" lang="en">
            Day {day}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setThai((value) => !value)}
            aria-pressed={thai}
            lang="th"
            className="min-h-11 rounded-xl border border-[#92400e] bg-[#fcd34d] px-4 py-2 text-[#92400e]"
          >
            ไทย
          </button>
          <Link
            href={`/${locale}/teacher/${week.meta.level}/${week.meta.week}`}
            className="min-h-11 rounded-xl border border-[#92400e] bg-[#92400e] px-4 py-2 text-white"
          >
            <span lang="en">Back to the week</span>
          </Link>
        </div>
      </header>

      {screen === 0 && loops && script?.recall ? (
        <RecallView day={day} recall={script.recall} thai={thai} mediaUrls={mediaUrls} onPlay={playClip} />
      ) : null}

      {screen === 0 && openingPrompts.length > 0 ? (
        <section aria-label="The opening routine" className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold" lang="en">
            The opening routine
          </h2>
          <ol className="flex flex-col gap-2">
            {openingPrompts.map((prompt, index) => (
              <li
                key={index}
                className="rounded-2xl border border-[#92400e] p-4 text-lg"
                lang={pickLang(prompt, thai)}
              >
                <LanguageRuns text={pick(prompt, thai)} lang={pickLang(prompt, thai)} />
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {screen === 0 && stripCards.length > 0 ? (
        <section aria-label="The review strip" className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold" lang="en">
            The review strip
          </h2>
          <ul className="flex flex-wrap gap-2">
            {stripCards.map((card, index) => (
              <li
                key={index}
                className="rounded-full border border-[#92400e] bg-[#fcd34d] px-4 py-2 text-lg text-[#92400e]"
                lang="en"
              >
                {card.text}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {step ? (
        <StepView
          key={step.id}
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
          share={share}
          shots={shots}
          loops={loops}
          panels={panels}
          onPlay={playClip}
        />
      ) : null}

      {last ? (
        <div
          ref={endRef}
          role="region"
          tabIndex={-1}
          aria-label="The end of the lesson"
          className="flex flex-col gap-3 focus:outline-3 focus:outline-white focus:outline-offset-0 focus:[box-shadow:0_0_0_6px_var(--st-brown)]"
        >
          <p className="text-lg font-semibold" lang="en">
            This is the last step of the day.
          </p>
          {day === 5 ? <CheckView items={week.check.items} /> : null}
        </div>
      ) : null}

      {last ? null : (
        <div>
          <button
            type="button"
            onClick={nextScreen}
            className="min-h-11 w-fit rounded-xl border border-[#92400e] bg-[#92400e] px-4 py-2 text-white"
          >
            <span lang="en">Next step</span>
          </button>
        </div>
      )}
    </main>
  );
}
