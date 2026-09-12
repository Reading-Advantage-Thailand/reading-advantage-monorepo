import { getCartridgeCatalogEntry } from "@reading-advantage/game-cartridges";
import { notFound, redirect } from "next/navigation";

/** Locale and leftover game-id route parameters. */
export type LegacyGameRedirectParams = Promise<{
  locale: string;
  gameId: string;
}>;

/**
 * Sends a leftover Konva vocabulary or sentence URL to the live APK student route.
 * @param params Locale and leftover game identifier from the old catalog path.
 * @returns Never. Next.js redirects or renders the not-found boundary.
 */
export async function redirectLegacyGameToApk(
  params: LegacyGameRedirectParams,
): Promise<never> {
  const { locale, gameId } = await params;
  const catalogEntry = getCartridgeCatalogEntry(gameId);
  if (!catalogEntry) notFound();
  redirect(`/${locale}/student/games/apk/${catalogEntry.id}`);
}
