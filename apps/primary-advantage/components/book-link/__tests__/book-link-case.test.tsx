import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import en from "../../../messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock("@/components/switchers/locale-switcher", () => ({ LocaleSwitcher: ({ triggerClassName }: { triggerClassName?: string }) => <span data-locale-switcher data-trigger={triggerClassName} /> }));
vi.mock("@/components/rpg/scene", () => ({ Scene: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/rpg/sprite", () => ({ Sprite: () => <span data-sprite /> }));

import { BookLinkCaseView } from "../book-link-case";

const t = (key: string, values?: Record<string, string | number>) =>
  String((en.BookLink as Record<string, string>)[key]).replace(/\{(\w+)\}/g, (_m, name) => String(values?.[name]));
const html = (props: Parameters<typeof BookLinkCaseView>[0]) => renderToStaticMarkup(<BookLinkCaseView {...props} />);

describe("BookLinkCaseView", () => {
  it("renders the heading as an alert with the markers and one button for each case", () => {
    for (const name of ["unknown-book", "no-lesson", "not-ready", "no-class", "teacher-only", "wrong-account", "unknown-address", "retry"] as const) {
      const out = html({ t, name, homeHref: "/student/home", bookName: "Origins 3.2", lessonCount: 14, retryHref: "/b/o3-2/5" });
      expect(out).toContain("data-book-link");
      expect(out).toContain(`data-case="${name}"`);
      expect(out).toContain('role="alert"');
      expect(out).toContain("data-locale-switcher");
      expect(out).toContain('data-trigger="size-12"');
      expect(out.match(/<a /g)).toHaveLength(1);
      expect(out).not.toContain("undefined");
    }
  });

  it("names the book and the lesson range in the no-lesson page", () => {
    expect(html({ t, name: "no-lesson", homeHref: "/", bookName: "Origins 3.2", lessonCount: 14 })).toContain("Origins 3.2 has Lessons 1 to 14.");
  });

  it("links the buttons to the right target", () => {
    expect(html({ t, name: "no-class", homeHref: "/teacher/my-classes", bookName: "Origins 3.2" })).toContain('href="/teacher/my-classes"');
    expect(html({ t, name: "retry", homeHref: "/", retryHref: "/b/o3-2/5/writing" })).toContain('href="/b/o3-2/5/writing"');
    expect(html({ t, name: "unknown-address", homeHref: "/student/home" })).toContain('href="/"');
  });
});

describe("BookLinkCaseView bubble", () => {
  it("uses the retry bubble word for retry and the default word elsewhere", () => {
    expect(html({ t, name: "retry", homeHref: "/", retryHref: "/b/o3-2/5" })).toContain("Oops!");
    expect(html({ t, name: "unknown-book", homeHref: "/" })).toContain("Oh no!");
    expect(html({ t, name: "not-ready", homeHref: "/" })).toContain("Not yet!");
  });
});
