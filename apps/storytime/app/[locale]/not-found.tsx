import { getLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { highestOpenWeeks } from "@/lib/content";
import { NotFoundView } from "./not-found-view";

/**
 * The 404 view of the locale routes (spec FR-5, test strategy P3.6, finding F136; spec FR-1,
 * AC-1.1).
 *
 * The view renders under the locale layout. In the server curl response of a `notFound()` on a
 * matched route, Next.js 16.4.1 sends its error shell (`<html id="__next_error__">`), which
 * holds no `lang` attribute; on hydration the client re-renders the layout, so the browser
 * document is `<html lang="th">` (turn 4d, step 3). The Thai and the English line both come
 * from the message files and both hold the same value in `messages/th.json` and
 * `messages/en.json`, because the 404 must carry both languages on every locale. Next.js
 * injects the `noindex` robots meta for a 404 response, and the view writes no cookie.
 *
 * This server component reads the highest open week of each level and gives it to the client
 * child, which reads the path and decides whether the "not open yet" text and its link show.
 * @returns The client 404 view.
 */
export default async function NotFound() {
  const openWeeks = await highestOpenWeeks();
  let locale: string = routing.defaultLocale;
  try {
    locale = await getLocale();
  } catch {
    // A 404 view never throws: without a request locale the routing default holds.
  }
  return <NotFoundView openWeeks={openWeeks} locale={locale} />;
}
