import { redirectLegacyGameToApk } from "@/lib/apk/legacy-game-redirect";

type LegacySentenceGamePageProps = {
  params: Promise<{ locale: string; gameId: string }>;
};

/**
 * Redirects a leftover Konva sentence URL to the live APK student route.
 * @param props Locale and leftover game identifier.
 * @returns Never. The leftover path redirects or 404s.
 */
export default async function LegacySentenceGamePage({
  params,
}: LegacySentenceGamePageProps) {
  return redirectLegacyGameToApk(params);
}
