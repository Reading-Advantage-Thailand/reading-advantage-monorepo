import { notFound, redirect } from "next/navigation";

import { HostProofGameClient } from "@/components/host-proof/HostProofGameClient";
import { isHostProofEnabled } from "@/lib/host-proof-config";
import { getDragonFlightHostProofEdition } from "@/lib/host-proof-selections";
import { getCurrentUser } from "@/lib/session";

const PRODUCTION_CUTOVER_GAME_TYPES = [
  "dragon-flight",
  "magic-defense",
  "dungeon-liberator",
  "castle-defense",
  "wizard-vs-zombie",
  "village-guardian",
  "enchanted-library",
  "rune-match",
  "alchemists-synthesis",
  "potion-rush",
  "rune-forge-chamber",
  "spellweavers-run",
  "shadow-gate-dungeon",
  "labyrinth-goblin-king",
  "griffin-riders-escape",
] as const;

type ProductionCutoverGameType = (typeof PRODUCTION_CUTOVER_GAME_TYPES)[number];

function isProductionCutoverGameType(value: string | undefined): value is ProductionCutoverGameType {
  return !!value && (PRODUCTION_CUTOVER_GAME_TYPES as readonly string[]).includes(value);
}

/**
 * Renders the authenticated dual-host host-proof surface for production-cutover titles.
 * @param props Next.js page props including optional gameType search param.
 * @returns Host-proof cartridge client, sign-in redirect, or not-found.
 */
export default async function HostProofGamesPage({
  searchParams,
}: {
  searchParams?: Promise<{ gameType?: string }> | { gameType?: string };
}) {
  if (!isHostProofEnabled()) {
    notFound();
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }
  if (!user.school_id) {
    notFound();
  }

  const resolved = searchParams instanceof Promise ? await searchParams : searchParams;
  const requested = resolved?.gameType;
  const gameType: ProductionCutoverGameType = isProductionCutoverGameType(requested)
    ? requested
    : "dragon-flight";

  return (
    <HostProofGameClient
      edition={getDragonFlightHostProofEdition()}
      gameType={gameType}
    />
  );
}
