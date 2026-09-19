import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("Marketing runtime headers", () => {
  it("configures security headers for API and page responses", async () => {
    const rules = await nextConfig.headers();
    const apiRule = rules.find((rule) => rule.source === "/api/(.*)");
    const pageRule = rules.find((rule) => rule.source === "/(.*)");

    expect(apiRule?.headers).toEqual(
      expect.arrayContaining([
        { key: "Cache-Control", value: "no-store, private" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
      ]),
    );
    expect(pageRule?.headers).toEqual(
      expect.arrayContaining([
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
      ]),
    );
  });
});
