import { notFound, redirect } from "next/navigation";
import { DragonRiderHostProofClient } from "@/components/host-proof/DragonRiderHostProofClient";
import { isDragonRiderHostProofEnabled } from "@/lib/dragon-rider-host-proof-config";
import { getCurrentUser } from "@/lib/session";
/** Renders the direct hidden Dragon Rider proof page only for an authenticated tenant learner. */
export default async function DragonRiderHostProofPage() { if (!isDragonRiderHostProofEnabled()) notFound(); const user = await getCurrentUser(); if (!user) redirect("/auth/signin"); if (!user.school_id) notFound(); return <DragonRiderHostProofClient />; }
