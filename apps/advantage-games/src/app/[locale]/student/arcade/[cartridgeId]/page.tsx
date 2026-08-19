import { getCartridgeCatalogEntry } from "@reading-advantage/game-cartridges";
import { notFound } from "next/navigation";

import { PublicCartridgeHost } from "@/components/apk/PublicCartridgeHost";

type ArcadeCartridgePageProps = {
  params: Promise<{ locale: string; cartridgeId: string }>;
};

/**
 * Renders a public route for one published APK cartridge.
 * @param props Asynchronous locale and cartridge route parameters.
 * @returns The client-only APK host or the normal Next.js not-found boundary.
 */
export default async function ArcadeCartridgePage({
  params,
}: ArcadeCartridgePageProps) {
  const { locale, cartridgeId } = await params;
  const catalogEntry = getCartridgeCatalogEntry(cartridgeId);

  if (!catalogEntry) notFound();

  return (
    <PublicCartridgeHost
      cartridgeId={catalogEntry.id}
      description={catalogEntry.description}
      inputMode={catalogEntry.inputMode}
      locale={locale}
      title={catalogEntry.title}
    />
  );
}
