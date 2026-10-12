import { notFound } from "next/navigation";

import { permanentRedirect } from "@/i18n/navigation";
import { oldGameTarget } from "@/lib/games/catalog";

type OldGamePageProps = { params: Promise<{ locale: string; gameId: string }> };

/**
 * Sends an old `/student/games/vocabulary/<id>` bookmark to the 3D game with the same name (HTTP 308).
 * @param props Locale and the old game id.
 * @returns Never returns for a known id (it redirects); an unknown id uses the not-found boundary.
 */
export default async function OldVocabularyGamePage({ params }: OldGamePageProps) {
  const { locale, gameId } = await params;
  const href = oldGameTarget("vocabulary", gameId);
  if (!href) notFound();
  permanentRedirect({ href, locale });
}
