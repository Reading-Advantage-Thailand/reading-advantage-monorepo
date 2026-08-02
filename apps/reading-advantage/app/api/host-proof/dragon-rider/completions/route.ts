import { NextRequest, NextResponse } from "next/server";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import { completeDragonRiderHostProofAttempt, createDragonRiderHostProofAttemptDependencies } from "@reading-advantage/domain/games";
import type { UserContext } from "@reading-advantage/auth";
import { getCurrentUser, type SessionUser } from "@/lib/session";
import { isDragonRiderHostProofEnabled } from "@/lib/dragon-rider-host-proof-config";
import { dragonRiderCompletionRequestSchema, dragonRiderRouteError } from "@/lib/dragon-rider-host-proof-route-contract";
/** Maps the Reading session record into the shared domain actor. */
function userContext(user: SessionUser): UserContext { return { id: user.id, username: user.username, name: user.display_name ?? null, role: user.role as UserContext["role"], schoolId: user.school_id ?? null, xp: user.xp ?? 0, level: user.level ?? 1, cefrLevel: user.cefr_level ?? "" }; }
/** Replays only stored Dragon Rider evidence and returns the canonical result. */
export async function POST(request: NextRequest) { if (!isDragonRiderHostProofEnabled()) return new NextResponse(null, { status: 404 }); const session = await getCurrentUser(); if (!session) return NextResponse.json({ error: "AUTH" }, { status: 401 }); const user = userContext(session); if (!user.schoolId) return NextResponse.json({ error: "TENANT" }, { status: 403 }); try { const body = dragonRiderCompletionRequestSchema.parse(await request.json()); const result = await completeDragonRiderHostProofAttempt({ userId: user.id, schoolId: user.schoolId }, body, createDragonRiderHostProofAttemptDependencies({ db: createTenantDB(db, { schoolId: user.schoolId }), user, tenant: { schoolId: user.schoolId }, secret: process.env.HOST_PROOF_ATTEMPT_SECRET ?? "" })); return NextResponse.json(result); } catch (error) { return dragonRiderRouteError(error); } }
