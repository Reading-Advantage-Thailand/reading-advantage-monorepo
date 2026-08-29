import { getCartridgeCatalogEntry } from "@reading-advantage/game-cartridges";
import { notFound } from "next/navigation";

import { StudentCartridgeHost } from "@/components/apk/StudentCartridgeHost";

type AuthenticatedApkPageProps = {
  params: Promise<{ locale: string; cartridgeId: string }>;
};

/**
 * Renders one live catalog cartridge on the Reading student game route.
 * @param props Locale and cartridge route parameters.
 * @returns The student APK host or the not-found boundary.
 */
export default async function ReadingApkGamePage({
  params,
}: AuthenticatedApkPageProps) {
  const { locale, cartridgeId } = await params;
  const catalogEntry = getCartridgeCatalogEntry(cartridgeId);
  if (!catalogEntry) notFound();

  return (
    <StudentCartridgeHost
      cartridgeId={catalogEntry.id}
      description={catalogEntry.description}
      inputMode={catalogEntry.inputMode}
      locale={locale}
      title={catalogEntry.title}
    />
  );
}
