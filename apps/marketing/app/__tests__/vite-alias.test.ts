import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import viteConfig from "../../vite.config";

const appRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));

describe("Marketing Vite alias", () => {
  it("resolves @ to the application directory", () => {
    const alias = viteConfig.resolve?.alias as Record<string, string>;

    expect(alias["@"]).toBe(resolve(appRoot, "app"));
  });
});
