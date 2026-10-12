import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ openBookLink: vi.fn(), redirect: vi.fn() }));

vi.mock("@/lib/book-link/open-book-link", () => ({ openBookLink: mocks.openBookLink }));
vi.mock("@/i18n/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/components/book-link/book-link-case", () => ({ BookLinkCase: () => null }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

import BookLessonLinkPage from "../page";
import { BookLinkCase } from "@/components/book-link/book-link-case";

const open = (book = "o3-2", n = "5") => BookLessonLinkPage({ params: Promise.resolve({ locale: "th", book, n }) });

beforeEach(() => vi.clearAllMocks());

describe("/b/<book>/<n> (QR deep link, FR-16)", () => {
  it("passes the address to the shared lookup for the reading code", async () => {
    mocks.openBookLink.mockResolvedValue({ type: "redirect", href: "/student/lesson/a5?type=article" });
    await open();
    expect(mocks.openBookLink).toHaveBeenCalledWith({ locale: "th", book: "o3-2", n: "5", writing: false });
    expect(mocks.redirect).toHaveBeenCalledWith({ href: "/student/lesson/a5?type=article", locale: "th" });
  });

  it("keeps a href object for the sign-in redirect", async () => {
    const href = { pathname: "/auth/signin", query: { callbackUrl: "/th/b/o3-2/5" } };
    mocks.openBookLink.mockResolvedValue({ type: "redirect", href });
    await open();
    expect(mocks.redirect).toHaveBeenCalledWith({ href, locale: "th" });
  });

  it("renders the case page for each case and never calls notFound", async () => {
    mocks.openBookLink.mockResolvedValue({ type: "case", name: "unknown-book", homeHref: "/" });
    const element = (await open("zz", "1")) as { type: unknown; props: Record<string, unknown> };
    expect(element.type).toBe(BookLinkCase);
    expect(element.props).toMatchObject({ name: "unknown-book", homeHref: "/" });
    expect(mocks.redirect).not.toHaveBeenCalled();
    mocks.openBookLink.mockResolvedValue({ type: "case", name: "no-lesson", bookName: "Origins 3.2", lessonCount: 14, homeHref: "/student/home" });
    await expect(open("o3-2", "999")).resolves.toMatchObject({ props: { name: "no-lesson", lessonCount: 14 } });
  });
});
