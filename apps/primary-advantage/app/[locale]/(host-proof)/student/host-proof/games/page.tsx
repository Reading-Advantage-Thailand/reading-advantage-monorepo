import { notFound } from "next/navigation";
import { HostProofGameClient } from "@/components/host-proof/HostProofGameClient";
import { isHostProofEnabled } from "@/lib/host-proof-config";

export default function HostProofGamesPage() {
  if (!isHostProofEnabled()) {
    notFound();
  }

  return <HostProofGameClient />;
}
