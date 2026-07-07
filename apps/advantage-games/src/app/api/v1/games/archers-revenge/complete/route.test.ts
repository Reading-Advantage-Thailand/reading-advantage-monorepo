import { POST, dynamic } from "./route";

class MockRequest {
  private readonly body: string;

  constructor(body: unknown) {
    this.body = JSON.stringify(body);
  }

  async json() {
    return JSON.parse(this.body);
  }
}

describe("archers-revenge complete route", () => {
  it("returns a successful completion response", async () => {
    expect(dynamic).toBe("force-static");

    const response = await POST(
      new MockRequest({
        gameType: "archers-revenge",
        difficulty: "medium",
        score: 1800,
        accuracy: 0.9,
        correctAnswers: 18,
        totalAttempts: 20,
        duration: 60_000,
        victory: true,
        idempotencyKey: "22222222-2222-2222-2222-222222222222",
        clientTimestamp: 1_700_000_000_000,
      }) as unknown as Request
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe(200);
    expect(data.duplicate).toBe(false);
    expect(typeof data.xpEarned).toBe("number");
    expect(data.xpEarned).toBeGreaterThanOrEqual(0);
    expect(data.activityId).toBe(
      "game:archers-revenge:22222222-2222-2222-2222-222222222222"
    );
  });

  it("rejects an invalid payload", async () => {
    const response = await POST(
      new MockRequest({ score: 1800 }) as unknown as Request
    );
    expect(response.status).toBe(400);
  });
});
