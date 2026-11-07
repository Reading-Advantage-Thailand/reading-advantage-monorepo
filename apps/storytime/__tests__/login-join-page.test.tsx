/**
 * The "How to join" page (AC-4.5, test strategy P2b.7, task 2b.2).
 *
 * The page is public and short. It answers with no session, writes no cookie, and holds no week
 * content and no media URL. The copy file holds `status: "draft"` and the page shows a visible
 * draft marker until the PR copy and Daniel's Thai check are recorded (AC-4.10). The sign-in page
 * links to it.
 *
 * At the base the first assertion fails on `Missing apps/storytime/app/[locale]/join/page.tsx`.
 * The page is loaded only after that assertion, so no case fails with a load error.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeStore, fakeStoreState } from "./helpers/fake-store";

const nav = vi.hoisted(() => {
  const redirectCalls: string[] = [];
  let notFoundCalls = 0;
  return {
    redirectCalls,
    redirect(url: string) {
      redirectCalls.push(url);
      throw new Error(`REDIRECT:${url}`);
    },
    notFound() {
      notFoundCalls += 1;
      throw new Error("NOT_FOUND");
    },
    reset() {
      redirectCalls.length = 0;
      notFoundCalls = 0;
    },
    get notFoundCalls() {
      return notFoundCalls;
    },
  };
});

const cookiesState = vi.hoisted(() => {
  let setCalls = 0;
  return {
    reset() {
      setCalls = 0;
    },
    get setCalls() {
      return setCalls;
    },
    bumpSet() {
      setCalls += 1;
    },
  };
});

vi.mock("next/navigation", () => ({ redirect: nav.redirect, notFound: nav.notFound }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    getAll: () => [],
    set: () => {
      cookiesState.bumpSet();
    },
    delete: () => undefined,
  }),
  headers: async () => new Headers(),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async (arg?: { locale?: string }) => (key: string) =>
    `${arg?.locale ?? "th"}:${key}`,
}));
vi.mock("../lib/auth/store", async () => {
  const helper = await import("./helpers/fake-store");
  return { getStore: () => helper.fakeStoreState.current };
});

const APP = resolve(import.meta.dirname, "..");
const JOIN_PAGE = resolve(APP, "app/[locale]/join/page.tsx");
const JOIN_COPY = resolve(APP, "lib/join-copy.ts");
const SIGN_IN_PAGE = resolve(APP, "app/[locale]/sign-in/page.tsx");
const MISSING = "Missing apps/storytime/app/[locale]/join/page.tsx";

/** Finds media URLs and week links in one HTML string. */
function mediaUrls(html: string): string[] {
  const found: string[] = [];
  const pattern = /https?:\/\/[^"'\s<>]*(?:\.mp3|\.mp4|\.jpg|\.jpeg|\.png)/gi;
  for (const match of html.matchAll(pattern)) found.push(match[0]);
  if (/\/media\//.test(html)) found.push("/media/");
  return found;
}

/** Loads the join page. */
async function joinPage() {
  const mod = (await import("../app/[locale]/join/page.js")) as {
    default: (props: never) => Promise<unknown>;
  };
  return mod.default;
}

/** Loads the sign-in page. */
async function signInPage() {
  const mod = (await import("../app/[locale]/sign-in/page.js")) as {
    default: (props: never) => Promise<unknown>;
  };
  return mod.default;
}

/** Renders one async page and returns its static HTML. */
async function render(page: (props: never) => Promise<unknown>, props: unknown): Promise<string> {
  const element = await page(props as never);
  return renderToStaticMarkup(element as ReactElement);
}

beforeEach(() => {
  nav.reset();
  cookiesState.reset();
  fakeStoreState.current = createFakeStore();
});

describe("login join page (red)", () => {
  it("answers with no session, writes no cookie, and renders both locales", async () => {
    expect(existsSync(JOIN_PAGE), MISSING).toBe(true);
    const page = await joinPage();
    for (const locale of ["th", "en"] as const) {
      nav.reset();
      const html = await render(page, { params: Promise.resolve({ locale }) });
      expect(html, `${locale} renders`).toContain(`${locale}:`);
      expect(nav.redirectCalls, `${locale} makes no redirect`).toHaveLength(0);
      expect(nav.notFoundCalls, `${locale} is not a 404`).toBe(0);
    }
    console.log("join_status=200 stranger_set_cookie=0");
    expect(cookiesState.setCalls, "the join page writes no cookie").toBe(0);
  });

  it("holds no week content and no media URL", async () => {
    expect(existsSync(JOIN_PAGE), MISSING).toBe(true);
    const page = await joinPage();
    const html = await render(page, { params: Promise.resolve({ locale: "th" }) });
    const found = mediaUrls(html);
    console.log(`media_urls_found=${found.length}`);
    expect(found, "media_urls_found").toHaveLength(0);
    expect(html, "no week path").not.toMatch(/\/(th|en)\/st\//);
    const planted = 'https://storage.googleapis.com/storytime-app-media/l2/w01/x.jpg';
    expect(mediaUrls(planted), "the positive control finds a planted media URL").toHaveLength(1);
  });

  it("marks the copy as draft and shows a visible draft marker", async () => {
    expect(existsSync(JOIN_PAGE), MISSING).toBe(true);
    expect(existsSync(JOIN_COPY), "Missing apps/storytime/lib/join-copy.ts").toBe(true);
    const copy = (await import("../lib/join-copy.js")) as { JOIN_COPY: { status: string } };
    expect(copy.JOIN_COPY.status, "the copy status").toBe("draft");
    const page = await joinPage();
    const html = await render(page, { params: Promise.resolve({ locale: "th" }) });
    expect(html, "a visible draft marker").toContain("data-draft");
  });

  it("links from the sign-in page to the join page", async () => {
    expect(existsSync(JOIN_PAGE), MISSING).toBe(true);
    expect(existsSync(SIGN_IN_PAGE), "Missing apps/storytime/app/[locale]/sign-in/page.tsx").toBe(
      true,
    );
    const page = await signInPage();
    const html = await render(page, {
      params: Promise.resolve({ locale: "th" }),
      searchParams: Promise.resolve({}),
    });
    expect(html, "the sign-in page links to join").toContain("/th/join");
  });
});
