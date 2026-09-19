/**
 * `/api/video/projects` — list, create, and update persisted campaign video
 * projects.
 *
 * **Auth policy:** a Marketing application session is required before any
 * database read or write.
 *
 * **Tenant/owner policy:** Marketing campaigns are global-internal. Updates
 * are constrained by both project id and campaign id so a project cannot be
 * moved across campaigns through this transport.
 *
 * @see apps/marketing/app/lib/auth.ts
 */
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { videoProjects } from "@reading-advantage/db/schema";
import { scriptSchema } from "@/lib/script-schema";
import { requireMarketingPermission } from "@/lib/auth";
import { noStoreJson, withNoStore } from "@/lib/response";

const idSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "Expected a UUID",
  );

const projectWriteSchema = z
  .object({
    campaignId: idSchema,
    topic: z.string().trim().min(1).max(500),
    script: scriptSchema,
  })
  .strict();

const projectUpdateSchema = projectWriteSchema
  .extend({
    id: idSchema,
  })
  .strict();

const projectClientColumns = {
  id: videoProjects.id,
  campaignId: videoProjects.campaignId,
  topic: videoProjects.topic,
  script: videoProjects.script,
  status: videoProjects.status,
  createdAt: videoProjects.createdAt,
  updatedAt: videoProjects.updatedAt,
};

/**
 * GET /api/video/projects?campaignId=... lists persisted projects for a
 * campaign.
 * @param request The authenticated request containing a campaign id query.
 * @returns A JSON response containing project rows or a structured error.
 */
export async function GET(request: Request) {
  // prettier-ignore
  const guard = await requireMarketingPermission(request, "video:projects:list");
  if (!guard.ok) {
    return withNoStore(guard.response);
  }

  const url = new URL(request.url);
  const campaignId = idSchema.safeParse(url.searchParams.get("campaignId"));

  if (!campaignId.success) {
    return noStoreJson(
      { message: "A valid campaignId query parameter is required" },
      { status: 400 },
    );
  }

  try {
    const projects = await db
      .select(projectClientColumns)
      .from(videoProjects)
      .where(eq(videoProjects.campaignId, campaignId.data));

    return noStoreJson(projects);
  } catch {
    return noStoreJson(
      { message: "Failed to list video projects" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/video/projects persists a new Zod-validated project.
 * @param request The authenticated request containing the project payload.
 * @returns A JSON response containing the inserted row or a structured error.
 */
export async function POST(request: Request) {
  // prettier-ignore
  const guard = await requireMarketingPermission(request, "video:projects:create");
  if (!guard.ok) {
    return withNoStore(guard.response);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStoreJson({ message: "Invalid JSON body" }, { status: 400 });
  }

  const validation = projectWriteSchema.safeParse(body);
  if (!validation.success) {
    return noStoreJson(
      { message: "Invalid project payload" },
      { status: 400 },
    );
  }

  try {
    const [project] = await db
      .insert(videoProjects)
      .values({
        ...validation.data,
        createdBy: guard.session.user.id,
      })
      .returning(projectClientColumns);

    return noStoreJson(project);
  } catch {
    return noStoreJson(
      { message: "Failed to save video project" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/video/projects persists edits to an existing project.
 * @param request The authenticated request containing project identity and edits.
 * @returns A JSON response containing the updated row, 404, or a structured error.
 */
export async function PATCH(request: Request) {
  // prettier-ignore
  const guard = await requireMarketingPermission(request, "video:projects:update");
  if (!guard.ok) {
    return withNoStore(guard.response);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStoreJson({ message: "Invalid JSON body" }, { status: 400 });
  }

  const validation = projectUpdateSchema.safeParse(body);
  if (!validation.success) {
    return noStoreJson(
      { message: "Invalid project payload" },
      { status: 400 },
    );
  }

  const { id, campaignId, topic, script } = validation.data;

  try {
    const [project] = await db
      .update(videoProjects)
      .set({ topic, script, updatedBy: guard.session.user.id })
      .where(
        and(eq(videoProjects.id, id), eq(videoProjects.campaignId, campaignId)),
      )
      .returning(projectClientColumns);

    if (!project) {
      return noStoreJson(
        { message: "Video project not found" },
        { status: 404 },
      );
    }

    return noStoreJson(project);
  } catch {
    return noStoreJson(
      { message: "Failed to update video project" },
      { status: 500 },
    );
  }
}
