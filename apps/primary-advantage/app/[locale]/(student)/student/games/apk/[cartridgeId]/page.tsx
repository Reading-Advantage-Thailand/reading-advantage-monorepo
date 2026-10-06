import { db } from "@reading-advantage/db";
import { getAvatarState, toLaunchAvatar } from "@reading-advantage/domain/primary-avatar";
import { notFound } from "next/navigation";
import { z } from "zod";

import { GameHost } from "@/components/games/game-host";
import { redirect } from "@/i18n/navigation";
import { gameFor } from "@/lib/games/catalog";
import { getCurrentUser } from "@/lib/session";

type AuthenticatedApkPageProps = {
  params: Promise<{ locale: string; cartridgeId: string }>;
  searchParams?: Promise<{ challengeId?: string | string[]; mode?: string | string[] }>;
};

const challengeIdSchema = z.string().uuid();
const modeSchema = z.enum(["demo", "briefing"]);

/**
 * Plays one game on the Primary student game route. A legacy 2D catalog id redirects to the 3D
 * game that replaced it, with the query kept; an unknown id is not found.
 * @param props Locale and game route parameters; `challengeId` runs a class challenge, `mode=demo` saves nothing.
 * @returns The game host, a redirect, or the not-found boundary.
 */
export default async function PrimaryApkGamePage({
  params,
  searchParams = Promise.resolve({}),
}: AuthenticatedApkPageProps) {
  const [{ locale, cartridgeId }, query] = await Promise.all([params, searchParams]);
  const game = gameFor(cartridgeId);
  if (!game) notFound();
  const challengeIdResult = query.challengeId === undefined
    ? { success: true as const, data: undefined }
    : challengeIdSchema.safeParse(query.challengeId);
  if (!challengeIdResult.success) notFound();
  const modeResult = query.mode === undefined
    ? { success: true as const, data: "briefing" as const }
    : modeSchema.safeParse(query.mode);
  if (!modeResult.success) notFound();
  if (game.id !== cartridgeId) {
    const search = new URLSearchParams();
    if (challengeIdResult.data) search.set("challengeId", challengeIdResult.data);
    if (query.mode !== undefined) search.set("mode", modeResult.data);
    const suffix = search.size ? `?${search}` : "";
    redirect({ href: `/student/games/apk/${game.id}${suffix}`, locale });
  }
  const user = await getCurrentUser();
  const ownerKey = user?.role === "STUDENT" && user.schoolId
    ? `${user.schoolId}:${user.id}`
    : undefined;
  // The host passes the avatar to the game (FR-7); a game never fetches it. A failed read means no avatar.
  const avatar = ownerKey && user ? await getAvatarState({ db, user }).then(toLaunchAvatar).catch(() => null) : null;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <GameHost
        gameId={game.id}
        locale={locale}
        ownerKey={ownerKey}
        challengeId={challengeIdResult.data}
        save={modeResult.data !== "demo"}
        avatar={avatar}
        className="flex h-full w-full flex-col"
      />
    </div>
  );
}
