// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({ select: vi.fn() }));

vi.mock("@reading-advantage/db", () => ({
  db: { select: dbMocks.select },
}));

import { GET } from "../route";

describe("disabled school debug endpoint", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("denies production requests", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await GET();

    expect(response.status).toBe(404);
    expect(dbMocks.select).not.toHaveBeenCalled();
  });

  it("denies student requests without exposing school licenses", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const response = await GET();

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not found" });
    expect(dbMocks.select).not.toHaveBeenCalled();
  });
});
