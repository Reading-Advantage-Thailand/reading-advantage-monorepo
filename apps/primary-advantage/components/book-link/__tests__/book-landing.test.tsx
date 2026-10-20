import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import en from "../../../messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: unknown; children: ReactNode }) => (
    <a href={typeof href === "string" ? href : JSON.stringify(href)} {...rest}>{children}</a>
  ),
}));
vi.mock("@/components/switchers/locale-switcher", () => ({ LocaleSwitcher: () => <span data-locale-switcher /> }));
vi.mock("@/components/rpg/scene", () => ({ Scene: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/rpg/sprite", () => ({ Sprite: () => <span data-sprite /> }));

import { BookLandingView } from "../book-landing";

const t = (key: string, values?: Record<string, string | number>) =>
  String((en.BookLink as Record<string, string>)[key]).replace(/\{(\w+)\}/g, (_m, name) => String(values?.[name]));
const base = {
  t,
  bookName: "Primary Advantage Origins 3.2",
  title: "A Day at the Sea Park",
  number: 5,
  writing: false,
  signInHref: { pathname: "/auth/signin", query: { callbackUrl: "/th/b/o3-2/5" } },
  tutorHref: null,
} as const;
const html = (props: Partial<Parameters<typeof BookLandingView>[0]> = {}) => renderToStaticMarkup(<BookLandingView {...base} {...props} />);

describe("BookLandingView", () => {
  it("shows the book name, the lesson line, the question, and the markers", () => {
    const out = html();
    expect(out).toContain("data-book-link");
    expect(out).toContain("data-landing");
    expect(out).toContain("Primary Advantage Origins 3.2");
    expect(out).toContain("Lesson 5: A Day at the Sea Park");
    expect(out).toContain(en.BookLink.landingQuestion);
    expect(out).toContain("data-locale-switcher");
    expect(out).not.toContain("undefined");
  });

  it("shows the school choice only when there is no Tutor link", () => {
    const out = html();
    expect(out.match(/<a /g)).toHaveLength(1);
    expect(out).toContain(en.BookLink.choiceSchool);
    expect(out).toContain("callbackUrl");
    expect(out).not.toContain(en.BookLink.choiceTutor);
  });

  it("shows the school choice first and the Tutor choice second", () => {
    const out = html({ tutorHref: "https://tutor.example.com/lesson/o3-2/5" });
    expect(out.match(/<a /g)).toHaveLength(2);
    expect(out.indexOf(en.BookLink.choiceSchool)).toBeLessThan(out.indexOf(en.BookLink.choiceTutor));
    expect(out).toContain('href="https://tutor.example.com/lesson/o3-2/5"');
  });

  it("marks the writing code with its bubble and a small line", () => {
    const out = html({ writing: true });
    expect(out).toContain(en.BookLink.bubbleWrite);
    expect(out).toContain(en.BookLink.writingTask);
    expect(html()).not.toContain(en.BookLink.writingTask);
    expect(html()).toContain(en.BookLink.bubbleRead);
  });
});
