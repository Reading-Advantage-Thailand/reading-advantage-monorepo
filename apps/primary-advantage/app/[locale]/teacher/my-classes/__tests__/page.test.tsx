// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { createTranslator } from "next-intl";
import { vi, it, expect } from "vitest";
import { testMessages } from "@/components/__tests__/helpers/render-with-messages";
const mocks = vi.hoisted(() => ({ user: vi.fn(), locale: "en" }));
vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return { getTranslations: async (namespace?: string) => createTranslator({ locale: "en", messages: messages.en, namespace: namespace as never }) };
});
vi.mock("@/lib/session", () => ({ getCurrentUser: () => mocks.user() }));
vi.mock("@/components/teacher/my-classes", () => ({ default: () => null }));
vi.mock("@/i18n/navigation", () => ({ Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => <a href={`/${mocks.locale}${href}`} {...rest}>{children}</a> }));
import Page from "../page";
const en = testMessages.en;
/** Accounts that the teacher route policy admits. */
const ROLES = [
  ["TEACHER", "school-1"],
  ["ADMIN", "school-1"],
  ["SYSTEM", "school-1"],
  ["SYSTEM", null],
] as const;
it.each(ROLES)("links the %s to the class challenges", async (role, schoolId) => {
  mocks.locale = "en";
  mocks.user.mockResolvedValue({ id: "user-1", schoolId, role });
  render(await Page());
  const link = screen.getByRole("link", { name: en.TeacherClass.challenges });
  expect(link).toHaveAttribute("href", "/en/teacher/game-challenges");
});
