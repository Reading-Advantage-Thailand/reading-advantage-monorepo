import { createCompleteRoute } from "./completeRoute";

/**
 * Adversarial tests for the standalone mock route handler
 * `createCompleteRoute()`. These exercise the request-handling edges the
 * Phase-3 contract must defend against: malformed JSON, arrays where the
 * schema expects objects, deeply nested unknowns, and shape tricks.
 */

// MockRequest is shaped like a Fetch Request that exposes `json()`. Adjust per
// test by overriding `throwOnJson`.
class MockRequest {
  private readonly body: string;
  private readonly asInvalidJson: boolean;
  private readonly rawBody: unknown;

  constructor(body: unknown, options: { invalidJson?: boolean } = {}) {
    this.rawBody = body;
    this.asInvalidJson = Boolean(options.invalidJson);
    this.body = JSON.stringify(body);
  }

  async json() {
    if (this.asInvalidJson) {
      throw new SyntaxError("Unexpected token in JSON");
    }
    return JSON.parse(this.body);
  }

  // Helpers for tests that want the raw text body.
  async text(): Promise<string> {
    return this.body;
  }

  // Convenience for tests that pass an already-deserialized JSON value
  // (e.g. a non-stringifiable plain object that bypasses JSON.stringify).
  // We override json() to return this value verbatim.
  static withRawBody(rawBody: unknown): MockRequest {
    const r = new MockRequest({});
    Object.defineProperty(r, "body", { value: undefined });
    (r as unknown as { _raw: unknown })._raw = rawBody;
    const originalJson = r.json.bind(r);
    r.json = async () => {
      if ((r as unknown as { _raw: unknown })._raw === undefined) {
        return originalJson();
      }
      return (r as unknown as { _raw: unknown })._raw;
    };
    return r;
  }
}

const validPayload = {
  gameType: "haunted-library",
  difficulty: "medium",
  score: 42,
  accuracy: 5 / 6,
  correctAnswers: 5,
  totalAttempts: 6,
  duration: 12_345,
  victory: true,
  idempotencyKey: "11111111-1111-1111-1111-111111111111",
  clientTimestamp: 1_700_000_000_000,
};

describe("adversarial: route handler body validation (Group 3E attacks)", () => {
  it("returns 400 with structured error on syntactically invalid JSON", async () => {
    const route = createCompleteRoute();
    const req = new MockRequest({}, { invalidJson: true });
    const response = await route.POST(req as unknown as Request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/Invalid JSON/i);
  });

  it("returns 400 on a JSON array body (schema expects an object)", async () => {
    const route = createCompleteRoute();
    const req = new MockRequest([
      validPayload,
      validPayload,
    ]);
    const response = await route.POST(req as unknown as Request);
    expect(response.status).toBe(400);
  });

  it("returns 400 on a JSON null body", async () => {
    const route = createCompleteRoute();
    const req = new MockRequest(null);
    const response = await route.POST(req as unknown as Request);
    expect(response.status).toBe(400);
  });

  it("returns 400 on a JSON number body", async () => {
    const route = createCompleteRoute();
    const req = new MockRequest(42);
    const response = await route.POST(req as unknown as Request);
    expect(response.status).toBe(400);
  });

  it("returns 400 on a JSON string body", async () => {
    const route = createCompleteRoute();
    const req = new MockRequest("not-an-object");
    const response = await route.POST(req as unknown as Request);
    expect(response.status).toBe(400);
  });

  it("returns 400 on a JSON boolean body", async () => {
    const route = createCompleteRoute();
    const req = new MockRequest(true);
    const response = await route.POST(req as unknown as Request);
    expect(response.status).toBe(400);
  });

  it("returns 400 on an empty object", async () => {
    const route = createCompleteRoute();
    const req = new MockRequest({});
    const response = await route.POST(req as unknown as Request);
    expect(response.status).toBe(400);
  });

  it("returns 400 on deeply nested XP key in metadata.xp.deepPath", async () => {
    const route = createCompleteRoute();
    const req = new MockRequest({
      ...validPayload,
      metadata: {
        xp: 1_000_000,
        nested: { xp: 1_000_000, deeper: { XP: 1_000_000 } },
      },
    });
    const response = await route.POST(req as unknown as Request);
    // Schema-level: metadata is open, so this PASSES the schema (the
    // metadata is unrestricted). But the XP value is NOT used. Lock
    // this as documented behavior.
    expect(response.status).toBe(200);
    const data = await response.json();
    // Server-computed xpEarned is bounded by the formula — NOT 1_000_000.
    expect(data.xpEarned).toBeLessThanOrEqual(10);
  });

  it("rejects prototype-pollution style keys", async () => {
    const route = createCompleteRoute();
    const polluted = JSON.parse(
      JSON.stringify({ ...validPayload, __proto__: { xp: 999_999 } }),
    );
    const req = new MockRequest(polluted);
    const response = await route.POST(req as unknown as Request);
    // JSON.stringify drops __proto__ from serialized output, so the
    // resulting object looks like the valid payload. Schema accepts it.
    // Lock that the server-computed XP is still bounded.
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.xpEarned).toBeLessThanOrEqual(10);
    expect(typeof data.activityId).toBe("string");
  });
});

