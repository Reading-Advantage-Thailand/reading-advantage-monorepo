/**
 * Phase 7.1 — Marketing schema integrity Red contracts.
 *
 * This file owns the Marketing-app side of the schema contract: live duplicate
 * topic behavior, route write-boundary characterization, and the shared app
 * catalog consumed by client pages.
 */

import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { authedRequest } from "./helpers/auth-mock";

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), init),
  },
}));

const { insertMock, updateMock, requireMarketingPermissionMock } = vi.hoisted(
  () => ({
    insertMock: vi.fn(),
    updateMock: vi.fn(),
    requireMarketingPermissionMock: vi.fn(async () => ({
      ok: true,
      session: { user: { id: "marketing-admin", role: "ADMIN" } },
    })),
  }),
);

vi.mock("@/lib/db", () => ({
  db: {
    insert: insertMock,
    update: updateMock,
  },
}));

vi.mock("@/lib/auth", () => ({
  requireMarketingPermission: requireMarketingPermissionMock,
}));

import { PATCH, POST } from "@/api/video/projects/route";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, "../../../..");
const TOPIC_MIGRATION = readFileSync(
  resolve(
    REPO_ROOT,
    "packages/db/drizzle/0041_marketing_past_topic_normalized_key.sql",
  ),
  "utf8",
);

const OLD_PAST_TOPICS_SCHEMA = `
  CREATE TABLE past_topics (
    id uuid PRIMARY KEY,
    app text NOT NULL,
    topic text NOT NULL,
    created_at timestamp NOT NULL DEFAULT now()
  );
`;

let client: PGlite | null = null;

const CAMPAIGN_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";

