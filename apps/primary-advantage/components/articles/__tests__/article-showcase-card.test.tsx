// @vitest-environment jsdom
/** Read list card (audit S1): a real link, a fallback when the image fails, one level, a status chip. */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages, testMessages } from "@/components/__tests__/helpers/render-with-messages";

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/student/read",
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import ArticleShowcaseCard from "../article-showcase-card";

const article = { id: "article-1", title: "River Crossing", summary: "A story about a river.", cefrLevel: "A1", raLevel: 3, rating: 0 };
const en = testMessages.en.ReadList;

afterEach(cleanup);

describe("ArticleShowcaseCard", () => {
  it("opens the article through a real link named by the title", () => {
    renderWithMessages(<ArticleShowcaseCard article={article} />);
    expect(screen.getByRole("link", { name: "River Crossing" })).toHaveAttribute("href", "/student/read/article-1");
  });

  it("offers the lesson as a second link with a 48 px target", () => {
    renderWithMessages(<ArticleShowcaseCard article={article} />);
    const lesson = screen.getByRole("link", { name: "Study River Crossing as a lesson" });
    expect(lesson).toHaveAttribute("href", "/student/lesson/article-1?type=article");
    expect(lesson).toHaveClass("min-h-12");
  });

  it("shows one level (CEFR) and no empty star rating", () => {
    renderWithMessages(<ArticleShowcaseCard article={article} />);
    expect(screen.getByText("A1")).toBeInTheDocument();
    expect(screen.queryByText(/RA Level/)).not.toBeInTheDocument();
    expect(document.querySelectorAll("svg.lucide-star")).toHaveLength(0);
  });

  it("drops the picture and keeps the fallback when the image fails to load", () => {
    renderWithMessages(<ArticleShowcaseCard article={article} />);
    const image = document.querySelector("img")!;
    fireEvent.error(image);
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector('[data-slot="article-image-fallback"]')).toBeInTheDocument();
  });

  it("labels a started and a finished story in Thai", () => {
    renderWithMessages(<ArticleShowcaseCard article={{ ...article, is_read: true }} />, { locale: "th" });
    expect(screen.getByText(testMessages.th.ReadList.started)).toBeInTheDocument();
    cleanup();
    renderWithMessages(<ArticleShowcaseCard article={{ ...article, is_read: true, is_completed: true }} />);
    expect(screen.getByText(en.completed)).toBeInTheDocument();
  });
});
