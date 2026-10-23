// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithMessages } from "@/components/__tests__/helpers/render-with-messages";
import { HelpIndex } from "../help-index";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => <a href={href} {...rest}>{children}</a>,
}));

const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
beforeEach(() => {
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("HelpIndex (FR-9)", () => {
  it("lists the teacher videos by area", () => {
    renderWithMessages(<HelpIndex />);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Start here",
      "Sign in",
      "Class page and students",
      "Class books and lessons",
      "Assignments and reports",
      "Class challenges",
      "Avatars",
      "Class Quest",
    ]);
    expect(within(screen.getByRole("region", { name: "Sign in" })).getByRole("button")).toHaveTextContent("The new teacher sign-in");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens the video of the play parameter (the manual link, FR-10) and records the play", () => {
    renderWithMessages(<HelpIndex initial="B3" />);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Play Start the class so students can sign in" }));
    const body = JSON.parse(String((fetchMock.mock.calls as unknown as [string, RequestInit][])[0][1].body));
    expect(body).toMatchObject({ event: "play", routePattern: "/teacher/help", videoId: "B3" });
  });

  it("ignores a play parameter that is not a teacher video", () => {
    renderWithMessages(<HelpIndex initial="C1" />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the area names in Thai", () => {
    renderWithMessages(<HelpIndex />, { locale: "th" });
    expect(screen.getByRole("heading", { level: 2, name: "การเข้าสู่ระบบ" })).toBeInTheDocument();
  });
});