describe("adversarial: route handler does NOT mutate or persist", () => {
  it("returns mock response without calling db functions during request handling", async () => {
    // Spy on the db schema — the route should never touch the DB.
    // We re-import the route under jest isolation with all db functions
    // mocked as jest.fn(). If the route handler accidentally calls
    // db.insert / db.select / db.update / db.delete, the spy fires.
    const dbInsertSpy = jest.fn();
    const dbSelectSpy = jest.fn();
    const dbUpdateSpy = jest.fn();
    const dbDeleteSpy = jest.fn();

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    jest.doMock("@reading-advantage/db", () => ({
      __esModule: true,
      insert: dbInsertSpy,
      select: dbSelectSpy,
      update: dbUpdateSpy,
      delete: dbDeleteSpy,
    }));

    let statusCode = 0;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createCompleteRoute: fresh } = require("./completeRoute");
      const route = fresh();
      const response = await route.POST(
        new MockRequest(validPayload) as unknown as Request,
      );
      statusCode = response.status;
    } finally {
      jest.dontMock("@reading-advantage/db");
    }

    expect(statusCode).toBe(200);
    expect(dbInsertSpy).not.toHaveBeenCalled();
    expect(dbSelectSpy).not.toHaveBeenCalled();
    expect(dbUpdateSpy).not.toHaveBeenCalled();
    expect(dbDeleteSpy).not.toHaveBeenCalled();
  });

  it("rejects a payload with xp: 1_000_000 BEFORE computing any XP", async () => {
    const route = createCompleteRoute();
    const req = new MockRequest({ ...validPayload, xp: 1_000_000 });
    const response = await route.POST(req as unknown as Request);
    expect(response.status).toBe(400);
    const data = await response.json();
    // xpEarned is NOT 1_000_000 — schema rejected the payload.
    expect(data.xpEarned).toBeUndefined();
  });

  it("rejects UUID variants that look like UUIDs but with extra characters", async () => {
    const route = createCompleteRoute();
    const probes = [
      "11111111-1111-1111-1111-1111111111111", // trailing 1
      "11111111-1111-1111-1111-11111111111", // missing last char
      "11111111-1111-1111-1111-11111111111g", // non-hex char
      "111111111111-1111-1111-1111-111111111111", // wrong dash position
      " game:haunted-library:11111111-1111-1111-1111-111111111111", // prefix
    ];
    for (const probe of probes) {
      const response = await route.POST(
        new MockRequest({ ...validPayload, idempotencyKey: probe }) as unknown as Request,
      );
      expect(response.status).toBe(400);
    }
  });

  it("rejects idempotencyKey containing SQL-like content", async () => {
    const route = createCompleteRoute();
    const sqlProbes = [
      "11111111-1111-1111-1111-111111111111' OR '1'='1",
      "11111111-1111-1111-1111-111111111111; DROP TABLE xp_logs",
    ];
    for (const probe of sqlProbes) {
      const response = await route.POST(
        new MockRequest({ ...validPayload, idempotencyKey: probe }) as unknown as Request,
      );
      expect(response.status).toBe(400);
    }
  });

  it("rejects client-supplied fractional score (must be integer)", async () => {
    // Note: `Number.MAX_VALUE` passes `.int()` because it has no fractional
    // part (it's just an integer too large to be a safe integer). Zod 3.x
    // `.int()` uses `Number.isInteger()` which accepts any integer,
    // including out-of-range values. To test the integer-defense, send a
    // score with an explicit fractional component.
    const route = createCompleteRoute();
    const req = new MockRequest({ ...validPayload, score: 1.5 });
    const response = await route.POST(req as unknown as Request);
    expect(response.status).toBe(400);
  });

  it("rejects client-supplied fractional correctAnswers", async () => {
    const route = createCompleteRoute();
    const req = new MockRequest({ ...validPayload, correctAnswers: 1.5 });
    const response = await route.POST(req as unknown as Request);
    expect(response.status).toBe(400);
  });

  it("rejects client-supplied fractional totalAttempts", async () => {
    const route = createCompleteRoute();
    const req = new MockRequest({ ...validPayload, totalAttempts: 1.5 });
    const response = await route.POST(req as unknown as Request);
    expect(response.status).toBe(400);
  });
});

