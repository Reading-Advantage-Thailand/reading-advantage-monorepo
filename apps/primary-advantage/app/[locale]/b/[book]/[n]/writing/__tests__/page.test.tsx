import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ openBookLink: vi.fn(), redirect: vi.fn() }));

vi.mock("@/lib/book-link/open-book-link", () => ({ openBookLink: mocks.openBookLink }));
vi.mock("@/i18n/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/components/book-link/book-link-case", () => ({ BookLinkCase: () => null }));
vi.mock("@/components/book-link/book-landing", () => ({ BookLanding: () => null }));

import WritingLinkPage from "../page";
import { BookLinkCase } from "@/components/book-link/book-link-case";
import { BookLanding } from "@/components/book-link/book-landing";

const open = (book = "o3-2", n = "5") => WritingLinkPage({ params: Promise.resolve({ locale: "th", book, n }) });

beforeEach(() => vi.clearAllMocks());

describe("/b/<book>/<n>/writing (writing QR code)", () => {
  it("calls the shared lookup with writing true and redirects", async () => {
    mocks.openBookLink.mockResolvedValue({ type: "redirect", href: "/student/read/a5" });
    await open();
    expect(mocks.openBookLink).toHaveBeenCalledWith({ locale: "th", book: "o3-2", n: "5", writing: true });
    expect(mocks.redirect).toHaveBeenCalledWith({ href: "/student/read/a5", locale: "th" });
  });

  it("redirects a teacher to the lesson page", async () => {
    mocks.openBookLink.mockResolvedValue({ type: "redirect", href: "/teacher/class-roster/c1/books/cb1/lessons/5" });
    await open();
    expect(mocks.redirect).toHaveBeenCalledWith({ href: "/teacher/class-roster/c1/books/cb1/lessons/5", locale: "th" });
  });

  it("renders the landing with the writing callback for a signed-out reader", async () => {
    const landing = {
      type: "landing", bookName: "Origins 3.2", title: "Story 5", number: 5, writing: true, tutorHref: null,
      signInHref: { pathname: "/auth/signin", query: { callbackUrl: "/th/b/o3-2/5/writing" } },
    };
    mocks.openBookLink.mockResolvedValue(landing);
    const element = (await open()) as { type: unknown; props: Record<string, unknown> };
    expect(element.type).toBe(BookLanding);
    expect(element.props).toMatchObject({ writing: true, signInHref: landing.signInHref });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("renders the not-ready and no-class case pages", async () => {
    for (const name of ["not-ready", "no-class"]) {
      mocks.openBookLink.mockResolvedValue({ type: "case", name, homeHref: "/" });
      const element = (await open()) as { type: unknown; props: Record<string, unknown> };
      expect(element.type).toBe(BookLinkCase);
      expect(element.props).toMatchObject({ name });
    }
  });
});
