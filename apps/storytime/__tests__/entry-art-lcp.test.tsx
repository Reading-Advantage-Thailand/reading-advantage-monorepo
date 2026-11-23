/**
 * The eager sign-in LCP art (track storytime_speed_hill_climb_20261123, task 1.1.1).
 *
 * The sign-in page renders EntryArt through renderToStaticMarkup, as
 * entry-signin-layout.test.tsx does, with the same four mocks. At the base the img holds
 * loading="lazy" with no fetchpriority, no srcset, and no sizes, and the four small WebP
 * candidates do not exist. Cases L1 to L5 then fail on a page or file assertion. Case L6
 * passes its redirect part and fails its art part, so it is no copy error.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import proxy from "../proxy";

const session = vi.hoisted(() => ({
  user: null as null | { role: string },
  mayOpen: false,
  flash: "",
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async (arg?: { locale?: string }) => (key: string) =>
    `${arg?.locale ?? "th"}:${key}`,
}));
vi.mock("../lib/auth", () => ({
  SIGN_IN_USERNAME_COOKIE: "st_signin_username",
  getCurrentUser: async () => session.user,
  mayOpenPath: () => session.mayOpen,
}));
// The proxy reads renewal and the store name only for a request that carries a session
// cookie. The backend package is unbuilt in this worktree, so the redirect case stubs both
// modules and keeps the real cookie, routing, and redirect code. The 307 assertion is exact.
vi.mock("../lib/auth/renewal", () => ({
  renewSessionCookie: async () => null,
}));
vi.mock("../lib/auth/store", () => ({
  DATABASE_URL_ENV: "STORYTIME_DATABASE_URL",
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "st_signin_username" && session.flash
        ? { name, value: session.flash }
        : undefined,
    getAll: () =>
      session.flash ? [{ name: "st_signin_username", value: session.flash }] : [],
    set: () => undefined,
    delete: () => undefined,
  }),
  headers: async () => new Headers(),
}));

const APP = resolve(import.meta.dirname, "..");
const PAGE = resolve(APP, "app/[locale]/sign-in/page.tsx");
const PLACES = resolve(APP, "app/look/places");
const MISSING_PAGE = "Missing apps/storytime/app/[locale]/sign-in/page.tsx";
const BASE_URL = "https://app.example";
const ORIGINAL_LANDSCAPE_BYTES = 145508;

/** Renders the sign-in page for one locale and returns its static HTML. */
async function renderSignIn(locale: string): Promise<string> {
  expect(existsSync(PAGE), MISSING_PAGE).toBe(true);
  const mod = (await import("../app/[locale]/sign-in/page.js")) as {
    default: (props: never) => Promise<ReactElement> | ReactElement;
  };
  const element = await mod.default({
    params: Promise.resolve({ locale }),
    searchParams: Promise.resolve({}),
  } as never);
  const html = renderToStaticMarkup(element);
  expect(html.length, "the sign-in markup is not empty").toBeGreaterThan(0);
  return html;
}

/** Returns the picture[data-entry-art] markup of one page. */
function entryPicture(html: string): string {
  return (
    html.match(/<picture[^>]*data-entry-art[^>]*>[\s\S]*?<\/picture>/)?.[0] ?? ""
  );
}

/** Returns the img markup inside one picture. */
function entryImg(picture: string): string {
  return picture.match(/<img[^>]*>/)?.[0] ?? "";
}

/** Returns the desktop source markup inside one picture. */
function desktopSource(picture: string): string {
  const sources = [...picture.matchAll(/<source[^>]*>/g)].map((match) => match[0]);
  return sources.find((tag) => attribute(tag, "media").includes("980px")) ?? "";
}

/** Reads the value of one attribute of one tag, case-insensitively. */
function attribute(tag: string, name: string): string {
  const match = new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i").exec(tag);
  return match?.[1] ?? "";
}

/** Splits one srcset value into its candidate entries. */
function srcsetEntries(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/** Reads the width descriptor, such as 720w, of one srcset entry. */
function descriptor(entry: string): string {
  return entry.split(/\s+/).pop() ?? "";
}

/**
 * Reads the size of a WebP file from its header (VP8, VP8L, and VP8X).
 * @param bytes The file bytes.
 * @returns The width and the height, or null when the bytes are no WebP file.
 */
function webpSize(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length < 30) return null;
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8 ") {
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;
    return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L") {
    if (bytes[20] !== 0x2f) return null;
    const bits = bytes.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    return { width: bytes.readUIntLE(24, 3) + 1, height: bytes.readUIntLE(27, 3) + 1 };
  }
  return null;
}

/** Asserts that one img tag is the eager LCP candidate. */
function expectEagerArt(img: string): void {
  expect(img, "the markup holds the entry img").not.toBe("");
  console.log(`entry_lcp_loading=${attribute(img, "loading") || "<none>"}`);
  console.log(`entry_lcp_fetchpriority=${attribute(img, "fetchpriority") || "<none>"}`);
  expect(attribute(img, "loading"), "the art img loads eager").toBe("eager");
  expect(attribute(img, "fetchpriority"), "the art img hints a high fetch priority").toBe("high");
}

beforeEach(() => {
  session.user = null;
  session.mayOpen = false;
  session.flash = "";
});

