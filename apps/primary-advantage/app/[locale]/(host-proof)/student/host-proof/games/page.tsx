import { notFound } from "next/navigation";
import { HostProofGameClient } from "@/components/host-proof/HostProofGameClient";
import { isHostProofEnabled } from "@/lib/host-proof-config";

/**
 * Renders the hidden Task-5 Primary host-proof surface when explicitly enabled.
 * @returns The bounded host-proof surface, or a not-found response.
 */
export default function HostProofGamesPage() {
  if (!isHostProofEnabled()) {
    notFound();
  }

  return <HostProofGameClient />;
}
