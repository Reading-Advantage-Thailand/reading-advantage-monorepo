/**
 * The entry redesign of the sign-in page (Phase 4, task 4.1, spec FR-A71, AC-A71.1 to AC-A71.4).
 *
 * The page is a welcome screen: the Storytime Advantage logo, one large picture from the approved
 * Storytime art, a greeting line, and then the sign-in card. The credential form keeps its field
 * names, ids, autocomplete values, form action, and hidden fields, so the sign-in handler needs
 * no change. The error text stays friendly and inside the card.
 *
 * At the base the first assertion of each case fails on the missing hook or asset, because the
 * page holds no logo, no art, no greeting, and no entry shell. The page is loaded only after
 * that assertion, so no case fails with a load error.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
const MISSING_PAGE = "Missing apps/storytime/app/[locale]/sign-in/page.tsx";

/** Renders the sign-in page for one locale and query and returns its static HTML. */
async function renderSignIn(
  locale: string,
  query: Record<string, string> = {},
): Promise<string> {
  expect(existsSync(PAGE), MISSING_PAGE).toBe(true);
  const mod = (await import("../app/[locale]/sign-in/page.js")) as {
    default: (props: never) => Promise<ReactElement> | ReactElement;
  };
  const element = await mod.default({
    params: Promise.resolve({ locale }),
    searchParams: Promise.resolve(query),
  } as never);
  const html = renderToStaticMarkup(element);
  expect(html.length, "the sign-in markup is not empty").toBeGreaterThan(0);
  return html;
}

/** Returns the form element of the markup that posts to the sign-in handler. */
function signInForm(html: string): string {
  const match = html.match(
    /<form[^>]*action="\/api\/auth\/sign-in"[^>]*>[\s\S]*?<\/form>/,
  );
  return match?.[0] ?? "";
}

beforeEach(() => {
  session.user = null;
  session.mayOpen = false;
  session.flash = "";
});

