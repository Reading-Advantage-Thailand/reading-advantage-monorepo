// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { vi, it, expect } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
vi.mock("@/lib/session", () => ({ getCurrentUser: () => mocks.user() }));
vi.mock("@reading-advantage/game-cartridges", () => ({ CARTRIDGE_CHALLENGE_CAPABILITIES: { dragon: { version: "v1" } }, getCartridgeCatalogEntry: () => ({ title: "Dragon" }) }));
vi.mock("@reading-advantage/advantage-play-kit/react", () => ({ TeacherChallengePanel: (props: Record<string, unknown>) => <div data-testid="panel" data-props={JSON.stringify(props)} /> }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
import Page from "../page";
it("authorizes a teacher and passes the challenge configuration", async () => {
  mocks.user.mockResolvedValue({ id: "teacher-1", schoolId: "school-1", role: "TEACHER" });
  render(await Page({ params: Promise.resolve({ locale: "zh" }) }));
  expect(JSON.parse(screen.getByTestId("panel").getAttribute("data-props") ?? "{}")).toMatchObject({ ownerKey: "school-1:teacher-1", games: { dragon: { title: "Dragon", version: "v1" } } });
  expect(screen.getByRole("link", { name: "Back to classes" })).toHaveAttribute("href", "/zh/teacher/my-classes");
});
it("rejects a user without a school", async () => {
  mocks.user.mockResolvedValue({ id: "teacher-1", schoolId: null, role: "TEACHER" });
  await expect(Page({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow("NEXT_NOT_FOUND");
});
