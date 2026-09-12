import { getCartridgeCatalogEntry } from "@reading-advantage/game-cartridges";
import { SESSION_COOKIE_NAME, validateSession } from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { z } from "zod";

import {
  AuthenticatedCartridgeHost,
  type AppRouteLocale,
} from "@/components/apk/AuthenticatedCartridgeHost";

type AuthenticatedApkPageProps = {
  params: Promise<{ locale: string; cartridgeId: string }>;
  searchParams?: Promise<{ challengeId?: string | string[] }>;
};

const challengeIdSchema = z.string().uuid();

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
  searchParams = Promise.resolve({}),
}: AuthenticatedApkPageProps) {
  const [{ locale, cartridgeId }, query] = await Promise.all([params, searchParams]);
  const catalogEntry = getCartridgeCatalogEntry(cartridgeId);
  if (!catalogEntry) notFound();
  const challengeIdResult = query.challengeId === undefined
    ? { success: true as const, data: undefined }
    : challengeIdSchema.safeParse(query.challengeId);
  if (!challengeIdResult.success) notFound();
  const sessionToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const session = sessionToken ? await validateSession(db, sessionToken) : null;
  const ownerKey = session?.user.role === "STUDENT" && session.user.schoolId
    ? `${session.user.schoolId}:${session.user.id}`
    : undefined;

  return (
    <AuthenticatedCartridgeHost
      cartridgeId={catalogEntry.id}
      description={catalogEntry.description}
      inputMode={catalogEntry.inputMode}
      locale={resolveRouteLocale(locale)}
      contentLocale={resolveContentLocale(locale)}
      ownerKey={ownerKey}
      challengeId={challengeIdResult.data}
      title={catalogEntry.title}
    />
  );
}
