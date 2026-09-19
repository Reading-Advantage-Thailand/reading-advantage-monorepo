import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { noStoreJson } from "@/lib/response";

const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)), "..");

const protectedRoutes = [
  "app/api/campaigns/route.ts",
  "app/api/campaigns/[id]/route.ts",
  "app/api/settings/route.ts",
  "app/api/settings/test-connection/route.ts",
  "app/api/video/projects/route.ts",
  "app/api/video/research-topics/route.ts",
  "app/api/video/save-topics/route.ts",
  "app/api/video/generate-script/route.ts",
];

describe("Marketing protected route cache policy", () => {
  it("sets private no-store on JSON responses", async () => {
    const response = noStoreJson({ ok: true });

    expect(response.headers.get("Cache-Control")).toBe("no-store, private");
  });

  it.each(protectedRoutes)("uses the no-store response policy in %s", (route) => {
    const source = readFileSync(resolve(appRoot, route), "utf8");

    expect(source).toContain("noStoreJson");
    expect(source).toContain("withNoStore");
  });
});
