import { db } from "@reading-advantage/db";
import { getAvatarState, toLaunchAvatar } from "@reading-advantage/domain/primary-avatar";
import { getCartridgeCatalogEntry } from "@reading-advantage/game-cartridges";
import { notFound } from "next/navigation";
import { z } from "zod";

import { StudentCartridgeHost } from "@/components/apk/StudentCartridgeHost";
import { getCurrentUser } from "@/lib/session";

type AuthenticatedApkPageProps = {
  params: Promise<{ locale: string; cartridgeId: string }>;
  searchParams?: Promise<{ challengeId?: string | string[]; mode?: string | string[] }>;
};

const challengeIdSchema = z.string().uuid();
const modeSchema = z.enum(["demo", "briefing"]);

/**
 * Renders one live catalog cartridge on the Primary student game route.
 * @param props Locale and cartridge route parameters.
 * @returns The student APK host or the not-found boundary.
 */
export default async function PrimaryApkGamePage({
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
  const modeResult = query.mode === undefined
    ? { success: true as const, data: "briefing" as const }
    : modeSchema.safeParse(query.mode);
  if (!modeResult.success) notFound();
  const user = await getCurrentUser();
  const ownerKey = user?.role === "STUDENT" && user.schoolId
    ? `${user.schoolId}:${user.id}`
    : undefined;
  // The host passes the avatar to the game (FR-7); a game never fetches it. A failed read means no avatar.
  const avatar = ownerKey && user ? await getAvatarState({ db, user }).then(toLaunchAvatar).catch(() => null) : null;

  return (
    <StudentCartridgeHost
      cartridgeId={catalogEntry.id}
      description={catalogEntry.description}
      inputMode={catalogEntry.inputMode}
      locale={locale}
      ownerKey={ownerKey}
      challengeId={challengeIdResult.data}
      mode={modeResult.data}
      avatar={avatar}
      title={catalogEntry.title}
    />
  );
}
