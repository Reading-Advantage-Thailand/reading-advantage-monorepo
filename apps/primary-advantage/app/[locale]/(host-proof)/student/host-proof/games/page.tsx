import { notFound, redirect } from "next/navigation";

import { HostProofGameClient } from "@/components/host-proof/HostProofGameClient";
import { isHostProofEnabled } from "@/lib/host-proof-config";
import { getDragonFlightHostProofEdition } from "@/lib/host-proof-selections";
import { getCurrentUser } from "@/lib/session";

/**
 * Renders the authenticated, bounded Dragon Flight proof only while explicitly enabled.
 * @returns The selected real-cartridge proof surface, a sign-in redirect, or not-found.
 */
export default async function HostProofGamesPage() {
  if (!isHostProofEnabled()) {
    notFound();
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }
  if (!user.schoolId) {
    notFound();
  }

  return <HostProofGameClient edition={getDragonFlightHostProofEdition()} />;
}
