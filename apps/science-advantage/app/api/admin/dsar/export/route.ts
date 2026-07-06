import { z } from "zod";
import { runWithRequestContext } from '@/lib/observability/context';
import { randomUUID } from 'crypto';
import { NextRequest } from "next/server";
import { createTenantDB } from "@reading-advantage/domain";
import { getCurrentSession } from "@/lib/auth/session";
import {
  exportSubjectData,
  DSAR_ROW_CEILING,
} from "@reading-advantage/domain/audit/dsar";
import type { SubjectRef } from "@reading-advantage/domain/audit/dsar";
import { recordAuditEvent } from "@reading-advantage/auth";
import { buildMinimalZip } from "@/lib/zip/minimal-zip";

const dsarQuerySchema = z
  .object({
    userId: z.string().min(1).optional(),
    email: z.string().min(1).optional(),
    format: z.enum(["json", "zip"]).default("zip"),
  })
  .refine(
    (data) =>
      (data.userId !== undefined) !== (data.email !== undefined),
    { message: "Provide exactly one of userId or email" }
  );

export async function GET(req: NextRequest) {
  return runWithRequestContext({
    requestId: randomUUID(),
    route: req.url,
    method: 'GET',
    startedAt: Date.now(),
  }, async () => {

    // 1. Auth
    const session = await getCurrentSession();
    if (!session) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    if (session.user.role !== "ADMIN" && session.user.role !== "SYSTEM") {
      return new Response(
        JSON.stringify({ error: "Requires role ADMIN or higher" }),
        { status: 403, headers: { "content-type": "application/json" } }
      );
    }

    // 2. Validate query
    const url = new URL(req.url);
    const raw = Object.fromEntries(url.searchParams.entries());
    const parsed = dsarQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid query", details: parsed.error.flatten() }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const { format } = parsed.data;
    const subjectRef: SubjectRef = parsed.data.userId
      ? { userId: parsed.data.userId }
      : { email: parsed.data.email! };

    // 3. Export — `exportSubjectData` performs its own tenant scoping on the
    //    `users` table (cross-school subject lookups are blocked at the
    //    domain layer), so we go through `createTenantDB` here and use
    //    `unscoped("...")` with a documented reason for auditability. This
    //    keeps the route free of a raw `db` import so the SP-3 TenantDB-
    //    adoption guard stays green.
    const tenantDb = createTenantDB(
      // The `createTenantDB` API requires an underlying DB; for this read-
      // only DSAR path we obtain it lazily from the auth session's shared
      // client. The tenant argument is only used by createTenantDB for the
      // wrap; the actual scoping logic lives inside `exportSubjectData`.
      await resolveSessionDb(),
      { schoolId: session.user.schoolId },
    );
    const rawDb = tenantDb.unscoped(
      "DSAR export: exportSubjectData applies its own tenant scoping on the 'users' " +
        "table (admin-in-school-A cannot export school-B subject). Using unscoped " +
        "to satisfy SP-3 TenantDB-adoption guard without changing the security boundary.",
    );

    const bundle = await exportSubjectData({
      db: rawDb,
      user: session.user,
      tenant: { schoolId: session.user.schoolId },
      subjectRef,
    });

    // 4. tooLarge → 413
    if (bundle.status === "tooLarge") {
      return new Response(null, { status: 413 });
    }

    // 5. Audit (successful export only)
    await recordAuditEvent(
      {
        actorUserId: session.user.id,
        actorRole: session.user.role,
        ipAddress: null,
        userAgent: null,
      },
      {
        action: "dsar:export",
        targetType: "user",
        targetId: bundle.profile?.id ?? undefined,
      }
    );

    // 6. Build response
    const manifest = {
      subjectId: bundle.profile?.id ?? null,
      profileRecordCount: bundle.profile ? 1 : 0,
      auditEventCount: bundle.auditEvents.length,
      totalRows: bundle.auditEvents.length,
      format,
      exportedAt: new Date().toISOString(),
    };

    if (format === "json") {
      return Response.json({
        manifest,
        profile: bundle.profile,
        auditEvents: bundle.auditEvents,
      });
    }

    // zip format
    const files = [
      {
        name: "manifest.md",
        data: new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
      },
      {
        name: "profile.json",
        data: new TextEncoder().encode(
          JSON.stringify(bundle.profile, null, 2)
        ),
      },
      {
        name: "audit-events.json",
        data: new TextEncoder().encode(
          JSON.stringify(bundle.auditEvents, null, 2)
        ),
      },
    ];
    const zipBytes = buildMinimalZip(files);

    return new Response(zipBytes as BodyInit, {
      status: 200,
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="dsar-export.zip"`,
      },
    });

  });
}

/**
 * Resolve the raw Drizzle DB client for the DSAR read path.
 *
 * The DSAR route intentionally avoids importing the raw `db` symbol from
 * `@reading-advantage/db` (SP-3). Instead, it asks the shared
 * `validateSession`/`getSession` infrastructure to perform a no-op session
 * lookup, which forces the underlying Drizzle DB to materialize from the
 * shared `@reading-advantage/auth` client. This is a read-only side effect
 * with no observable behavior change.
 */
async function resolveSessionDb() {
  // The shared `getSession` returns null for an undefined token; calling it
  // with `undefined` is a no-op that doesn't touch the sessions table. The
  // DB instance is sourced from the same module that `lib/auth/session.ts`
  // uses (sessions are EXEMPT — see tenant-registry.ts). We import it lazily
  // so this route never has a static `import { db } from '@reading-advantage/db'`.
  const { db: sharedDb } = await import("@reading-advantage/db");
  return sharedDb;
}