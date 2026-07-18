/**
 * Phase 2 — Marketing App Public Workflow Security (Wave 3)
 * Group 2A: Settings decrypted-secret leak and authentication boundary.
 *
 * Target: app/api/settings/route.ts
 * Evidence: LR-marketing-app-003-005 (decrypted API-key leak), LR-004-002.
 *
 * Auth seam: routes must reject unauthenticated callers before touching
 * encrypted secrets. The mock keeps requireAuth/getSession behaviorally real:
 * a known session token resolves to a staff session, everything else resolves
 * to null, and the guard throws AuthError("Authentication required", "UNAUTHORIZED").
 */

import { describe, expect, it, vi, type Mock } from "vitest";
import { db } from "@reading-advantage/db";
import {
  KNOWN_TOKEN,
  authedRequest,
  introspectMarketingSession,
} from "./helpers/auth-mock";

// Encryption key fallback matching the Phase 3 settings tests.
process.env.ENCRYPTION_KEY ??=
  "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";

// ─────────────────────────────────────────────────────────────────────
// Mock Next.js server primitives so route handlers run in node env.
// ─────────────────────────────────────────────────────────────────────
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), init),
  },
}));

// ─────────────────────────────────────────────────────────────────────
// Mock Drizzle client so tests are deterministic and DB-less.
// ─────────────────────────────────────────────────────────────────────
vi.mock("@reading-advantage/db", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/db")>(
    "@reading-advantage/db",
  );
  return {
    ...actual,
    sql: Object.assign(
      (strings: TemplateStringsArray, ...values: unknown[]) => ({
        strings,
        values,
      }),
      { raw: (strings: TemplateStringsArray) => strings },
    ),
    db: {
      execute: vi.fn(),
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
    },
  };
});

// Future auth contract: GET will accept a Request to read the session cookie.
type RouteGET = (request: Request) => Promise<Response>;

function unauthedRequest(url: string, init: RequestInit = {}): Request {
  return new Request(url, init);
}

function makeInsertChainMock() {
  const valuesMock = vi.fn();
  const onConflictDoUpdateMock = vi.fn();
  const insertMock = vi.fn();
  insertMock.mockReturnValue({ values: valuesMock });
  valuesMock.mockReturnValue({
    onConflictDoUpdate: onConflictDoUpdateMock,
  });
  onConflictDoUpdateMock.mockResolvedValue(undefined);
  return { insertMock, valuesMock, onConflictDoUpdateMock };
}

describe("Phase 2A: Settings auth — unauthenticated boundary (RED at baseline)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/settings without session returns 401 and leaks no secret", async () => {
    const { GET: rawGET } = await import("@/api/settings/route");
    const GET = rawGET as RouteGET;
    const { encrypt } = await import("../lib/encryption.js");
    const secretPlaintext = "sk-w3-settings-secret-12345";
    const secretCiphertext = encrypt(secretPlaintext);

    // If the route reaches the DB, make it return the encrypted secret so
    // the test can prove the secret does not leak even when present in DB.
    (db.select as Mock).mockImplementation(() => ({
      from: vi.fn().mockResolvedValue([
        { key: "llm.provider", value: "google" },
        { key: "llm.model", value: "gemini-pro" },
        { key: "llm.apiKey", value: secretCiphertext },
      ]),
    }));

    const encryptionMod = await import("../lib/encryption.js");
    const decryptSpy = vi.spyOn(encryptionMod, "decrypt");

    const response = await GET(unauthedRequest("http://localhost/api/settings"));

    expect(response.status).toBe(401);
    const body = await response.text();
    // Exact-literal leak checks (A7): neither plaintext nor ciphertext may
    // appear in the unauthenticated response body.
    expect(body).not.toContain(secretPlaintext);
    expect(body).not.toContain(secretCiphertext);
    // Side-effect proof: guard short-circuits before decrypt and before DB.
    expect(decryptSpy).not.toHaveBeenCalled();
    expect(db.select).not.toHaveBeenCalled();
  });

  it("POST /api/settings without session returns 401 and performs no insert", async () => {
    const { POST } = await import("@/api/settings/route");
    const { insertMock } = makeInsertChainMock();
    (db.insert as Mock).mockImplementation(insertMock);

    const response = await POST(
      unauthedRequest("http://localhost/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ "llm.apiKey": "sk-w3-settings-secret-12345" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(db.insert).not.toHaveBeenCalled();
  });
});

describe("Phase 2A: Settings auth — authenticated positive controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/settings with valid session returns 200", async () => {
    const { GET: rawGET } = await import("@/api/settings/route");
    const GET = rawGET as RouteGET;
    const { encrypt } = await import("../lib/encryption.js");
    const secretCiphertext = encrypt("sk-w3-settings-secret-12345");

    const selectFromMock = vi.fn().mockResolvedValue([
      { key: "llm.provider", value: "google" },
      { key: "llm.model", value: "gemini-pro" },
      { key: "llm.apiKey", value: secretCiphertext },
      { key: "tools.mmxPath", value: "/usr/local/bin/mmx" },
    ]);
    (db.select as Mock).mockImplementation(() => ({ from: selectFromMock }));

    const response = await GET(authedRequest("http://localhost/api/settings"));

    expect(response.status).toBe(200);
    expect(introspectMarketingSession).toHaveBeenCalledWith(KNOWN_TOKEN);
  });

  // [NEEDS-PO] This hardening assertion is pending product-owner confirmation
  // on whether authenticated GET should mask secrets. It is kept as a Red
  // contract because the current route returns decrypted plaintext.
  it("GET /api/settings with valid session does not return decrypted secret values", async () => {
    const { GET: rawGET } = await import("@/api/settings/route");
    const GET = rawGET as RouteGET;
    const { encrypt } = await import("../lib/encryption.js");
    const secretPlaintext = "sk-w3-settings-secret-12345";
    const secretCiphertext = encrypt(secretPlaintext);

    const selectFromMock = vi.fn().mockResolvedValue([
      { key: "llm.apiKey", value: secretCiphertext },
    ]);
    (db.select as Mock).mockImplementation(() => ({ from: selectFromMock }));

    const response = await GET(authedRequest("http://localhost/api/settings"));
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).not.toContain(secretPlaintext);
  });

  it("POST /api/settings with valid session proceeds past the guard", async () => {
    const { POST } = await import("@/api/settings/route");
    const { insertMock } = makeInsertChainMock();
    (db.insert as Mock).mockImplementation(insertMock);

    const response = await POST(
      authedRequest("http://localhost/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ "tools.mmxPath": "/usr/local/bin/mmx" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(db.insert).toHaveBeenCalled();
  });
});
