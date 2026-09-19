/**
 * Phase 7 — audit identity persistence and client response minimization.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const {
  selectMock,
  insertMock,
  updateMock,
  transactionMock,
  transactionInsertMock,
  requireMarketingPermissionMock,
} = vi.hoisted(() => ({
  selectMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
  transactionMock: vi.fn(),
  transactionInsertMock: vi.fn(),
  requireMarketingPermissionMock: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), init),
  },
}));

vi.mock("@/lib/auth", () => ({
  requireMarketingPermission: requireMarketingPermissionMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    update: updateMock,
    transaction: transactionMock,
  },
}));

import {
  GET as getCampaigns,
  POST as postCampaign,
} from "@/api/campaigns/route";
import {
  GET as getCampaign,
  PATCH as patchCampaign,
} from "@/api/campaigns/[id]/route";
import {
  GET as getProjects,
  PATCH as patchProject,
  POST as postProject,
} from "@/api/video/projects/route";
import { POST as saveTopics } from "@/api/video/save-topics/route";

const VERIFIED_USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SPOOFED_USER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CAMPAIGN_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";

const campaignClientKeys = [
  "id",
  "type",
  "app",
  "name",
  "status",
  "createdAt",
  "updatedAt",
] as const;

const projectClientKeys = [
  "id",
  "campaignId",
  "topic",
  "script",
  "status",
  "createdAt",
  "updatedAt",
] as const;

const script = [
  {
    narration: "Scene one",
    imagePrompt: "A classroom",
    motionDirection: "Static",
  },
  {
    narration: "Scene two",
    imagePrompt: "A book",
    motionDirection: "Pan",
  },
  {
    narration: "Scene three",
    imagePrompt: "A reader",
    motionDirection: "Zoom",
  },
  {
    narration: "Scene four",
    imagePrompt: "A lesson",
    motionDirection: "Fade",
  },
  {
    narration: "Scene five",
    imagePrompt: "A school",
    motionDirection: "Static",
  },
];

const campaignRow = {
  id: CAMPAIGN_ID,
  type: "video",
  app: "reading-advantage",
  name: "Audit identity campaign",
  status: "draft",
  createdAt: "2026-08-19T00:00:00.000Z",
  updatedAt: "2026-08-19T00:00:00.000Z",
  createdBy: VERIFIED_USER_ID,
  updatedBy: VERIFIED_USER_ID,
};

const projectRow = {
  id: PROJECT_ID,
  campaignId: CAMPAIGN_ID,
  topic: "Audit identity topic",
  script,
  status: "draft",
  createdAt: "2026-08-19T00:00:00.000Z",
  updatedAt: "2026-08-19T00:00:00.000Z",
  createdBy: VERIFIED_USER_ID,
  updatedBy: VERIFIED_USER_ID,
};

/** Builds a valid JSON request for a route handler. */
function jsonRequest(url: string, method: string, body: unknown): Request {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Projects mocked database rows according to the explicit Drizzle selection. */
function projectRows(rows: unknown[], selection: unknown): unknown[] {
  if (!selection || typeof selection !== "object" || Array.isArray(selection)) {
    return rows;
  }

  const keys = Object.keys(selection);
  return rows.map((row) => {
    if (!row || typeof row !== "object") return row;
    const record = row as Record<string, unknown>;
    return Object.fromEntries(keys.map((key) => [key, record[key]]));
  });
}

/** Configures a chainable mocked Drizzle select. */
function configureSelect(rows: unknown[]): void {
  selectMock.mockImplementation((selection: unknown) => {
    const projected = projectRows(rows, selection);
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(projected),
        orderBy: vi.fn().mockResolvedValue(projected),
      }),
    };
  });
}

/** Configures a chainable mocked Drizzle insert and returns its captured calls. */
function configureInsert(rows: unknown[]) {
  const returningMock = vi.fn((selection: unknown) =>
    Promise.resolve(projectRows(rows, selection)),
  );
  const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
  insertMock.mockImplementation(() => ({ values: valuesMock }));
  return { returningMock, valuesMock };
}

/** Configures a chainable mocked Drizzle update and returns its captured calls. */
function configureUpdate(rows: unknown[]) {
  const returningMock = vi.fn((selection: unknown) =>
    Promise.resolve(projectRows(rows, selection)),
  );
  const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
  const setMock = vi.fn().mockReturnValue({ where: whereMock });
  updateMock.mockImplementation(() => ({ set: setMock }));
  return { returningMock, setMock };
}

/** Configures the conflict-safe topic insert used by the route. */
function configureTopicInsert(): ReturnType<typeof vi.fn> {
  const topicValuesMock = vi.fn().mockReturnValue({
    onConflictDoNothing: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ normalizedKey: "audit-topic" }]),
    }),
  });
  transactionInsertMock.mockImplementation(() => ({ values: topicValuesMock }));
  transactionMock.mockImplementation(async (callback) =>
    callback({ insert: transactionInsertMock }),
  );
  return topicValuesMock;
}

