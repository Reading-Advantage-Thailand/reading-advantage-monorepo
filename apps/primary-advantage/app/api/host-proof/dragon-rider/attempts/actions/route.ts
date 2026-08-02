import { NextRequest, NextResponse } from "next/server";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import { attestDragonRiderHostProofAction, createDragonRiderHostProofAttemptDependencies } from "@reading-advantage/domain/games";
import type { UserContext } from "@reading-advantage/auth";
import { getCurrentUser } from "@/lib/session";
import { isDragonRiderHostProofEnabled } from "@/lib/dragon-rider-host-proof-config";
import { dragonRiderActionRequestSchema, dragonRiderRouteError } from "@/lib/dragon-rider-host-proof-route-contract";
/** Records one strict Dragon Rider action envelope and returns a server receipt. */
export async function POST(request: NextRequest) { if (!isDragonRiderHostProofEnabled()) return new NextResponse(null, { status: 404 }); const session = await getCurrentUser(); if (!session) return NextResponse.json({ error: "AUTH" }, { status: 401 }); const user = session as UserContext; if (!user.schoolId) return NextResponse.json({ error: "TENANT" }, { status: 403 }); try { const body = dragonRiderActionRequestSchema.parse(await request.json()); const result = await attestDragonRiderHostProofAction({ userId: user.id, schoolId: user.schoolId }, body, createDragonRiderHostProofAttemptDependencies({ db: createTenantDB(db, { schoolId: user.schoolId }), user, tenant: { schoolId: user.schoolId }, secret: process.env.HOST_PROOF_ATTEMPT_SECRET ?? "" })); return NextResponse.json(result); } catch (error) { return dragonRiderRouteError(error); } }
