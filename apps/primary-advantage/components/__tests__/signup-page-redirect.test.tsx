// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() => vi.fn());
vi.mock("@/i18n/navigation", () => ({ redirect }));

import SignUpPage from "../../app/[locale]/auth/signup/page";

describe("sign-up page", () => {
  it("sends every visitor to the sign-in page", async () => {
    await SignUpPage({ params: Promise.resolve({ locale: "en" }) });
    expect(redirect).toHaveBeenCalledWith({ href: "/auth/signin", locale: "en" });
  });
});