function projectRequest(
  method: "POST" | "PATCH",
  body: Record<string, unknown>,
): Request {
  return authedRequest("http://localhost/api/video/projects", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function appSource(relativePath: string): string {
  return readFileSync(
    resolve(REPO_ROOT, "apps/marketing/app", relativePath),
    "utf8",
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(async () => {
  await client?.close();
  client = null;
});

describe("Phase 7.1: past_topics duplicate behavior", () => {
  it("characterizes rejection of an exact duplicate app/topic pair", async () => {
    client = new PGlite();
    await client.exec(OLD_PAST_TOPICS_SCHEMA);
    await client.exec(`BEGIN; ${TOPIC_MIGRATION} COMMIT;`);

    await client.exec(`
      INSERT INTO past_topics (id, app, topic)
      VALUES ('11111111-1111-4111-8111-111111111111', 'reading-advantage', 'Hello Topic');
    `);

    await expect(
      client.exec(`
        INSERT INTO past_topics (id, app, topic)
        VALUES ('22222222-2222-4222-8222-222222222222', 'reading-advantage', 'Hello Topic');
      `),
    ).rejects.toThrow(/duplicate|unique/i);
  }, 60_000);

  it("characterizes rejection when case and whitespace normalize to the same topic", async () => {
    client = new PGlite();
    await client.exec(OLD_PAST_TOPICS_SCHEMA);
    await client.exec(`BEGIN; ${TOPIC_MIGRATION} COMMIT;`);

    await client.exec(`
      INSERT INTO past_topics (id, app, topic)
      VALUES ('33333333-3333-4333-8333-333333333333', 'reading-advantage', 'Hello Topic');
    `);

    await expect(
      client.exec(`
        INSERT INTO past_topics (id, app, topic)
        VALUES ('44444444-4444-4444-8444-444444444444', 'reading-advantage', '  hello   topic  ');
      `),
    ).rejects.toThrow(/duplicate|unique/i);
  }, 60_000);

  it("characterizes the same topic as valid for a different app", async () => {
    client = new PGlite();
    await client.exec(OLD_PAST_TOPICS_SCHEMA);
    await client.exec(`BEGIN; ${TOPIC_MIGRATION} COMMIT;`);

    await client.exec(`
      INSERT INTO past_topics (id, app, topic)
      VALUES ('55555555-5555-4555-8555-555555555555', 'reading-advantage', 'Hello Topic');
    `);

    await expect(
      client.exec(`
        INSERT INTO past_topics (id, app, topic)
        VALUES ('66666666-6666-4666-8666-666666666666', 'primary-advantage', 'Hello Topic');
      `),
    ).resolves.not.toThrow();
  }, 60_000);
});

describe("Phase 7.1: videoProjects.script write boundary", () => {
  it("rejects a non-array script on POST before touching the database", async () => {
    const response = await POST(
      projectRequest("POST", {
        campaignId: CAMPAIGN_ID,
        topic: "A topic",
        script: { narration: "not an array" },
      }),
    );

    expect(response.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects a short script on PATCH before touching the database", async () => {
    const response = await PATCH(
      projectRequest("PATCH", {
        id: PROJECT_ID,
        campaignId: CAMPAIGN_ID,
        topic: "A topic",
        script: [
          {
            narration: "Only one scene",
            imagePrompt: "An image",
            motionDirection: "Static",
          },
        ],
      }),
    );

    expect(response.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("Phase 7.1: shared APPS catalog", () => {
  it("provides one shared APPS tuple for the client app maps", () => {
    const modulePath = resolve(REPO_ROOT, "apps/marketing/app/lib/apps.ts");
    expect(existsSync(modulePath), "shared apps module is missing").toBe(true);
    if (!existsSync(modulePath)) return;

    const sharedAppsSource = readFileSync(modulePath, "utf8");
    const campaignsSource = appSource("campaigns/page.tsx");
    const videoSource = appSource("campaigns/[id]/video/page.tsx");

    expect(sharedAppsSource).toMatch(
      /(?:import|export)\s*\{[^}]*\bAPPS\b[^}]*\}\s*from\s*["']@reading-advantage\/db\/marketing-constants["']/,
    );
    expect(sharedAppsSource).not.toMatch(/@reading-advantage\/db\/schema/);
    expect(sharedAppsSource).not.toMatch(/drizzle-orm/);
    expect(sharedAppsSource).not.toMatch(/(?:export\s+)?const\s+APPS\s*=\s*\[/);
    const colorDeclaration = sharedAppsSource.match(
      /export\s+const\s+APP_COLORS\b[\s\S]*?(?=\nexport\s+const|$)/,
    );
    expect(
      colorDeclaration,
      "APP_COLORS is not exported from the shared module",
    ).not.toBeNull();
    expect(colorDeclaration?.[0]).toMatch(/\bAPPS\b/);
    expect(sharedAppsSource).not.toMatch(/APP_NAME_VALUES|APP_NAMES/);

    expect(campaignsSource).toMatch(
      /APP_COLORS[\s\S]*from\s+["']@\/lib\/apps["']/,
    );
    expect(videoSource).toMatch(
      /getMarketingAppName[\s\S]*from\s+["']@\/lib\/i18n["']/,
    );
    expect(campaignsSource).not.toMatch(/const\s+APP_COLORS\s*:/);
    expect(videoSource).not.toMatch(/APP_NAMES/);

    expect(colorDeclaration?.[0]).toMatch(/Object\.fromEntries\(\s*APPS\.map\(/);
  });

  it("derives route app values from one shared MarketingApp type", () => {
    const routeSources = [
      "api/campaigns/route.ts",
      "api/video/research-topics/route.ts",
      "api/video/save-topics/route.ts",
    ].map(appSource);

    for (const source of routeSources) {
      expect(source).toMatch(/as\s+MarketingApp\b/);
      expect(source).toMatch(/["']@\/lib\/apps["']/);
      expect(source).not.toMatch(/"tutor-advantage"\s*\|/);
    }

    const sharedAppsText = appSource("lib/apps.ts");
    expect(sharedAppsText).toMatch(
      /export\s+type\s+MarketingApp\s*=\s*\(typeof\s+APPS\)\[number\]/,
    );
  });

  it("keeps the VideoProject response audit fields aligned with the schema", () => {
    const videoSource = appSource("campaigns/[id]/video/page.tsx");
    expect(videoSource).toMatch(
      /interface\s+VideoProject[\s\S]*updatedAt:\s*string/,
    );
    expect(videoSource).not.toMatch(
      /interface\s+VideoProject[\s\S]*createdBy:/,
    );
    expect(videoSource).not.toMatch(
      /interface\s+VideoProject[\s\S]*updatedBy:/,
    );
  });
});

describe("Phase 7.1: shared campaign client contract", () => {
  it("serves both campaign routes from one shared client column set", () => {
    const routeSources = ["api/campaigns/route.ts", "api/campaigns/[id]/route.ts"].map(
      appSource,
    );

    for (const source of routeSources) {
      expect(source).toMatch(
        /import\s*\{[^}]*\bcampaignClientColumns\b[^}]*\}\s*from\s*["']@\/lib\/campaign-schema["']/,
      );
      expect(source).not.toMatch(/const\s+campaignClientColumns\s*=\s*\{/);
    }

    const sharedSchemaSource = appSource("lib/campaign-schema.ts");
    expect(sharedSchemaSource).toMatch(
      /export\s+const\s+campaignClientColumns\s*=\s*\{/,
    );
    expect(sharedSchemaSource).toMatch(
      /export\s+interface\s+Campaign\s*\{/,
    );
  });

  it("imports the shared Campaign type instead of hand-declared page copies", () => {
    const pageSources = [
      "campaigns/page.tsx",
      "campaigns/[id]/page.tsx",
      "campaigns/[id]/video/page.tsx",
    ].map(appSource);

    for (const source of pageSources) {
      expect(source).not.toMatch(/interface\s+Campaign\s*\{/);
      expect(source).toMatch(
        /import\s+type\s+\{\s*Campaign\s*\}\s*from\s*["']@\/lib\/campaign-schema["']/,
      );
    }

    expect(pageSources[2]).not.toMatch(/useState<any>\(null\)/);
  });
});
