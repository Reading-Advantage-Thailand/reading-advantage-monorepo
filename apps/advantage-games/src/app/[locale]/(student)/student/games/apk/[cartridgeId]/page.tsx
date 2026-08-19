import { getCartridgeCatalogEntry } from "@reading-advantage/game-cartridges";
import { notFound } from "next/navigation";

import {
  AuthenticatedCartridgeHost,
  type AppRouteLocale,
} from "@/components/apk/AuthenticatedCartridgeHost";

type AuthenticatedApkPageProps = {
  params: Promise<{ locale: string; cartridgeId: string }>;
};

/**
 * Maps an application route locale to a persisted flashcard locale.
 * @param locale Locale segment from the authenticated route.
 * @returns A supported student-content locale.
 */
function resolveContentLocale(
  locale: string,
): "en" | "th" | "cn" | "tw" | "vi" {
  if (locale === "th") return "th";
  if (locale === "zh") return "cn";
  return "en";
}

/**
 * Maps an application route segment to a supported app locale.
 * @param locale Locale segment from the authenticated route.
 * @returns An app route locale used for navigation.
 */
function resolveRouteLocale(locale: string): AppRouteLocale {
  if (locale === "th" || locale === "zh") return locale;
  return "en";
}

/**
 * Renders one authenticated APK cartridge with student-owned learning content.
 * @param props Asynchronous locale and cartridge route parameters.
 * @returns The authenticated APK host or the normal not-found boundary.
 */
export default async function AuthenticatedApkPage({
  params,
}: AuthenticatedApkPageProps) {
  const { locale, cartridgeId } = await params;
  const catalogEntry = getCartridgeCatalogEntry(cartridgeId);
  if (!catalogEntry) notFound();

  return (
    <AuthenticatedCartridgeHost
      cartridgeId={catalogEntry.id}
      description={catalogEntry.description}
      inputMode={catalogEntry.inputMode}
      locale={resolveRouteLocale(locale)}
      contentLocale={resolveContentLocale(locale)}
      title={catalogEntry.title}
    />
  );
}
