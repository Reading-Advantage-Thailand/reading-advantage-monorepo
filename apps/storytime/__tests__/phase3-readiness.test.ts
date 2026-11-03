// @vitest-environment node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const shippedPath = resolve(app, "content/l2/w01.json");

describe("Phase 3 week readiness", () => {
  it("rejects shipped published w01 because each page picture lacks a file", async () => {
    const week = JSON.parse(readFileSync(shippedPath, "utf8"));
    const lib = resolve(app, "lib/readiness.ts");
    expect(() => readFileSync(lib, "utf8"), "Missing shared readiness module").not.toThrow();
    const modulePath = new URL(`file://${lib}`).href;
    const readiness = await import(/* @vite-ignore */ modulePath);
    expect(readiness.isWeekReady(week)).toBe(false);
  });

  it("accepts a ready deep clone without changing shipped files", async () => {
    const week = JSON.parse(readFileSync(shippedPath, "utf8"));
    const before = JSON.stringify(week);
    const readyCopy = structuredClone(week);
    for (const book of readyCopy.books) {
      for (const page of book.pages) {
        if (page.image) page.image.file = `review/${book.kind}-${page.number}.webp`;
      }
    }
    const lib = resolve(app, "lib/readiness.ts");
    expect(() => readFileSync(lib, "utf8"), "Missing shared readiness module").not.toThrow();
    const readiness = await import(/* @vite-ignore */ new URL(`file://${lib}`).href);
    expect(readiness.isWeekReady(readyCopy)).toBe(true);
    expect(JSON.stringify(week)).toBe(before);
  });

  it("uses the same readiness function in the receiver", () => {
    const receiver = readFileSync(resolve(app, "scripts/receive-weeks.ts"), "utf8");
    expect(receiver).toMatch(/isWeekReady/);
  });
});
