// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { createTranslator } from "next-intl";
import { vi, it, expect } from "vitest";
import { testMessages } from "@/components/__tests__/helpers/render-with-messages";
const mocks = vi.hoisted(() => ({ user: vi.fn(), locale: "en" }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
vi.mock("next-intl/server", async () => {
  const { testMessages: messages } = await import("@/components/__tests__/helpers/render-with-messages");
  return { getTranslations: async (namespace?: string) => createTranslator({ locale: "en", messages: messages.en, namespace: namespace as never }) };
});
vi.mock("@/lib/session", () => ({ getCurrentUser: () => mocks.user() }));
vi.mock("@reading-advantage/game-cartridges", () => ({ CARTRIDGE_CHALLENGE_CAPABILITIES: { dragon: { version: "v1" } }, getCartridgeCatalogEntry: () => ({ title: "Dragon" }) }));
vi.mock("@reading-advantage/advantage-play-kit/react", () => ({ TeacherChallengePanel: (props: Record<string, unknown>) => <div data-testid="panel" data-props={JSON.stringify(props)} /> }));
vi.mock("@/i18n/navigation", () => ({ Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => <a href={`/${mocks.locale}${href}`} {...rest}>{children}</a> }));
import Page from "../page";
const en = testMessages.en;
it("authorizes a teacher and passes the challenge configuration", async () => {
  mocks.locale = "zh";
  mocks.user.mockResolvedValue({ id: "teacher-1", schoolId: "school-1", role: "TEACHER" });
  render(await Page({ params: Promise.resolve({ locale: "zh" }) }));
  expect(JSON.parse(screen.getByTestId("panel").getAttribute("data-props") ?? "{}")).toMatchObject({ ownerKey: "school-1:teacher-1", games: { dragon: { title: "Dragon", version: "v1" } } });
  expect(screen.getByRole("link", { name: en.TeacherClass.backToClasses })).toHaveAttribute("href", "/zh/teacher/my-classes");
});
it("puts the panel in the teacher shell with a heading, a 44 px back link, and visible fields (audit T13)", async () => {
  mocks.locale = "en";
  mocks.user.mockResolvedValue({ id: "teacher-1", schoolId: "school-1", role: "TEACHER" });
  render(await Page({ params: Promise.resolve({ locale: "en" }) }));
  expect(screen.getByRole("heading", { level: 1, name: en.TeacherClass.challenges })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: en.TeacherClass.backToClasses })).toHaveClass("min-h-11");
  // The panel fields had a dark fill on the dark panel and no border: the frame gives them a
  // light fill, dark text, and a border.
  const frame = screen.getByTestId("panel").parentElement;
  for (const part of ["[&_input]:bg-background", "[&_input]:text-foreground", "[&_input]:border-input", "[&_select]:bg-background", "[&_select]:border-input"]) {
    expect(frame).toHaveClass(part);
  }
});
it("rejects a user without a school", async () => {
  mocks.user.mockResolvedValue({ id: "teacher-1", schoolId: null, role: "TEACHER" });
  await expect(Page({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow("NEXT_NOT_FOUND");
});
