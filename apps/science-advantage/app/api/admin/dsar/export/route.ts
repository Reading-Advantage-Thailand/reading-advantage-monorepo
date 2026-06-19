import { z } from "zod";
import { runWithRequestContext } from '@/lib/observability/context';
import { randomUUID } from 'crypto';
import { NextRequest } from "next/server";
import { db } from "@reading-advantage/db";
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

    // 3. Export
    const bundle = await exportSubjectData({
      db,
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