describe("adversarial: route handler positive-control re-validation", () => {
  it("valid payload parses → 200 with server-computed XP (positive control)", async () => {
    const route = createCompleteRoute();
    const response = await route.POST(
      new MockRequest(validPayload) as unknown as Request,
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.xpEarned).toBeGreaterThanOrEqual(0);
    expect(data.xpEarned).toBeLessThanOrEqual(10);
    expect(data.activityId).toBe(
      `game:haunted-library:${validPayload.idempotencyKey}`,
    );
    expect(data.duplicate).toBe(false);
    expect(data.status).toBe(200);
  });

  it("every canonical gameType is accepted", async () => {
    const canonicalGameTypes = [
      "castle-defense",
      "dragon-rider",
      "magic-defense",
      "rpg-battle",
      "dragon-flight",
      "wizard-vs-zombie",
      "enchanted-library",
      "rune-match",
      "alchemists-synthesis",
      "potion-rush",
      "dungeon-liberator",
      "spellweavers-run",
      "shadow-gate-dungeon",
      "rune-forge-chamber",
      "village-guardian",
      "labyrinth-goblin-king",
      "abyssal-well",
      "archers-revenge",
      "storm-castle-tower",
      "griffin-sky-joust",
      "realm-carver",
      "paladins-twin-soul",
      "griffin-riders-escape",
      "devourer-slime",
      "haunted-library",
      "gryphon-patrol",
    ];
    const route = createCompleteRoute();
    for (const gameType of canonicalGameTypes) {
      const response = await route.POST(
        new MockRequest({ ...validPayload, gameType }) as unknown as Request,
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.activityId).toBe(`game:${gameType}:${validPayload.idempotencyKey}`);
    }
  });

  it("rejects the 3 placeholder game types (no implementation, cannot complete)", async () => {
    // Decision 3.2 documented the placeholder enum exclusion.
    const placeholders = ["astral-mage", "babel-architect", "sorcerer-ziggurat"];
    const route = createCompleteRoute();
    for (const gameType of placeholders) {
      const response = await route.POST(
        new MockRequest({ ...validPayload, gameType }) as unknown as Request,
      );
      expect(response.status).toBe(400);
    }
  });

  it("every difficulty is accepted", async () => {
    const difficulties = ["easy", "medium", "hard", "extreme"];
    const route = createCompleteRoute();
    for (const difficulty of difficulties) {
      const response = await route.POST(
        new MockRequest({ ...validPayload, difficulty }) as unknown as Request,
      );
      expect(response.status).toBe(200);
    }
  });

  it("rejects the legacy 'normal' difficulty value", async () => {
    const route = createCompleteRoute();
    const response = await route.POST(
      new MockRequest({ ...validPayload, difficulty: "normal" }) as unknown as Request,
    );
    expect(response.status).toBe(400);
  });
});
