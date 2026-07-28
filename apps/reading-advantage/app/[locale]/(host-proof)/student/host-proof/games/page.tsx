import { HostProofGameClient } from "@/components/host-proof/HostProofGameClient";
import { isHostProofEnabled } from "@/lib/host-proof-config";
import { notFound } from "next/navigation";

/**
 * Renders the hidden Task-5 Reading host proof only when its server flag is enabled.
 * @returns The bounded host-proof client surface, or a not-found response.
 */
export default function HostProofGamesPage() {
  if (!isHostProofEnabled()) {
    notFound();
  }

  return <HostProofGameClient />;
}
