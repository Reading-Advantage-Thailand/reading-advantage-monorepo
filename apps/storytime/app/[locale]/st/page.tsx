import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUser } from "../../../lib/auth";
import * as content from "../../../lib/content";
import { placeFor } from "../../../lib/look/places";
import { teacherRoutesEnabled } from "../../../lib/teacher";
import { Frame } from "../frame";

/**
 * The return fallback of the at-home app (design section 2, AC-4.1).
 *
 * A scan that names no week, or a sign-in with a `next` that the return-path check rejects,
 * ends here. The page asks the visitor to scan the book code and shows no week content. A
 * visitor without a session goes to the sign-in page first.
 *
 * The page holds the Storytime look (plan task 3.3): the home place of `placeFor` paints the
 * ground, and the shared frame renders the hero window. The heading sits on the frame plaque
 * and the instruction sits in a cream card, so the copy stays and reads on the painted ground.
 *
 * A teacher with the switch on sees one link to the teacher page of the first open week
 * (plan task 6.2, round 7, PM point 3). A family or class account sees no teacher link. A
 * missing open week and a failed content read show no link, so the page never holds a dead
 * link. The optional call keeps the page safe against a mock of `../lib/content` that holds
 * no `firstOpenWeek`.
 */

/**
 * Marks the page as out of the search index.
 * @returns The page metadata.
 */
export function generateMetadata(): Metadata {
  return { robots: "noindex, nofollow" };
}

/**
 * Renders the return fallback.
 * @param props.params The locale of the page.
 * @returns The page.
 */
export default async function StorytimeFallbackPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireUser(`/${locale}/st`);
  let teacherHref: string | null = null;
  if (user.role === "teacher" && teacherRoutesEnabled()) {
    try {
      const first = await content.firstOpenWeek?.();
      teacherHref = first ? `/${locale}/teacher/${first.level}/${first.week}` : null;
    } catch {
      teacherHref = null;
    }
  }
  const translate = await getTranslations({ locale });
  const t = (key: string) => translate(key);
  const places = placeFor(null);
  const interfaceLocale = locale === "th" ? "th" : "en";

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 p-6"
      data-place={places.place}
      data-hero={places.hero}
    >
      {/* The shared frame of the week pages renders the hero window here too. The home page has
          no route level and week, so the label reads the app name and the plaque reads the
          heading of the fallback. */}
      <Frame
        bar="Storytime Advantage"
        title={t("stFallbackHeading")}
        variant="cover"
        locale={interfaceLocale}
      />
      <p
        className="rounded-2xl border-4 border-[#92400e] bg-[#fffaf0] p-4 leading-7"
        lang={interfaceLocale}
      >
        {t("stFallbackLine")}
      </p>
      {teacherHref ? (
        <Link
          href={teacherHref}
          className="inline-flex min-h-11 w-fit items-center rounded-2xl border border-[#92400e] bg-[#fcd34d] px-4 py-2 font-semibold text-[#92400e]"
        >
          {t("stTeacherViewLink")}
        </Link>
      ) : null}
      <form method="post" action="/api/auth/sign-out" className="w-fit">
        <input type="hidden" name="locale" value={locale} />
        <button
          type="submit"
          className="min-h-16 rounded-2xl border border-[#92400e] bg-[#92400e] px-4 py-2 text-white"
        >
          {t("signOut")}
        </button>
      </form>
    </main>
  );
}
