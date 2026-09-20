import { describe, expect, it } from "vitest";
import {
  getMarketingCallbackOrigin,
  getPublicOrigin,
} from "@/lib/public-url";

describe("marketing public-url shared home wiring", () => {
  it("approves the canonical Marketing origin through the shared guard", () => {
    const origin = getPublicOrigin(
      new Request("https://marketing.reading-advantage.com/api/auth/logout"),
    );
    expect(origin.origin).toBe("https://marketing.reading-advantage.com");
    expect(origin.pathname).toBe("/");
  });

  it("rejects unapproved origins with the shared error code", () => {
    expect(() =>
      getPublicOrigin(new Request("https://evil.example/api/auth/logout")),
    ).toThrow("PUBLIC_ORIGIN_INVALID");
  });

  it("falls back to the Marketing callback origin without configuration", () => {
    expect(getMarketingCallbackOrigin().origin).toBe(
      "https://marketing.reading-advantage.com",
    );
  });
});
