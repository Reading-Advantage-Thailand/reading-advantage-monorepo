import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import Page from "./page";
const currentUser = jest.fn(); const context = jest.fn();
jest.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
jest.mock("next/link", () => ({ __esModule: true, default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
jest.mock("@/lib/session", () => ({ getCurrentUser: () => currentUser() }));
jest.mock("@/lib/apk/to-user-context", () => ({ toUserContext: (...args: unknown[]) => context(...args) }));
jest.mock("@reading-advantage/game-cartridges", () => ({ CARTRIDGE_CHALLENGE_CAPABILITIES: { dragon: { version: "v1" } }, getCartridgeCatalogEntry: () => ({ title: "Dragon" }) }));
jest.mock("@reading-advantage/advantage-play-kit/react", () => ({ TeacherChallengePanel: (props: Record<string, unknown>) => <div data-testid="panel" data-props={JSON.stringify(props)} /> }));
it("authorizes an admin and passes the challenge configuration", async () => {
  currentUser.mockResolvedValue({ id: "raw" }); context.mockReturnValue({ id: "admin-1", schoolId: "school-1", role: "ADMIN" });
  render(await Page({ params: Promise.resolve({ locale: "en" }) }));
  expect(JSON.parse(screen.getByTestId("panel").getAttribute("data-props") ?? "{}")).toMatchObject({ ownerKey: "school-1:admin-1", games: { dragon: { title: "Dragon", version: "v1" } } });
  expect(screen.getByRole("link", { name: "Back to classes" })).toHaveAttribute("href", "/en/teacher/my-classes");
});
it("rejects an unauthenticated request", async () => {
  currentUser.mockResolvedValue(null);
  await expect(Page({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow("NEXT_NOT_FOUND");
});
