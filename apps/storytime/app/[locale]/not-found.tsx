import { getTranslations } from "next-intl/server";

/**
 * The 404 view of the locale routes (spec FR-5, test strategy P3.6, finding F136).
 *
 * The view renders under the locale layout, so the document keeps the locale `lang` of the
 * requested route. It shows a Thai and an English line, both from the message files, and both
 * hold the same value in `messages/th.json` and `messages/en.json`, because the 404 must carry
 * both languages on every locale. Next.js injects the `noindex` robots meta for a 404 response,
 * and the view writes no cookie.
 */
export default async function NotFound() {
  const t = await getTranslations();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-3 p-6">
      <h1 className="text-2xl font-semibold" lang="th">
        {t("notFoundThai")}
      </h1>
      <p lang="en">{t("notFoundEnglish")}</p>
    </main>
  );
}
