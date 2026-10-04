// @vitest-environment jsdom
/**
 * Student sign-in copy and touch targets (primary_student_login_20261003, Phase 4 task 3, FR-8).
 * Every student sign-in string exists in all locales, and the Thai copy is Thai. jsdom has no
 * layout engine, so the 48 px rule is checked on the size class of each control; the 375 px and
 * 768 px screenshots belong to the Phase 5 browser test.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import en from "../../messages/en.json";
import th from "../../messages/th.json";
import vi_ from "../../messages/vi.json";
import cn from "../../messages/cn.json";
import tw from "../../messages/tw.json";

vi.mock("@reading-advantage/auth-client", () => ({ useAuth: () => ({ refresh: vi.fn(), login: vi.fn() }) }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => (key: string) =>
    [...namespace.split("."), ...key.split(".")].reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], th),
}));

import SignInPage from "../../app/[locale]/auth/signin/page";
import { CardSignIn } from "../student-login/card-sign-in";
import { StudentSignIn } from "../student-login/student-sign-in";
import { renderWithMessages } from "./helpers/render-with-messages";

// A height or minimum height class of 12 (48 px) or more.
const TOUCH_TARGET = /(?:^|\s)(?:min-)?h-(?:1[2-9]|[2-9]\d)(?:\s|$)/;
const fetchMock = vi.fn();
const respond = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));

/** Lists the leaf keys of a message tree as dotted paths. */
function keysOf(tree: object, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "object" && value !== null ? keysOf(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
}

/** Asserts that every button, link, tab, and input on screen has a 48 px touch target. */
function expectTouchTargets() {
  const controls = [...document.body.querySelectorAll("button, a, input, [role=tab]")];
  expect(controls.length).toBeGreaterThan(0);
  for (const control of controls) {
    expect(control.className, `${control.tagName} "${control.textContent}"`).toMatch(TOUCH_TARGET);
  }
  expect(document.body.textContent).not.toMatch(/StudentSignIn\.|AuthPage\./);
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("student sign-in copy", () => {
  it("has the same student sign-in keys in every locale", () => {
    const expected = keysOf(en.StudentSignIn).sort();
    for (const messages of [th, vi_, cn, tw]) expect(keysOf(messages.StudentSignIn).sort()).toEqual(expected);
  });

  it("has Thai text for every Thai string", () => {
    const thai = th.StudentSignIn as Record<string, Record<string, string>>;
    for (const key of keysOf(thai)) {
      const [group, name] = key.split(".") as [string, string];
      expect(thai[group]![name], key).toMatch(/[฀-๿]/);
    }
  });
});

describe("student sign-in touch targets (Thai)", () => {
  it("on the sign-in page tabs and the code step", async () => {
    renderWithMessages(await SignInPage(), { locale: "th" });
    expect(screen.getByRole("tab", { name: "นักเรียน" })).toBeInTheDocument();
    expectTouchTargets();
  });

  it("on the name list and the picture grid", async () => {
    fetchMock.mockReturnValueOnce(
      respond(200, { picturePasswordRequired: true, students: [{ studentId: "h1", displayName: "สมชาย", avatar: "red-circle" }] }),
    );
    renderWithMessages(<StudentSignIn />, { locale: "th" });
    fireEvent.change(screen.getByLabelText("รหัสห้องเรียน"), { target: { value: "ABCDEF" } });
    fireEvent.click(screen.getByRole("button", { name: "ต่อไป" }));
    fireEvent.click(await screen.findByRole("button", { name: "สมชาย" }));
    expectTouchTargets();
    fireEvent.click(await screen.findByRole("button", { name: "วงกลมสีแดง" }));
    expectTouchTargets();
  });

  it("on the username and password form", () => {
    renderWithMessages(<StudentSignIn />, { locale: "th" });
    fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่าน" }));
    expectTouchTargets();
  });

  it("on the QR card failure", async () => {
    window.history.replaceState(null, "", "/th/auth/card");
    renderWithMessages(<CardSignIn />, { locale: "th" });
    await screen.findByRole("alert");
    expectTouchTargets();
  });
});