describe("entry sign-in layout (red)", () => {
  it("S1 shows the Storytime Advantage logo", async () => {
    expect(existsSync(PAGE), MISSING_PAGE).toBe(true);
    const html = await renderSignIn("th");
    const img = html.match(/<img[^>]*data-entry-logo[^>]*>/)?.[0] ?? "";
    console.log(`entry_logo_found=${img ? 1 : 0}`);
    expect(img, "the markup holds img[data-entry-logo]").not.toBe("");
    expect(img, "the logo src names the storytime-advantage asset").toMatch(
      /storytime-advantage/,
    );
    expect(img, "the logo alt names Storytime Advantage").toMatch(
      /alt="Storytime Advantage"/,
    );
  });

  it("S2 shows one entry picture of the two path places and no media URL", async () => {
    expect(existsSync(PAGE), MISSING_PAGE).toBe(true);
    const html = await renderSignIn("th");
    const picture = html.match(
      /<picture[^>]*data-entry-art[^>]*>[\s\S]*?<\/picture>/,
    )?.[0];
    console.log(`entry_art_found=${picture ? 1 : 0}`);
    expect(picture, "the markup holds one picture[data-entry-art]").toBeDefined();
    if (picture) {
      expect(picture, "a source names the path-p place").toMatch(/path-p/);
      expect(picture, "the image names the path-d place").toMatch(/path-d/);
      expect(picture, "the art is decorative").toMatch(/alt=""/);
      expect(picture, "the art loads no media path").not.toMatch(/\/media\//);
      expect(picture, "the art names no storage host").not.toMatch(
        /storage\.googleapis\.com|storage\.google\.com|amazonaws\.com/,
      );
      expect(picture, "the art holds no signed-URL query").not.toMatch(
        /X-Amz-Signature|Signature=|signed/i,
      );
    }
  });

  it("S3 shows the greeting line and keeps the sign-in heading", async () => {
    expect(existsSync(PAGE), MISSING_PAGE).toBe(true);
    const html = await renderSignIn("th");
    const greeting = html.match(
      /<p[^>]*data-entry-greeting[^>]*>[\s\S]*?<\/p>/,
    )?.[0];
    console.log(`entry_greeting_found=${greeting ? 1 : 0}`);
    expect(greeting, "the markup holds p[data-entry-greeting]").toBeDefined();
    if (greeting) {
      expect(greeting, "the greeting uses the signInGreeting key").toContain(
        "signInGreeting",
      );
    }
    expect(html, "the h1 still holds the signInHeading key").toMatch(
      /<h1[^>]*>[\s\S]*?signInHeading[\s\S]*?<\/h1>/,
    );
  });

  it("S4 keeps each label before its field and the form contract", async () => {
    expect(existsSync(PAGE), MISSING_PAGE).toBe(true);
    const html = await renderSignIn("th");
    const labelUsername = html.indexOf('for="username"');
    const inputUsername = html.indexOf('name="username"');
    const labelPassword = html.indexOf('for="password"');
    const inputPassword = html.indexOf('name="password"');
    expect(labelUsername, "the username label exists").toBeGreaterThanOrEqual(0);
    expect(inputUsername, "the username input exists").toBeGreaterThanOrEqual(0);
    expect(labelPassword, "the password label exists").toBeGreaterThanOrEqual(0);
    expect(inputPassword, "the password input exists").toBeGreaterThanOrEqual(0);
    expect(labelUsername, "the username label comes before its field").toBeLessThan(
      inputUsername,
    );
    expect(labelPassword, "the password label comes before its field").toBeLessThan(
      inputPassword,
    );
    expect(html, "the username input keeps its id").toContain('id="username"');
    expect(html, "the password input keeps its id").toContain('id="password"');
    // React renders the DOM property in camel case; the contract is the value.
    expect(html, "the username autocomplete stays").toMatch(/autocomplete="username"/i);
    expect(html, "the password autocomplete stays").toMatch(
      /autocomplete="current-password"/i,
    );
    expect(html, "the form posts to the sign-in handler").toContain(
      'action="/api/auth/sign-in"',
    );
    expect(html, "the locale hidden field stays").toContain('name="locale"');
    expect(html, "the next hidden field stays").toContain('name="next"');
  });

  it("S5 has the show-password toggle and a password field", async () => {
    expect(existsSync(PAGE), MISSING_PAGE).toBe(true);
    const html = await renderSignIn("th");
    const toggle = html.match(
      /<button[^>]*data-password-toggle[^>]*>[\s\S]*?<\/button>/,
    )?.[0];
    console.log(`entry_toggle_found=${toggle ? 1 : 0}`);
    expect(toggle, "the card holds button[data-password-toggle]").toBeDefined();
    if (toggle) {
      expect(toggle, "the toggle controls the password field").toContain(
        'aria-controls="password"',
      );
      expect(toggle, "the toggle starts unpressed").toContain(
        'aria-pressed="false"',
      );
      expect(toggle, "the toggle uses the signInShowPassword key").toContain(
        "signInShowPassword",
      );
    }
    const password = html.match(/<input[^>]*name="password"[^>]*>/)?.[0] ?? "";
    expect(password, "the password input exists").not.toBe("");
    expect(password, "the password field is masked in the server markup").toMatch(
      /type="password"/,
    );
  });

  it("S6 has exactly one full-width submit button", async () => {
    expect(existsSync(PAGE), MISSING_PAGE).toBe(true);
    const html = await renderSignIn("th");
    const submits = [...html.matchAll(/<button[^>]*type="submit"[^>]*>/g)];
    console.log(`entry_submit_count=${submits.length}`);
    expect(submits.length, "the card holds exactly one submit button").toBe(1);
    expect(submits[0]?.[0] ?? "", "the submit button is the primary").toContain(
      "data-entry-primary",
    );
  });

  it("S7 shows the friendly error inside the card before the first field", async () => {
    expect(existsSync(PAGE), MISSING_PAGE).toBe(true);
    for (const [error, key] of [
      ["invalid", "signInInvalid"],
      ["locked", "signInLocked"],
    ] as const) {
      const html = await renderSignIn("th", { error });
      const alerts = [...html.matchAll(/role="alert"/g)];
      console.log(`entry_alert_${error}=${alerts.length}`);
      expect(alerts.length, `one alert for ?error=${error}`).toBe(1);
      const form = signInForm(html);
      expect(form.length, "the sign-in form exists").toBeGreaterThan(0);
      expect(form, `the ${error} text sits inside the card`).toContain(key);
      const alertAt = form.indexOf('role="alert"');
      const fieldAt = form.indexOf('name="username"');
      expect(alertAt, "the alert exists in the card").toBeGreaterThanOrEqual(0);
      expect(fieldAt, "the first field exists in the card").toBeGreaterThanOrEqual(0);
      expect(alertAt, "the alert comes before the first field").toBeLessThan(fieldAt);
    }
  });

  it("S8 links below the card to the join page in both locales", async () => {
    expect(existsSync(PAGE), MISSING_PAGE).toBe(true);
    for (const locale of ["th", "en"] as const) {
      const html = await renderSignIn(locale);
      const line = html.match(
        /<p[^>]*data-entry-nologin[^>]*>[\s\S]*?<\/p>/,
      )?.[0];
      console.log(`entry_nologin_${locale}=${line ? 1 : 0}`);
      expect(line, `the markup holds p[data-entry-nologin] for ${locale}`).toBeDefined();
      if (line) {
        expect(line, "the line uses the signInNoLogin key").toContain("signInNoLogin");
        expect(line, "the line links to the join page").toContain(
          `href="/${locale}/join"`,
        );
      }
    }
  });

  it("S9 keeps the sign-out form for a session and the flash username", async () => {
    expect(existsSync(PAGE), MISSING_PAGE).toBe(true);
    session.user = { role: "family" };
    session.mayOpen = false;
    session.flash = "staff-02";
    const html = await renderSignIn("th");
    expect(html, "a signed-in visit keeps the sign-out form").toContain(
      'action="/api/auth/sign-out"',
    );
    const username = html.match(/<input[^>]*name="username"[^>]*>/)?.[0] ?? "";
    expect(username, "the username field exists").not.toBe("");
    expect(username, "a wrong sign-in keeps the flash username").toContain(
      'value="staff-02"',
    );
  });

  it("S10 wraps the page in the entry shell", async () => {
    expect(existsSync(PAGE), MISSING_PAGE).toBe(true);
    const html = await renderSignIn("th");
    console.log(`entry_shell_found=${html.includes("data-entry-shell") ? 1 : 0}`);
    expect(html, "the markup holds the entry shell").toContain("data-entry-shell");
  });
});
