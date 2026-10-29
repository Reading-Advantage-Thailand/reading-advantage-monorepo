// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { createTranslator } from "next-intl";
import { vi, it, expect, beforeEach } from "vitest";
import { testMessages } from "@/components/__tests__/helpers/render-with-messages";
const mocks = vi.hoisted(() => ({ user: vi.fn(), locale: "en", listOwnedChallengeClasses: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return { getTranslations: async (namespace?: string) => createTranslator({ locale: "en", messages: messages.en, namespace: namespace as never }) };
});
vi.mock("@/lib/session", () => ({ getCurrentUser: () => mocks.user() }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain", () => ({
  challenges: { listOwnedChallengeClasses: (...args: unknown[]) => mocks.listOwnedChallengeClasses(...args) },
  createTenantDB: () => ({ db: {} }),
}));
vi.mock("@reading-advantage/domain/primary-quest", () => ({
  QUEST_TEMPLATES: [{ id: "quest-1", name: "Dragon", goals: [] }],
}));
vi.mock("@/components/quest/assign-quest-form", () => ({ AssignQuestForm: () => <div data-testid="quest-form" /> }));
vi.mock("@/i18n/navigation", () => ({ Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => <a href={`/${mocks.locale}${href}`} {...rest}>{children}</a> }));
import Page from "../page";
const en = testMessages.en;
/** Accounts that own a class and may open the assign form. */
const OWNERS = [
  ["TEACHER", "school-1"],
  ["ADMIN", "school-1"],
] as const;
/** Accounts that own no class and get the explanation instead of the form. */
const NON_OWNERS = [
  ["SYSTEM", "school-1"],
  ["SYSTEM", null],
  ["TEACHER", null],
  ["ADMIN", null],
] as const;
beforeEach(() => {
  mocks.listOwnedChallengeClasses.mockReset();
  mocks.listOwnedChallengeClasses.mockResolvedValue({ classes: [] });
});
it.each(OWNERS)("shows the assign form to the %s of a school", async (role, schoolId) => {
  mocks.user.mockResolvedValue({ id: "user-1", schoolId, role });
  const view = await Page({ searchParams: Promise.resolve({}) });
  expect(view).toBeTruthy();
  render(view);
  expect(screen.getByTestId("quest-form")).toBeInTheDocument();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 1, name: en.Quest.assign.title })).toBeInTheDocument();
});
it.each(NON_OWNERS)("explains the class challenges to the %s that owns no class", async (role, schoolId) => {
  mocks.user.mockResolvedValue({ id: "user-1", schoolId, role });
  const view = await Page({ searchParams: Promise.resolve({}) });
  expect(view).toBeTruthy();
  render(view);
  expect(screen.getByRole("status")).toHaveTextContent(en.TeacherClass.challengesOwnerNotice);
  expect(screen.queryByTestId("quest-form")).not.toBeInTheDocument();
  expect(mocks.listOwnedChallengeClasses).not.toHaveBeenCalled();
});
it("keeps the page shell for an account that owns no class", async () => {
  mocks.locale = "en";
  mocks.user.mockResolvedValue({ id: "sys-1", schoolId: "school-1", role: "SYSTEM" });
  render(await Page({ searchParams: Promise.resolve({}) }));
  expect(screen.getByRole("heading", { level: 1, name: en.Quest.assign.title })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: en.Quest.assign.back })).toHaveAttribute("href", "/en/teacher/dashboard");
});
it("shows the not-found page when no user is signed in", async () => {
  mocks.user.mockResolvedValue(null);
  await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_NOT_FOUND");
});
