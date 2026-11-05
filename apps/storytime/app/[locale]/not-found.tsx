import { getTranslations } from "next-intl/server";

/**
 * The 404 view of the locale routes (spec FR-5, test strategy P3.6, finding F136).
 *
 * The view renders under the locale layout. In the server curl response of a `notFound()` on a
 * matched route, Next.js 16.4.1 sends its error shell (`<html id="__next_error__">`), which
 * holds no `lang` attribute; on hydration the client re-renders the layout, so the browser
 * document is `<html lang="th">` (turn 4d, step 3). The Thai and the English line both come
 * from the message files and both hold the same value in `messages/th.json` and
 * `messages/en.json`, because the 404 must carry both languages on every locale. Next.js
 * injects the `noindex` robots meta for a 404 response, and the view writes no cookie.
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
