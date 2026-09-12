import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import Page from "./page";
const session = jest.fn();
jest.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "token" }) }) }));
jest.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
jest.mock("next/link", () => ({ __esModule: true, default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
jest.mock("@reading-advantage/auth", () => ({ SESSION_COOKIE_NAME: "session", validateSession: (...args: unknown[]) => session(...args) }));
jest.mock("@reading-advantage/db", () => ({ db: {} }));
jest.mock("@reading-advantage/game-cartridges", () => ({ CARTRIDGE_CHALLENGE_CAPABILITIES: { dragon: { version: "v1" } }, getCartridgeCatalogEntry: () => ({ title: "Dragon" }) }));
jest.mock("@reading-advantage/advantage-play-kit/react", () => ({ TeacherChallengePanel: (props: Record<string, unknown>) => <div data-testid="panel" data-props={JSON.stringify(props)} /> }));
jest.mock("@/lib/games-runtime", () => ({ withBasePath: (path: string) => `/base${path}` }));
it("authorizes a teacher and passes the challenge configuration", async () => {
  session.mockResolvedValue({ user: { id: "teacher-1", schoolId: "school-1", role: "TEACHER" } });
  render(await Page({ params: Promise.resolve({ locale: "th" }) }));
  expect(JSON.parse(screen.getByTestId("panel").getAttribute("data-props") ?? "{}")).toMatchObject({ ownerKey: "school-1:teacher-1", games: { dragon: { title: "Dragon", version: "v1" } }, endpoint: "/base/api/v1/apk/challenges", classesEndpoint: "/base/api/v1/apk/challenges/teacher-classes", basePath: "/base/" });
  expect(screen.getByRole("link", { name: "Back to games" })).toHaveAttribute("href", "/th/student/games");
});
it("rejects a student session", async () => {
  session.mockResolvedValue({ user: { id: "student-1", schoolId: "school-1", role: "STUDENT" } });
  await expect(Page({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow("NEXT_NOT_FOUND");
});
