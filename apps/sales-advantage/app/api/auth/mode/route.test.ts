// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ mode: vi.fn() }));
vi.mock("@/lib/auth-mode", () => ({ getSalesAuthMode: mocks.mode }));

import { GET } from "./route";

describe("GET /api/auth/mode", () => {
  it.each(["company", "legacy-school"] as const)(
    "exposes the validated %s browser mode",
    async (mode) => {
      mocks.mode.mockReturnValue(mode);
      const response = GET();
      await expect(response.json()).resolves.toEqual({ mode });
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    },
  );
});
