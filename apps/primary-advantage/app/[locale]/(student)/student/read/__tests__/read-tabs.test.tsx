// @vitest-environment jsdom
/** Read tab sign (STU-04): Articles is the default; the toolbar keeps four tabs. */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { withMessages } from "@/components/__tests__/helpers/render-with-messages";
import { studentPageConfig } from "@/configs/student-page-config";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { ReadTabs } from "@/components/stories/read-tabs";

afterEach(cleanup);

describe("ReadTabs", () => {
  it("marks Articles as current by default and links both tabs", () => {
    render(withMessages(<ReadTabs active="articles" />));
    const articles = screen.getByRole("link", { name: "Articles" });
    const stories = screen.getByRole("link", { name: "Stories" });
    expect(articles).toHaveAttribute("aria-current", "page");
    expect(articles).toHaveAttribute("href", "/student/read");
    expect(stories).not.toHaveAttribute("aria-current");
    expect(stories).toHaveAttribute("href", "/student/read/stories");
  });

  it("marks Stories as current on the Stories tab", () => {
    render(withMessages(<ReadTabs active="stories" />));
    expect(screen.getByRole("link", { name: "Stories" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Articles" })).not.toHaveAttribute("aria-current");
  });

  it("uses 48 px targets", () => {
    render(withMessages(<ReadTabs active="articles" />));
    for (const link of screen.getAllByRole("link")) expect(link.className).toContain("min-h-12");
  });

  it("leaves the toolbar with four tabs", () => {
    expect(studentPageConfig.tabs).toHaveLength(4);
  });
});