describe("entry art LCP (red)", () => {
  it("L1 the sign-in art loads eager with a high fetch priority", async () => {
    const html = await renderSignIn("th");
    const picture = entryPicture(html);
    expect(picture, "the markup holds one picture[data-entry-art]").not.toBe("");
    expectEagerArt(entryImg(picture));
  });

  it("L2 the img srcset holds the three landscape candidates and a sizes value", async () => {
    const html = await renderSignIn("th");
    const img = entryImg(entryPicture(html));
    expect(img, "the markup holds the entry img").not.toBe("");
    const value = attribute(img, "srcset");
    const entries = srcsetEntries(value);
    console.log(`entry_lcp_srcset_count=${entries.length}`);
    expect(entries.length, "the img srcset holds three candidates").toBe(3);
    expect(entries.map(descriptor), "the img descriptors are 720w, 1280w, and 1920w").toEqual([
      "720w",
      "1280w",
      "1920w",
    ]);
    expect(value, "the img srcset names path-d-720").toMatch(/path-d-720/);
    expect(value, "the img srcset names path-d-1280").toMatch(/path-d-1280/);
    expect(entries[entries.length - 1] ?? "", "the last img candidate is 1920w").toMatch(/1920w$/);
    const sizes = attribute(img, "sizes");
    console.log(`entry_lcp_sizes=${sizes || "<none>"}`);
    expect(sizes, "the img sizes names 100vw").toMatch(/100vw/);
  });

  it("L3 the desktop source holds the three portrait candidates and a sizes value", async () => {
    const html = await renderSignIn("th");
    const source = desktopSource(entryPicture(html));
    expect(source, "the markup holds the desktop source").not.toBe("");
    const value = attribute(source, "srcset");
    const entries = srcsetEntries(value);
    console.log(`entry_lcp_source_count=${entries.length}`);
    expect(entries.length, "the desktop srcset holds three candidates").toBe(3);
    expect(entries.map(descriptor), "the source descriptors are 720w, 960w, and 1080w").toEqual([
      "720w",
      "960w",
      "1080w",
    ]);
    expect(value, "the desktop srcset names path-p-720").toMatch(/path-p-720/);
    expect(value, "the desktop srcset names path-p-960").toMatch(/path-p-960/);
    const sizes = attribute(source, "sizes");
    console.log(`entry_lcp_source_sizes=${sizes || "<none>"}`);
    expect(sizes, "the desktop source holds a sizes value").not.toBe("");
  });

  it("L4 the four small candidates exist with their pinned WebP sizes", () => {
    const candidates = [
      { name: "path-d-720.webp", width: 720, height: 405 },
      { name: "path-d-1280.webp", width: 1280, height: 720 },
      { name: "path-p-720.webp", width: 720, height: 1280 },
      { name: "path-p-960.webp", width: 960, height: 1707 },
    ];
    let found = 0;
    for (const candidate of candidates) {
      const path = resolve(PLACES, candidate.name);
      const present = existsSync(path) ? 1 : 0;
      console.log(`entry_lcp_file_${candidate.name.replace(/[^a-z0-9]+/gi, "_")}=${present}`);
      expect(present, `${candidate.name} exists under app/look/places`).toBe(1);
      found += present;
      const bytes = readFileSync(path);
      expect(bytes.toString("ascii", 0, 4), `${candidate.name} starts with RIFF`).toBe("RIFF");
      expect(bytes.toString("ascii", 8, 12), `${candidate.name} is a WEBP file`).toBe("WEBP");
      const size = webpSize(bytes);
      expect(size, `${candidate.name} holds a readable WebP header`).not.toBeNull();
      expect(
        `${size!.width}x${size!.height}`,
        `${candidate.name} size`,
      ).toBe(`${candidate.width}x${candidate.height}`);
    }
    console.log(`entry_lcp_files_found=${found}`);
    expect(`entry_lcp_files_found=${found}`).toBe("entry_lcp_files_found=4");
  });

  it("L5 the landscape candidates meet their byte bounds", () => {
    const path720 = resolve(PLACES, "path-d-720.webp");
    const path1280 = resolve(PLACES, "path-d-1280.webp");
    expect(existsSync(path720), "path-d-720.webp exists").toBe(true);
    expect(existsSync(path1280), "path-d-1280.webp exists").toBe(true);
    const bytes720 = statSync(path720).size;
    const bytes1280 = statSync(path1280).size;
    console.log(`path_d_720_bytes=${bytes720}`);
    console.log(`path_d_1280_bytes=${bytes1280}`);
    console.log(`saving_720_bytes=${ORIGINAL_LANDSCAPE_BYTES - bytes720}`);
    console.log(`saving_1280_bytes=${ORIGINAL_LANDSCAPE_BYTES - bytes1280}`);
    expect(bytes720, "path-d-720.webp is 30000 bytes or less").toBeLessThanOrEqual(30000);
    expect(bytes1280, "path-d-1280.webp is 75000 bytes or less").toBeLessThanOrEqual(75000);
  });

  it("L6 the signed-out /th/st redirect lands on the eager art", async () => {
    const request = new NextRequest(new URL("/th/st", BASE_URL));
    const response = proxy(request) as unknown as Response;
    expect(response.status, "the /th/st request answers 307").toBe(307);
    const location = response.headers.get("location");
    const target = location ? new URL(location, BASE_URL) : null;
    const targetPath = target ? `${target.pathname}${target.search}` : location;
    console.log(`entry_st_redirect=${targetPath ?? "<none>"}`);
    expect(targetPath, "the /th/st request goes to the sign-in target").toBe(
      "/th/sign-in?next=%2Fth%2Fst",
    );
    const html = await renderSignIn("th");
    expectEagerArt(entryImg(entryPicture(html)));
  });
});
