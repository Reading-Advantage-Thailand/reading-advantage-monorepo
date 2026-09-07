// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({ select: vi.fn() }));

vi.mock("@reading-advantage/db", () => ({
  db: { select: dbMocks.select },
}));

import { GET, POST } from "../route";

describe("disabled role debug endpoint", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("denies production requests", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await POST();

    expect(response.status).toBe(404);
    expect(dbMocks.select).not.toHaveBeenCalled();
  });

  it("denies anonymous and student requests without database access", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const anonymousResponse = await GET();
    const studentResponse = await POST();

    expect(anonymousResponse.status).toBe(404);
    expect(studentResponse.status).toBe(404);
    expect(dbMocks.select).not.toHaveBeenCalled();
  });
});
