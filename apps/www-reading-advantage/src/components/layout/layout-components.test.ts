import { readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const LAYOUT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const LAYOUT_COMPONENTS = [
  "fade-in.tsx",
  "page-transition.tsx",
  "scroll-fade.tsx",
] as const;

describe("Wave 5 T2 layout components", () => {
  it("does not retain empty layout component modules", () => {
    const emptyModules = LAYOUT_COMPONENTS.filter((fileName) => {
      const filePath = resolve(LAYOUT_DIRECTORY, fileName);

      try {
        return (
          statSync(filePath).isFile() &&
          readFileSync(filePath, "utf8").trim() === ""
        );
      } catch {
        return false;
      }
    });

    expect(emptyModules).toEqual([]);
  });
});