/** Asserts that an explicit client-safe column map was passed to Drizzle. */
function expectClientMap(
  selection: unknown,
  expectedKeys: readonly string[],
): void {
  expect(selection).toBeDefined();
  const keys = Object.keys(selection as Record<string, unknown>);
  expect(keys).toHaveLength(expectedKeys.length);
  expect(keys).toEqual(expect.arrayContaining([...expectedKeys]));
  expect(keys).not.toContain("createdBy");
  expect(keys).not.toContain("updatedBy");
}

/** Asserts that a successful client response contains no actor UUID fields. */
async function expectResponseWithoutActors(response: Response): Promise<void> {
  expect(response.status).toBe(200);
  const body = (await response.json()) as unknown;
  const rows = Array.isArray(body) ? body : [body];
  for (const row of rows) {
    expect(row).not.toHaveProperty("createdBy");
    expect(row).not.toHaveProperty("updatedBy");
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  requireMarketingPermissionMock.mockResolvedValue({
    ok: true,
    session: { user: { id: VERIFIED_USER_ID, role: "MEMBER" } },
  });
});

describe("Phase 7: verified audit identity persistence", () => {
  it("persists only the verified actor on campaign create", async () => {
    const { valuesMock } = configureInsert([campaignRow]);

    await postCampaign(
      jsonRequest("http://localhost/api/campaigns", "POST", {
        type: "video",
        app: "reading-advantage",
        name: campaignRow.name,
      }),
    );

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: VERIFIED_USER_ID }),
    );
    expect(valuesMock.mock.calls[0]?.[0]).not.toEqual(
      expect.objectContaining({ createdBy: SPOOFED_USER_ID }),
    );
  });

  it("persists only the verified actor on video-project create", async () => {
    const { valuesMock } = configureInsert([projectRow]);

    await postProject(
      jsonRequest("http://localhost/api/video/projects", "POST", {
        campaignId: CAMPAIGN_ID,
        topic: projectRow.topic,
        script,
      }),
    );

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: VERIFIED_USER_ID }),
    );
    expect(valuesMock.mock.calls[0]?.[0]).not.toEqual(
      expect.objectContaining({ createdBy: SPOOFED_USER_ID }),
    );
  });

  it("persists only the verified actor on campaign update", async () => {
    configureSelect([campaignRow]);
    const { setMock } = configureUpdate([
      { ...campaignRow, status: "in-progress" },
    ]);

    await patchCampaign(
      jsonRequest("http://localhost/api/campaigns/" + CAMPAIGN_ID, "PATCH", {
        status: "in-progress",
      }),
      { params: Promise.resolve({ id: CAMPAIGN_ID }) },
    );

    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ updatedBy: VERIFIED_USER_ID }),
    );
    expect(setMock.mock.calls[0]?.[0]).not.toEqual(
      expect.objectContaining({ updatedBy: SPOOFED_USER_ID }),
    );
  });

  it("persists only the verified actor on video-project update", async () => {
    const { setMock } = configureUpdate([
      { ...projectRow, updatedBy: VERIFIED_USER_ID },
    ]);
    await patchProject(
      jsonRequest("http://localhost/api/video/projects", "PATCH", {
        id: PROJECT_ID,
        campaignId: CAMPAIGN_ID,
        topic: projectRow.topic,
        script,
      }),
    );

    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ updatedBy: VERIFIED_USER_ID }),
    );
    expect(setMock.mock.calls[0]?.[0]).not.toEqual(
      expect.objectContaining({ updatedBy: SPOOFED_USER_ID }),
    );
  });

  it("persists the verified actor on topic inserts", async () => {
    const topicValuesMock = configureTopicInsert();

    await saveTopics(
      jsonRequest("http://localhost/api/video/save-topics", "POST", {
        app: "reading-advantage",
        topics: ["Audit topic"],
      }),
    );

    expect(topicValuesMock).toHaveBeenCalledWith([
      expect.objectContaining({ createdBy: VERIFIED_USER_ID }),
    ]);
  });
});

