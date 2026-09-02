// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@reading-advantage/db", () => {
  throw new Error("Accounting auth imported the main database package.");
});

describe("Accounting authentication import surface", () => {
  it("loads the session route without importing the main database package", async () => {
    const { GET } = await import("../../api/auth/session/route");
    const response = await GET(
      new Request("https://accounting.reading-advantage.test/api/auth/session"),
    );

    expect(response.status).toBe(401);
  });

  it("loads the company start route without importing the main database package", async () => {
    await expect(import("../../api/auth/company/start/route")).resolves.toHaveProperty(
      "GET",
    );
  });
});
