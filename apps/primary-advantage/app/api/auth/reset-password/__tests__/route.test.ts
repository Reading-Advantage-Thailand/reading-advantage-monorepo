// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

const captured = vi.hoisted(() => ({ options: undefined as unknown, handler: vi.fn() }));
vi.mock("@reading-advantage/api/routes/auth", () => ({
  createResetPasswordHandler: (options: unknown) => {
    captured.options = options;
    return captured.handler;
  },
}));
vi.mock("@/server/utils/auth", () => ({ decideResetTarget: vi.fn() }));

import { POST } from "../route";
import { decideResetTarget } from "@/server/utils/auth";

describe("POST /api/auth/reset-password", () => {
  it("mounts the strict shared handler with Primary's school and rank check", () => {
    expect(POST).toBe(captured.handler);
    expect(captured.options).toEqual({ authorizeTarget: decideResetTarget });
  });
});
