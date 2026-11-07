import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "../../../lib/auth";

/**
 * The return fallback of the at-home app (design section 2, AC-4.1).
 *
 * A scan that names no week, or a sign-in with a `next` that the return-path check rejects,
 * ends here. The page asks the visitor to scan the book code and shows no week content. A
 * visitor without a session goes to the sign-in page first.
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
  await requireUser(`/${locale}/st`);
  const translate = await getTranslations({ locale });
  const t = (key: string) => translate(key);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">{t("stFallbackHeading")}</h1>
      <p className="leading-7">{t("stFallbackLine")}</p>
      <form method="post" action="/api/auth/sign-out" className="w-fit">
        <input type="hidden" name="locale" value={locale} />
        <button
          type="submit"
          className="min-h-16 rounded-2xl border border-neutral-300 px-4 py-2"
        >
          {t("signOut")}
        </button>
      </form>
    </main>
  );
}