describe("Phase 7: actor input rejection before writes", () => {
  it.each([
    [
      "campaign create",
      () =>
        postCampaign(
          jsonRequest("http://localhost/api/campaigns", "POST", {
            type: "video",
            app: "reading-advantage",
            name: "Spoofed campaign",
            createdBy: SPOOFED_USER_ID,
          }),
        ),
    ],
    [
      "campaign update",
      () =>
        patchCampaign(
          jsonRequest(
            "http://localhost/api/campaigns/" + CAMPAIGN_ID,
            "PATCH",
            {
              status: "in-progress",
              updatedBy: SPOOFED_USER_ID,
            },
          ),
          { params: Promise.resolve({ id: CAMPAIGN_ID }) },
        ),
    ],
    [
      "video-project create",
      () =>
        postProject(
          jsonRequest("http://localhost/api/video/projects", "POST", {
            campaignId: CAMPAIGN_ID,
            topic: "Spoofed project",
            script,
            createdBy: SPOOFED_USER_ID,
          }),
        ),
    ],
    [
      "video-project update",
      () =>
        patchProject(
          jsonRequest("http://localhost/api/video/projects", "PATCH", {
            id: PROJECT_ID,
            campaignId: CAMPAIGN_ID,
            topic: "Spoofed project",
            script,
            updatedBy: SPOOFED_USER_ID,
          }),
        ),
    ],
    [
      "topic insert",
      () =>
        saveTopics(
          jsonRequest("http://localhost/api/video/save-topics", "POST", {
            app: "reading-advantage",
            topics: ["Spoofed topic"],
            createdBy: SPOOFED_USER_ID,
          }),
        ),
    ],
  ])(
    "rejects caller actor fields on %s before database writes",
    async (_, call) => {
      const response = await call();

      expect(response.status).toBe(400);
      expect(insertMock).not.toHaveBeenCalled();
      expect(updateMock).not.toHaveBeenCalled();
      expect(transactionMock).not.toHaveBeenCalled();
      expect(selectMock).not.toHaveBeenCalled();
    },
  );
});

describe("Phase 7: MEMBER response minimization", () => {
  it("minimizes campaign list GET responses with an explicit select map", async () => {
    configureSelect([campaignRow]);

    await expectResponseWithoutActors(
      await getCampaigns(new Request("http://localhost/api/campaigns")),
    );
    expectClientMap(selectMock.mock.calls[0]?.[0], campaignClientKeys);
  });

  it("minimizes campaign GET responses with an explicit select map", async () => {
    configureSelect([campaignRow]);

    await expectResponseWithoutActors(
      await getCampaign(
        new Request("http://localhost/api/campaigns/" + CAMPAIGN_ID),
        { params: Promise.resolve({ id: CAMPAIGN_ID }) },
      ),
    );
    expectClientMap(selectMock.mock.calls[0]?.[0], campaignClientKeys);
  });

  it("minimizes campaign POST responses with an explicit returning map", async () => {
    const { returningMock } = configureInsert([campaignRow]);

    await expectResponseWithoutActors(
      await postCampaign(
        jsonRequest("http://localhost/api/campaigns", "POST", {
          type: "video",
          app: "reading-advantage",
          name: campaignRow.name,
        }),
      ),
    );
    expectClientMap(returningMock.mock.calls[0]?.[0], campaignClientKeys);
  });

  it("minimizes campaign PATCH responses with an explicit returning map", async () => {
    configureSelect([campaignRow]);
    const { returningMock } = configureUpdate([
      { ...campaignRow, status: "in-progress" },
    ]);

    await expectResponseWithoutActors(
      await patchCampaign(
        jsonRequest("http://localhost/api/campaigns/" + CAMPAIGN_ID, "PATCH", {
          status: "in-progress",
        }),
        { params: Promise.resolve({ id: CAMPAIGN_ID }) },
      ),
    );
    expectClientMap(returningMock.mock.calls[0]?.[0], campaignClientKeys);
  });

  it("minimizes video-project GET responses with an explicit select map", async () => {
    configureSelect([projectRow]);

    await expectResponseWithoutActors(
      await getProjects(
        new Request(
          "http://localhost/api/video/projects?campaignId=" + CAMPAIGN_ID,
        ),
      ),
    );
    expectClientMap(selectMock.mock.calls[0]?.[0], projectClientKeys);
  });

  it("minimizes video-project POST responses with an explicit returning map", async () => {
    const { returningMock } = configureInsert([projectRow]);

    await expectResponseWithoutActors(
      await postProject(
        jsonRequest("http://localhost/api/video/projects", "POST", {
          campaignId: CAMPAIGN_ID,
          topic: projectRow.topic,
          script,
        }),
      ),
    );
    expectClientMap(returningMock.mock.calls[0]?.[0], projectClientKeys);
  });

  it("minimizes video-project PATCH responses with an explicit returning map", async () => {
    const { returningMock } = configureUpdate([
      { ...projectRow, topic: "Updated topic" },
    ]);

    await expectResponseWithoutActors(
      await patchProject(
        jsonRequest("http://localhost/api/video/projects", "PATCH", {
          id: PROJECT_ID,
          campaignId: CAMPAIGN_ID,
          topic: "Updated topic",
          script,
        }),
      ),
    );
    expectClientMap(returningMock.mock.calls[0]?.[0], projectClientKeys);
  });

  it("uses projection maps rather than deleting actors after fetching", () => {
    const sources = [
      "api/campaigns/route.ts",
      "api/campaigns/[id]/route.ts",
      "api/video/projects/route.ts",
    ].map((relativePath) =>
      readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"),
    );

    for (const source of sources) {
      expect(source).toMatch(/select\(\s*\w+ClientColumns\s*\)/);
      expect(source).not.toMatch(/\bdelete\s+\w+\.(?:createdBy|updatedBy)/);
    }
  });
});
