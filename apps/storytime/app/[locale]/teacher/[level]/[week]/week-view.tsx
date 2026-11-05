import Link from "next/link";
import type { StorytimeWeek } from "../../../../../lib/contracts/week";

/**
 * The teacher week view (spec FR-9, plan task 4.2, AC-9.1).
 *
 * The route `/<locale>/teacher/<level>/<week>` shows the teacher the whole week of the class: the
 * title, the element with its sound, the phonemic awareness skill, the tricky words, the frame,
 * the family words with their pictures, the five lessons by day, and the three materials.
 *
 * Every item comes from the week file. The view holds no string of its own that names a week
 * item, so the view of a draft week and the view of a published week differ only by their data.
 *
 * The view holds no flag. The server page of task 4.1 reads the flag and answers 404 when the
 * teacher routes are off.
 */

/** The environment value that holds the media base URL. It stays on the server: no request sets
 * it, and the build never inlines it. */
const MEDIA_BASE_ENV = "STORYTIME_MEDIA_BASE";

/** The print part of a week, as the shipped file holds it. The contract leaves it open, because
 * production owns it. */
interface WeekPrint {
  /** The print part of the week. */
  print?: {
    /** The letter box of the student book. */
    letterBox?: {
      /** The letter of the week. */
      letter?: string;
    };
  };
}

/**
 * Builds the URL of one media file.
 * @param file The file, relative to the Storytime content folder.
 * @returns The URL under the media base.
 */
function mediaUrl(file: string): string {
  const base = (process.env[MEDIA_BASE_ENV] || "/media").replace(/\/+$/, "");
  return `${base}/${file}`;
}

/**
 * Renders the week of the teacher.
 * @param props.week The week of the view.
 * @param props.locale The locale segment of the route.
 * @returns The week view.
 */
export function TeacherWeekView({ week, locale }: { week: StorytimeWeek; locale: string }) {
  const element = week.focus.element;
  const paSkill = week.focus.paSkill;
  const family = week.focus.family;
  const frame = week.focus.frame;
  const print = (week as unknown as WeekPrint).print;
  const readAlong = week.books.find((book) => book.kind === "readalong");
  const decodable = week.books.find((book) => book.kind === "decodable");
  const level = week.meta.level;
  const weekNumber = week.meta.week;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-8 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold" lang="en">
          {week.meta.title}
        </h1>
        <p className="text-neutral-600">
          Level {level}, week {weekNumber}
        </p>
      </header>

      {element ? (
        <section aria-label="The element of the week" className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">The element of the week</h2>
          <p className="text-3xl font-semibold" lang="en">
            {element.graphemes.join(" ")}
          </p>
          <p className="text-xl" lang="en">
            {element.sound}
          </p>
          {element.audio ? (
            <audio
              controls
              preload="none"
              src={mediaUrl(element.audio)}
              aria-label={`The sound of the week: ${element.sound}`}
              className="min-h-16 min-w-16"
            />
          ) : null}
        </section>
      ) : null}

      {paSkill ? (
        <section aria-label="The phonemic awareness skill" className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">The phonemic awareness skill</h2>
          <p className="text-lg" lang="en">
            {paSkill.en}
          </p>
        </section>
      ) : null}

      <section aria-label="The tricky words" className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">The tricky words</h2>
        <ul className="flex flex-wrap gap-2">
          {week.focus.trickyWords.map((word) => (
            <li
              key={word}
              className="rounded-full border border-neutral-300 px-4 py-2 text-lg"
              lang="en"
            >
              {word}
            </li>
          ))}
        </ul>
      </section>

      {frame ? (
        <section aria-label="The frame" className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">The frame</h2>
          <p className="text-lg" lang="en">
            {frame}
          </p>
        </section>
      ) : null}

      {family ? (
        <section aria-label="The family words" className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">The family words</h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {family.words.map((entry) => {
              const caption = entry.image?.caption ?? "";
              return (
                <li key={entry.word} className="flex flex-col gap-2">
                  <span className="text-lg font-semibold" lang="en">
                    {entry.word}
                  </span>
                  {entry.image?.file ? (
                    <img
                      src={mediaUrl(entry.image.file)}
                      alt={caption}
                      loading="lazy"
                      decoding="async"
                      className="h-24 w-24 rounded-xl object-cover"
                    />
                  ) : (
                    <span
                      role="img"
                      aria-label={caption}
                      className="flex h-24 w-24 items-center justify-center rounded-xl border border-neutral-300 p-2 text-center text-sm"
                    >
                      {caption}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section aria-label="The five lessons" className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">The five lessons</h2>
        <ol className="flex flex-col gap-3">
          {week.scripts.map((script) => (
            <li
              key={script.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-300 p-4"
            >
              <span className="text-lg font-semibold" lang="en">
                {script.title.en}
              </span>
              <Link
                href={`/${locale}/teacher/${level}/${weekNumber}/${script.day}`}
                className="rounded-xl border border-neutral-300 px-4 py-2"
              >
                Open the lesson
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="The three materials" className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">The three materials</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <li className="flex flex-col gap-1 rounded-2xl border border-neutral-300 p-4">
            <span className="font-semibold">The student book</span>
            <span className="text-3xl font-semibold" lang="en">
              {print?.letterBox?.letter ?? ""}
            </span>
          </li>
          {readAlong ? (
            <li className="flex flex-col gap-1 rounded-2xl border border-neutral-300 p-4">
              <span className="font-semibold">The read-along</span>
              <span className="text-lg" lang="en">
                {readAlong.title}
              </span>
            </li>
          ) : null}
          {decodable ? (
            <li className="flex flex-col gap-1 rounded-2xl border border-neutral-300 p-4">
              <span className="font-semibold">The decodable</span>
              <span className="text-lg" lang="en">
                {decodable.title}
              </span>
            </li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
