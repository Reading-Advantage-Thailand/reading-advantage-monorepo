import { describe, expect, it, vi } from "vitest";

// The next-intl plugin only wraps the config; the wrapper needs no Next runtime in this test.
vi.mock("next-intl/plugin", () => ({ default: () => (config: unknown) => config }));

import nextConfig from "../../../next.config";

describe("next.config headers()", () => {
  it("gives the worker URL Service-Worker-Allowed and no-cache", async () => {
    const rules = await (nextConfig as { headers?: () => Promise<{ source: string; headers: { key: string; value: string }[] }[]> }).headers?.();
    const rule = rules?.find((r) => r.source === "/serwist/sw.js");
    expect(rule).toBeDefined();
    const map = Object.fromEntries((rule?.headers ?? []).map((h) => [h.key, h.value]));
    expect(map["Service-Worker-Allowed"]).toBe("/");
    expect(map["Cache-Control"]).toBe("no-cache");
  });
});
