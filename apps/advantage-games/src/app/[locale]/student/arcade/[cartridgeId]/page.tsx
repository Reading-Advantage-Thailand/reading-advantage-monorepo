import { notFound } from "next/navigation";
import { getCartridgeCatalogEntry } from "@reading-advantage/game-cartridges/catalog";

import { APKArcadeHost } from "@/features/apk-arcade/APKArcadeHost";

type ArcadeCartridgePageProps = {
  params: Promise<{ locale: string; cartridgeId: string }>;
};

/** Renders the generic production arcade route for a published APK cartridge.
 * @param props Asynchronous locale and cartridge route parameters.
 * @returns The shared client host, or the normal Next.js not-found boundary.
 */
export default async function ArcadeCartridgePage({
  params,
}: ArcadeCartridgePageProps) {
  const { locale, cartridgeId } = await params;
  const catalogEntry = getCartridgeCatalogEntry(cartridgeId);
  if (!catalogEntry) notFound();

  return (
    <APKArcadeHost
      cartridgeId={catalogEntry.id}
      locale={locale}
      title={catalogEntry.title}
      inputMode={catalogEntry.inputMode}
    />
  );
}
