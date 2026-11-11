import Link from "next/link";
import { mediaUrl } from "../../../../../lib/media/url";
import type { StorytimeWeek } from "../../../../../lib/contracts/week";
import { LanguageRuns } from "../../../../../lib/teacher-lang";

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
 * Renders the week of the teacher.
 * @param props.week The week of the view.
 * @param props.locale The locale segment of the route.
 * @param props.mediaUrls The signed URLs of the week.
 * @returns The week view.
 */
export function TeacherWeekView({
  week,
  locale,
  mediaUrls = {},
}: {
  week: StorytimeWeek;
  locale: string;
  mediaUrls?: Record<string, string>;
}) {
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
          <LanguageRuns text={week.meta.title} lang="en" />
        </h1>
        <p className="text-neutral-600" lang="en">
          Level {level}, week {weekNumber}
        </p>
      </header>

      {element ? (
        <section aria-label="The element of the week" className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold" lang="en">The element of the week</h2>
          <p className="text-3xl font-semibold" lang="en">
            <LanguageRuns text={element.graphemes.join(" ")} lang="en" />
          </p>
          <p className="text-xl" lang="en">
            <LanguageRuns text={element.sound} lang="en" />
          </p>
          {element.audio ? (
            <audio
              controls
              preload="none"
              src={mediaUrl(mediaUrls, element.audio)}
              aria-label={`The sound of the week: ${element.sound}`}
              className="min-h-16 min-w-16"
            />
          ) : null}
        </section>
      ) : null}

      {paSkill ? (
        <section aria-label="The phonemic awareness skill" className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold" lang="en">The phonemic awareness skill</h2>
          <p className="text-lg" lang="en">
            <LanguageRuns text={paSkill.en} lang="en" />
          </p>
        </section>
      ) : null}

      <section aria-label="The tricky words" className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold" lang="en">The tricky words</h2>
        <ul className="flex flex-wrap gap-2">
          {week.focus.trickyWords.map((word) => (
            <li
              key={word}
              className="rounded-full border border-[#92400e] bg-[#fcd34d] px-4 py-2 text-lg text-[#92400e]"
              lang="en"
            >
              <LanguageRuns text={word} lang="en" />
            </li>
          ))}
        </ul>
      </section>

      {frame ? (
        <section aria-label="The frame" className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold" lang="en">The frame</h2>
          <p className="text-lg" lang="en">
            <LanguageRuns text={frame} lang="en" />
          </p>
        </section>
      ) : null}

      {family ? (
        <section aria-label="The family words" className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold" lang="en">The family words</h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {family.words.map((entry) => {
              const caption = entry.image?.caption ?? "";
              return (
                <li key={entry.word} className="flex flex-col gap-2">
                  <span className="text-lg font-semibold" lang="en">
                    <LanguageRuns text={entry.word} lang="en" />
                  </span>
                  {entry.image?.file ? (
                    <img
                      src={mediaUrl(mediaUrls, entry.image.file)}
                      alt={caption}
                      loading="lazy"
                      decoding="async"
                      lang="en"
                      className="h-24 w-24 rounded-xl object-cover"
                    />
                  ) : (
                    <span
                      role="img"
                      aria-label={caption}
                      lang="en"
                      className="flex h-24 w-24 items-center justify-center rounded-xl border border-[#92400e] p-2 text-center text-sm"
                    >
                      <LanguageRuns text={caption} lang="en" />
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section aria-label="The five lessons" className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold" lang="en">The five lessons</h2>
        <ol className="flex flex-col gap-3">
          {week.scripts.map((script) => (
            <li
              key={script.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-[#92400e] p-4"
            >
              <span className="text-lg font-semibold" lang="en">
                <LanguageRuns text={script.title.en} lang="en" />
              </span>
              <Link
                href={`/${locale}/teacher/${level}/${weekNumber}/${script.day}`}
                className="min-h-11 rounded-xl border border-[#92400e] bg-[#92400e] px-4 py-2 text-white"
                lang="en"
              >
                Open the lesson
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="The three materials" className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold" lang="en">The three materials</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <li className="flex flex-col gap-1 rounded-2xl border border-[#92400e] p-4">
            <span className="font-semibold" lang="en">The student book</span>
            <span className="text-3xl font-semibold" lang="en">
              <LanguageRuns text={print?.letterBox?.letter ?? ""} lang="en" />
            </span>
          </li>
          {readAlong ? (
            <li className="flex flex-col gap-1 rounded-2xl border border-[#92400e] p-4">
              <span className="font-semibold" lang="en">The read-along</span>
              <span className="text-lg" lang="en">
                <LanguageRuns text={readAlong.title} lang="en" />
              </span>
            </li>
          ) : null}
          {decodable ? (
            <li className="flex flex-col gap-1 rounded-2xl border border-[#92400e] p-4">
              <span className="font-semibold" lang="en">The decodable</span>
              <span className="text-lg" lang="en">
                <LanguageRuns text={decodable.title} lang="en" />
              </span>
            </li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
