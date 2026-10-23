// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithMessages, withMessages } from "@/components/__tests__/helpers/render-with-messages";
import { HelpPanel } from "../help-panel";

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
/** The bodies of the help events that the panel sent. */
const events = () => (fetchMock.mock.calls as unknown as [string, RequestInit][]).map(([url, init]) => ({ url, ...JSON.parse(String(init.body)) }));

const panel = (pathname: string, audience: "teacher" | "student", locale: "en" | "th" | "vi" = "en", onOpenChange = vi.fn()) =>
  renderWithMessages(<HelpPanel open pathname={pathname} audience={audience} onOpenChange={onOpenChange} />, { locale });

const media = () => document.querySelectorAll("video, iframe").length;

describe("HelpPanel (spec FR-2 to FR-4, FR-7)", () => {
  it("lists the page's own video first, then the general videos (AC-1)", () => {
    panel("/teacher/class-roster/abc/qr-cards", "teacher");
    const page = screen.getByRole("region", { name: "For this page" });
    expect(within(page).getAllByRole("button").map((b) => b.textContent)).toEqual([expect.stringContaining("Print the class sheet and QR cards")]);
    const more = screen.getByRole("region", { name: "More help" });
    expect(within(more).getAllByRole("button")).toHaveLength(2);
    expect(media()).toBe(0);
  });

  it("plays a teacher video from YouTube after the tap, with a way to play without YouTube (AC-7)", () => {
    panel("/teacher/class-roster/abc/qr-cards", "teacher");
    fireEvent.click(screen.getByRole("button", { name: /Print the class sheet and QR cards/ }));
    expect(media()).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Play Print the class sheet and QR cards" }));
    const frame = document.querySelector("iframe");
    expect(frame?.getAttribute("src")).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/-3UpVH9Xp50\?/);
    fireEvent.click(screen.getByRole("button", { name: "Play without YouTube" }));
    expect(document.querySelector("iframe")).toBeNull();
    expect(document.querySelector("video")?.getAttribute("src")).toMatch(/\/help\/whats-new\/B4\.mp4$/);
  });

  it("plays a teacher video that is not on YouTube from our own file", () => {
    panel("/teacher/class-roster/abc/enrollment", "teacher");
    fireEvent.click(screen.getByRole("button", { name: /Add and remove students/ }));
    fireEvent.click(screen.getByRole("button", { name: "Play Add and remove students" }));
    expect(document.querySelector("iframe")).toBeNull();
    expect(document.querySelector("video")?.getAttribute("src")).toMatch(/\/help\/whats-new\/E3\.mp4$/);
  });

  it("never gives a student a YouTube player, and plays in a portrait box (AC-2)", () => {
    panel("/student/home", "student");
    fireEvent.click(screen.getByRole("button", { name: /My new home page/ }));
    fireEvent.click(screen.getByRole("button", { name: "Play My new home page" }));
    const video = document.querySelector("video");
    expect(video?.getAttribute("src")).toMatch(/\/help\/whats-new\/C1\.mp4$/);
    expect(video?.closest("[data-format]")?.getAttribute("data-format")).toBe("9x16");
    expect(document.querySelector("iframe")).toBeNull();
    expect(screen.queryByRole("button", { name: "Play without YouTube" })).toBeNull();
  });

  it("goes back from the player to the list, with the focus on the video's row", () => {
    panel("/student/home", "student");
    fireEvent.click(screen.getByRole("button", { name: /My new home page/ }));
    fireEvent.click(screen.getByRole("button", { name: "Back to the list" }));
    expect(screen.getByRole("region", { name: "For this page" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /My new home page/ })).toHaveFocus();
  });

  it("says so when our own video file does not load", () => {
    panel("/student/home", "student");
    fireEvent.click(screen.getByRole("button", { name: /My new home page/ }));
    fireEvent.click(screen.getByRole("button", { name: "Play My new home page" }));
    fireEvent.error(document.querySelector("video") as HTMLVideoElement);
    expect(document.querySelector("video")).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("The video did not load. Go back and try again later.");
    expect(screen.getByRole("button", { name: "Back to the list" })).toBeInTheDocument();
  });

  it("says that a page has no video yet and links the teacher manual (AC-3)", () => {
    panel("/teacher/my-students", "teacher");
    expect(screen.getByText("There is no video for this page yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open the teacher manual" })).toHaveAttribute("href", "/teacher/manual");
  });

  it("shows the Thai titles in Thai", () => {
    panel("/student/home", "student", "th");
    expect(screen.getByRole("button", { name: /หน้าหลักใหม่ของหนู/ })).toBeInTheDocument();
    expect(screen.queryByText(/Thai narration/)).toBeNull();
  });

  it("shows the English titles and the Thai narration note in another language", () => {
    panel("/student/home", "student", "vi");
    expect(screen.getByRole("button", { name: /My new home page/ })).toBeInTheDocument();
    expect(screen.getAllByText(/Thuyết minh tiếng Thái/).length).toBeGreaterThan(0);
    expect(screen.getByRole("region", { name: "Cho trang này" })).toBeInTheDocument();
  });

  it("sends an open event with the page pattern and a play event with the source (FR-11)", () => {
    panel("/teacher/class-roster/830b7de6-7b63-486f-8050-25b6c027b0c3/qr-cards", "teacher");
    expect(events()).toEqual([{ url: "/api/v1/help/events", event: "open", routePattern: "/teacher/class-roster/[id]/qr-cards", matched: 1 }]);
    fireEvent.click(screen.getByRole("button", { name: /Print the class sheet and QR cards/ }));
    expect(events()).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Play Print the class sheet and QR cards" }));
    fireEvent.click(screen.getByRole("button", { name: "Play without YouTube" }));
    expect(events().slice(1)).toEqual([
      { url: "/api/v1/help/events", event: "play", routePattern: "/teacher/class-roster/[id]/qr-cards", videoId: "B4", source: "youtube" },
      { url: "/api/v1/help/events", event: "play", routePattern: "/teacher/class-roster/[id]/qr-cards", videoId: "B4", source: "file" },
    ]);
  });

  it("sends no event when record is false, and plays even when the event fails", () => {
    fetchMock.mockImplementation(() => Promise.reject(new Error("offline")));
    renderWithMessages(<HelpPanel open pathname="/student/home" audience="student" onOpenChange={vi.fn()} record={false} />);
    fireEvent.click(screen.getByRole("button", { name: /My new home page/ }));
    fireEvent.click(screen.getByRole("button", { name: "Play My new home page" }));
    expect(fetchMock).not.toHaveBeenCalled();
    cleanup();
    panel("/student/home", "student");
    fireEvent.click(screen.getByRole("button", { name: /My new home page/ }));
    fireEvent.click(screen.getByRole("button", { name: "Play My new home page" }));
    expect(document.querySelector("video")).not.toBeNull();
    expect(events().map((e) => e.event)).toEqual(["open", "play"]);
  });

  it("stops the video when the panel closes", () => {
    const onOpenChange = vi.fn();
    const { rerender } = panel("/student/home", "student", "en", onOpenChange);
    fireEvent.click(screen.getByRole("button", { name: /My new home page/ }));
    fireEvent.click(screen.getByRole("button", { name: "Play My new home page" }));
    expect(document.querySelector("video")).not.toBeNull();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    rerender(withMessages(<HelpPanel open={false} pathname="/student/home" audience="student" onOpenChange={onOpenChange} />));
    expect(document.querySelector("video")).toBeNull();
  });
});
