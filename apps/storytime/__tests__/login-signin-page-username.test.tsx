/**
 * The sign-in page shows the username from the flash cookie (UX finding F1, test strategy
 * P2b.7 F5, task 2b.7b, PM decision Q7).
 *
 * The page reads the username once and shows it as escaped input text. A second GET shows an
 * empty field, because the proxy clears the cookie on the first GET (condition 3 of Q7). The
 * value like `"><img src=x>` reaches the page only as escaped text, never as markup.
 *
 * Every case prints a labeled value. At the base every case fails with a message, because the
 * username input has no value; the page is loaded after the existsSync check.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const flash = vi.hoisted(() => {
  let value = "";
  const sets: string[] = [];
  return {
    set(next: string) {
      value = next;
    },
    value() {
      return value;
    },
    sets,
  };
});

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
  getCurrentUser: async () => null,
  mayOpenPath: () => true,
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "st_signin_username" && flash.value() ? { name, value: flash.value() } : undefined,
    getAll: () =>
      flash.value() ? [{ name: "st_signin_username", value: flash.value() }] : [],
    set: (name: string, value: string) => {
      flash.sets.push(`${name}=${value}`);
    },
    delete: (name: string) => {
      flash.sets.push(`${name}=`);
    },
  }),
  headers: async () => {
    const headers = new Headers();
    if (flash.value()) headers.set("x-storytime-sign-in-username", flash.value());
    return headers;
  },
}));

const APP = resolve(import.meta.dirname, "..");
const PAGE = resolve(APP, "app/[locale]/sign-in/page.tsx");

/** Renders the sign-in page and returns its static HTML. */
async function renderSignIn(query: Record<string, string> = {}): Promise<string> {
  const mod = (await import("../app/[locale]/sign-in/page.js")) as {
    default: (props: never) => Promise<ReactElement> | ReactElement;
  };
  const element = await mod.default({
    params: Promise.resolve({ locale: "th" }),
    searchParams: Promise.resolve(query),
  } as never);
  return renderToStaticMarkup(element);
}

/** Returns the username input tag of the markup, or an empty string. */
function usernameInput(html: string): string {
  return html.match(/<input[^>]*name="username"[^>]*>/)?.[0] ?? "";
}

beforeEach(() => {
  flash.set("");
  flash.sets.length = 0;
});

describe("sign-in page username from the flash cookie (red)", () => {
  it("shows the username, then shows an empty field on the next GET", async () => {
    expect(existsSync(PAGE), "Missing apps/storytime/app/[locale]/sign-in/page.tsx").toBe(true);
    flash.set("staff-02");
    const first = usernameInput(await renderSignIn());
    console.log(`username_input_value=${first.includes('value="staff-02"') ? 1 : 0}`);
    console.log(`username_input_tag=${first}`);
    expect(first, "the username input is on the page").not.toBe("");
    expect(first, "the field holds the username").toContain('value="staff-02"');
    flash.set("");
    const second = usernameInput(await renderSignIn());
    console.log(`username_input_after_clear=${second.includes("value=") ? 1 : 0}`);
    expect(second, "the field is empty on the second GET").not.toContain('value="staff-02"');
  });

  it("shows a hostile cookie value as escaped text, never as markup", async () => {
    expect(existsSync(PAGE), "Missing apps/storytime/app/[locale]/sign-in/page.tsx").toBe(true);
    flash.set('"><img src=x>');
    const html = await renderSignIn();
    const input = usernameInput(html);
    console.log(`username_input_escaped=${input.includes("&quot;&gt;&lt;img src=x&gt;") ? 1 : 0}`);
    console.log(`username_markup_leak=${html.includes("<img src=x>") ? 1 : 0}`);
    expect(input, "the username input is on the page").not.toBe("");
    expect(input, "the value is escaped input text").toContain('value="&quot;&gt;&lt;img src=x&gt;"');
    expect(html, "the value is never markup").not.toContain("<img src=x>");
  });

  it("shows an empty field and only the generic message when no flash cookie exists", async () => {
    expect(existsSync(PAGE), "Missing apps/storytime/app/[locale]/sign-in/page.tsx").toBe(true);
    const html = await renderSignIn({ error: "invalid" });
    const input = usernameInput(html);
    const value = input.match(/value="([^"]*)"/)?.[1] ?? "";
    const alerts = html.match(/role="alert"/g) ?? [];
    const alertBody = html.match(/<p role="alert"[^>]*>([^<]*)<\/p>/)?.[1] ?? "";
    console.log(`refused_username_field_empty=${value === "" ? 1 : 0} refused_username_value=${JSON.stringify(value)}`);
    console.log(`refused_username_alerts=${alerts.length} refused_username_alert_text=${alertBody}`);
    expect(input, "the username input is on the page").not.toBe("");
    expect(value, "the field is empty").toBe("");
    expect(alerts, "one generic message").toHaveLength(1);
    expect(alertBody, "the generic wrong sign-in message").toBe("th:signInInvalid");
    expect(html, "no locked message").not.toContain("th:signInLocked");
    expect(html, "no refused name reaches the page").not.toContain("staff-42!");
  });
});
