import { getCartridgeCatalogEntry } from "@reading-advantage/game-cartridges";
import { notFound } from "next/navigation";
import { z } from "zod";

import { StudentCartridgeHost } from "@/components/apk/StudentCartridgeHost";
import { toUserContext } from "@/lib/apk/to-user-context";
import { getCurrentUser } from "@/lib/session";

type AuthenticatedApkPageProps = {
  params: Promise<{ locale: string; cartridgeId: string }>;
  searchParams?: Promise<{ challengeId?: string | string[]; mode?: string | string[] }>;
};

const challengeIdSchema = z.string().uuid();

/**
 * Renders one live catalog cartridge on the Reading student game route.
 * @param props Locale and cartridge route parameters.
 * @returns The student APK host or the not-found boundary.
 */
export default async function ReadingApkGamePage({
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
  const mode = typeof query.mode === "string" ? query.mode : undefined;
  const sessionUser = await getCurrentUser();
  const user = sessionUser ? toUserContext(sessionUser) : null;
  const ownerKey = user?.role === "STUDENT" && user.schoolId
    ? `${user.schoolId}:${user.id}`
    : undefined;

  return (
    <StudentCartridgeHost
      cartridgeId={catalogEntry.id}
      challengeId={challengeIdResult.data}
      description={catalogEntry.description}
      inputMode={catalogEntry.inputMode}
      locale={locale}
      mode={mode}
      ownerKey={ownerKey}
      title={catalogEntry.title}
    />
  );
}
