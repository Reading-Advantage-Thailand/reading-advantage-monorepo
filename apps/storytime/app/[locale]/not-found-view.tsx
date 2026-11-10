"use client";

import { usePathname } from "next/navigation";
import { routing } from "@/i18n/routing";
import { parseStorytimePath } from "@/lib/route-parse";
import messages from "../../messages/en.json";

/** The class list of the 48 px link to the highest open week. */
const LINK_CLASS =
  "inline-flex min-h-12 flex-col items-center justify-center rounded border border-[#92400e] bg-[#92400e] px-5 py-2 font-semibold text-white";

/**
 * The 404 view of the locale routes (spec FR-1, AC-1.1 and AC-1.2). It tells a child that a week
 * is not open yet, and links to the highest open week, only when the path is a week route of a
 * level that has week files. Every other 404 keeps the current text and shows no link.
 *
 * The text comes from the English message file: the 404 keys hold the same value in both message
 * files, and the locale layout holds no client message provider. The link target is built from
 * the locale of the path (as `parseStorytimePath` reads it against the known locales) and two
 * integers, never from the path text, so a hostile path cannot move the child to another host.
 * The page locale falls back to the routing default on a 404, so the `locale` prop cannot carry
 * the locale of the scanned page; the path is the only source (carried item N6).
 * @param props.openWeeks The highest open week of each level that has a week file, or `null`.
 * @param props.locale The locale of the page. The link does not read it.
 * @returns The 404 view.
 */
export function NotFoundView({
  openWeeks,
}: {
  openWeeks: Record<number, number | null>;
  locale: string;
}) {
  const pathname = usePathname();
  const route = pathname === null ? null : parseStorytimePath(pathname, routing.locales);
  const highest = route !== null && route.level in openWeeks ? openWeeks[route.level] : undefined;

  if (route === null || highest === undefined) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-3 p-6">
        <h1 className="text-2xl font-semibold" lang="th">
          {messages.notFoundThai}
        </h1>
        <p lang="en">{messages.notFoundEnglish}</p>
      </main>
    );
  }

  const week = highest === null ? null : String(highest);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-3 p-6">
      <h1 className="text-2xl font-semibold" lang="th">
        {messages.notOpenThai}
      </h1>
      <p lang="en">{messages.notOpenEnglish}</p>
      {week !== null ? (
        <a href={`/${route.locale}/st/${route.level}/${week}`} className={LINK_CLASS}>
          <span lang="th">{messages.openWeekThai.replace("{week}", week)}</span>
          <span lang="en">{messages.openWeekEnglish.replace("{week}", week)}</span>
        </a>
      ) : null}
    </main>
  );
}
