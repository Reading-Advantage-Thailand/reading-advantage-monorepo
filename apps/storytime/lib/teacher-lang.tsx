/**
 * The language run helpers of the teacher pages (plan task 4.3, review finding F671, boundary
 * fix F691 and F702).
 *
 * The English teacher notes and week fields quote Thai letters as sound guides, so an English
 * line can hold runs of Thai script. The flow and the week view render each Thai run in its
 * own element with `lang="th"`, so a screen reader reads the run with the Thai voice
 * (WCAG 3.1.2). This module holds no `"use client"` directive: the helpers are pure and work
 * on the server and in the browser, and the week view imports them without pulling the client
 * module of the lesson flow.
 */

/** One run of a split text: Thai script, or other text. */
export interface TextRun {
  /** The characters of the run. */
  text: string;
  /** `true` when the run is Thai script (Unicode block U+0E00 to U+0E7F). */
  thai: boolean;
}

/**
 * Splits a string into runs of Thai script and other text (review finding F671).
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
