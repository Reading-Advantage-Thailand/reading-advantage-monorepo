// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const shippedPath = resolve(app, "content/l2/w01.json");
const previousContentDir = process.env.STORYTIME_CONTENT_DIR;
const previousDraftSwitch = process.env.STORYTIME_SHOW_DRAFT_MEDIA;
let scratch: string;

function readyClone() {
  const week = JSON.parse(readFileSync(shippedPath, "utf8"));
  for (const book of week.books) {
    for (const page of book.pages) {
      if (page.image) page.image.file = `review/${book.kind}-${page.number}.webp`;
    }
  }
  week.approval = {
    images: { status: "approved" },
    audio: { status: "approved" },
    song: { status: "approved" },
  };
  return week;
}

async function loadVisibility(week: unknown) {
  const directory = mkdtempSync(resolve(tmpdir(), "storytime-media-gate-"));
  scratch = directory;
  const level = resolve(directory, "l2");
  const { mkdirSync } = await import("node:fs");
  mkdirSync(level);
  writeFileSync(resolve(level, "w01.json"), JSON.stringify(week));
  process.env.STORYTIME_CONTENT_DIR = directory;
  const content = await import(/* @vite-ignore */ new URL(`file://${resolve(app, "lib/content.ts")}`).href);
  return content.loadVisibleWeek(2, 1);
}

afterEach(() => {
  if (scratch) rmSync(scratch, { recursive: true, force: true });
  if (previousContentDir === undefined) delete process.env.STORYTIME_CONTENT_DIR;
  else process.env.STORYTIME_CONTENT_DIR = previousContentDir;
  if (previousDraftSwitch === undefined) delete process.env.STORYTIME_SHOW_DRAFT_MEDIA;
  else process.env.STORYTIME_SHOW_DRAFT_MEDIA = previousDraftSwitch;
  vi.restoreAllMocks();
});

describe("Phase 3 media approval gate (AC-5.5)", () => {
  for (const part of ["images", "audio", "song"] as const) {
    it(`${part} draft keeps the route at 404 and names the blocked part`, async () => {
      const week = readyClone();
      week.approval[part].status = "draft";
      const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      expect(await loadVisibility(week)).toBeNull();
      expect(warning).toHaveBeenCalledWith(expect.stringContaining(part));
    });
  }

  it("treats an absent approval part as draft and keeps the route at 404", async () => {
    const week = readyClone();
    delete week.approval.audio;
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(await loadVisibility(week)).toBeNull();
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("audio"));
  });

  it("accepts a published week when all three media parts are approved", async () => {
    expect(await loadVisibility(readyClone())).not.toBeNull();
  });

  it("shows draft media only when the server switch is set to 1", async () => {
    const week = readyClone();
    week.approval.song.status = "draft";
    process.env.STORYTIME_SHOW_DRAFT_MEDIA = "1";
    expect(await loadVisibility(week)).not.toBeNull();
    process.env.STORYTIME_SHOW_DRAFT_MEDIA = "0";
    expect(await loadVisibility(week)).toBeNull();
  });

  it("does not let the switch expose an unpublished week or a missing picture", async () => {
    process.env.STORYTIME_SHOW_DRAFT_MEDIA = "1";
    const unpublished = readyClone();
    unpublished.meta.status = "draft";
    expect(await loadVisibility(unpublished)).toBeNull();
    const missingPicture = readyClone();
    delete missingPicture.books[0].pages[0].image.file;
    expect(await loadVisibility(missingPicture)).toBeNull();
  });

  it("reads the switch only from a server-side environment name", () => {
    const sources = ["lib/content.ts", "lib/readiness.ts", "app/[locale]/st/[level]/[week]/page.tsx"]
      .map((path) => readFileSync(resolve(app, path), "utf8"))
      .join("\n");
    expect(sources).toContain("STORYTIME_SHOW_DRAFT_MEDIA");
    expect(sources).not.toMatch(/NEXT_PUBLIC_STORYTIME_SHOW_DRAFT_MEDIA/);
  });

  it("does not set the draft-media switch in deploy files", () => {
    const files = ["Dockerfile", "cloudbuild.yaml", "cloudbuild-staging.yaml"]
      .map((name) => resolve(app, name))
      .filter((path) => {
        try { readFileSync(path, "utf8"); return true; } catch { return false; }
      });
    expect(files.length).toBeGreaterThan(0);
    const contents = files.map((path) => readFileSync(path, "utf8")).join("\n");
    expect(contents).not.toMatch(/STORYTIME_SHOW_DRAFT_MEDIA/);
  });
});
