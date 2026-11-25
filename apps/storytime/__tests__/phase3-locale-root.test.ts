// @vitest-environment node
/**
 * The locale root redirect (post-acceptance launch fix).
 *
 * The proxy sends "/" to "/th" and leaves "/th" and "/en" to Next. Both 404
 * today because app/[locale]/page.tsx does not exist. The page must redirect
 * to "/<locale>/sign-in" for th and en. The sign-in page already sends a
 * signed-in user onward, so the root needs no session logic and no database.
 * The proxy stays unchanged.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => {
  const redirectCalls: string[] = [];
  return {
    redirectCalls,
    redirect(url: string): never {
      redirectCalls.push(url);
      throw new Error(`REDIRECT:${url}`);
    },
    reset() {
      redirectCalls.length = 0;
    },
  };
});

vi.mock("next/navigation", () => ({ redirect: nav.redirect }));

const APP = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LOCALE_ROOT = resolve(APP, "app/[locale]/page.tsx");
const SIGN_IN_PAGE = resolve(APP, "app/[locale]/sign-in/page.tsx");
const MISSING = "Missing apps/storytime/app/[locale]/page.tsx";

/** Loads the locale root page. The exists check runs first, so a missing file fails there. */
async function localeRootPage() {
  const mod = (await import("../app/[locale]/page.js")) as {
    default: (props: { params: Promise<{ locale: string }> }) => Promise<unknown>;
  };
  return mod.default;
}

/**
 * Calls the page for one locale and reports the redirect target.
 * @param locale The locale of the page.
 * @returns The redirect target.
 */
async function redirectTarget(locale: string): Promise<string> {
  const page = await localeRootPage();
  nav.reset();
  try {
    await page({ params: Promise.resolve({ locale }) });
  } catch (error) {
    const message = (error as Error).message;
    if (message.startsWith("REDIRECT:")) return message.slice("REDIRECT:".length);
    throw error;
  }
  throw new Error(`expected redirect for locale=${locale} redirect_calls=${nav.redirectCalls.length}`);
}

describe("locale root redirect", () => {
  it("redirects th to the Thai sign-in page", async () => {
    expect(existsSync(LOCALE_ROOT), MISSING).toBe(true);
    const target = await redirectTarget("th");
    console.log(`locale_root_redirect_th=${target}`);
    expect(target).toBe("/th/sign-in");
    expect(nav.redirectCalls.length, "redirect_calls=1").toBe(1);
  });

  it("redirects en to the English sign-in page", async () => {
    expect(existsSync(LOCALE_ROOT), MISSING).toBe(true);
    const target = await redirectTarget("en");
    console.log(`locale_root_redirect_en=${target}`);
    expect(target).toBe("/en/sign-in");
    expect(nav.redirectCalls.length, "redirect_calls=1").toBe(1);
  });

  it("keeps the sign-in noindex pattern", () => {
    const signInSource = readFileSync(SIGN_IN_PAGE, "utf8");
    const signInNoindex = /generateMetadata/.test(signInSource) && /noindex/.test(signInSource);
    console.log(`signin_source_noindex=${signInNoindex ? 1 : 0}`);
    expect(signInNoindex, "the sign-in page keeps its noindex pattern").toBe(true);
    expect(existsSync(LOCALE_ROOT), MISSING).toBe(true);
    const rootSource = readFileSync(LOCALE_ROOT, "utf8");
    console.log(`locale_root_source_noindex=${/noindex/.test(rootSource) ? 1 : 0}`);
    expect(rootSource, "the locale root keeps the noindex pattern").toMatch(/noindex/);
  });
});
