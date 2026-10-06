// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

const createUser = vi.hoisted(() => vi.fn());
vi.mock("@/server/models/userModel", () => ({ createUser }));

import { signUpAction } from "../signupAction";

describe("signUpAction", () => {
  it("refuses and creates nothing, because accounts are created by the school", async () => {
    const result = await signUpAction({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      confirmPassword: "password123",
    } as never);
    expect(result).toEqual({ error: "Accounts are created by your school" });
    expect(createUser).not.toHaveBeenCalled();
  });
});
