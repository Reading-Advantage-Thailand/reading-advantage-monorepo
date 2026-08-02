import { NextRequest, NextResponse } from "next/server";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import { createDragonRiderHostProofAttemptDependencies, issueDragonRiderHostProofAttempt } from "@reading-advantage/domain/games";
import type { UserContext } from "@reading-advantage/auth";
import { getCurrentUser } from "@/lib/session";
import { isDragonRiderHostProofEnabled } from "@/lib/dragon-rider-host-proof-config";
import { dragonRiderIssueRequestSchema, dragonRiderRouteError } from "@/lib/dragon-rider-host-proof-route-contract";
/** Issues an isolated Dragon Rider attempt using only authenticated tenant state. */
export async function POST(request: NextRequest) { if (!isDragonRiderHostProofEnabled()) return new NextResponse(null, { status: 404 }); const session = await getCurrentUser(); if (!session) return NextResponse.json({ error: "AUTH" }, { status: 401 }); const user = session as UserContext; if (!user.schoolId) return NextResponse.json({ error: "TENANT" }, { status: 403 }); try { const body = dragonRiderIssueRequestSchema.parse(await request.json()); const attempt = await issueDragonRiderHostProofAttempt({ userId: user.id, schoolId: user.schoolId }, body, createDragonRiderHostProofAttemptDependencies({ db: createTenantDB(db, { schoolId: user.schoolId }), user, tenant: { schoolId: user.schoolId }, secret: process.env.HOST_PROOF_ATTEMPT_SECRET ?? "" })); return NextResponse.json(attempt, { status: 201 }); } catch (error) { return dragonRiderRouteError(error); } }
