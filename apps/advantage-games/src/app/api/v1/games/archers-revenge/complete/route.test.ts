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
        correctAnswers: 18,
        totalAttempts: 20,
        accuracy: 0.9,
        score: 1800,
        difficulty: "normal",
      }) as unknown as Request
    );
    const data = await response.json();

    expect(data.message).toBe("Game completed successfully");
    expect(data.status).toBe(200);
    expect(data.xpEarned).toBe(16);
    expect(data.activityId).toMatch(/^mock-activity-/);
  });
});
