// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

import enMessages from "../../../messages/en.json";

// The error boundaries import Link from the locale-aware navigation wrapper.
// Render it as a plain anchor so the href can be asserted without a router.
vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...rest
  }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
}));

import StudentError from "../(student)/error";
import TeacherError from "../teacher/error";
import GlobalError from "../../global-error";
import ArticleError from "../(student)/student/read/[articleId]/error";

const error = new Error("boundary failure");

/**
 * Wraps a client element in the real next-intl provider with en.json.
 * @param ui The element to wrap.
 * @returns The provider-wrapped element.
 */
function withIntl(ui: ReactElement): ReactElement {
  return (
    <NextIntlClientProvider
      locale="en"
      messages={enMessages as React.ComponentProps<typeof NextIntlClientProvider>["messages"]}
    >
      {ui}
    </NextIntlClientProvider>
  );
}

beforeAll(() => {
  // Each boundary logs the error through useEffect; keep the output quiet.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
});

describe("route-group error boundaries", () => {
  const boundaries = [
    { name: "student", Component: StudentError },
    { name: "teacher", Component: TeacherError },
  ] as const;

  for (const { name, Component } of boundaries) {
    describe(`${name} group boundary`, () => {
      it("renders the Error namespace copy from the real en.json", () => {
        render(withIntl(<Component error={error} reset={vi.fn()} />));

        expect(
          screen.getByRole("heading", { name: enMessages.Error.title }),
        ).toBeInTheDocument();
        expect(
          screen.getByText(enMessages.Error.description),
        ).toBeInTheDocument();
      });

      it("calls reset from the retry button", () => {
        const reset = vi.fn();
        render(withIntl(<Component error={error} reset={reset} />));

        fireEvent.click(
          screen.getByRole("button", { name: enMessages.Error.retry }),
        );

        expect(reset).toHaveBeenCalledTimes(1);
      });

      it("points the home link at the root path", () => {
        render(withIntl(<Component error={error} reset={vi.fn()} />));

        expect(
          screen.getByRole("link", { name: enMessages.Error.goHome }),
        ).toHaveAttribute("href", "/");
      });
    });
  }
});

describe("global-error", () => {
  it("renders the Error namespace copy from the real en.json", () => {
    render(<GlobalError error={error} reset={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: enMessages.Error.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(enMessages.Error.description)).toBeInTheDocument();
  });

  it("calls reset from the retry button", () => {
    const reset = vi.fn();
    render(<GlobalError error={error} reset={reset} />);

    fireEvent.click(screen.getByRole("button", { name: enMessages.Error.retry }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("points the home link at the root path", () => {
    render(<GlobalError error={error} reset={vi.fn()} />);

    expect(
      screen.getByRole("link", { name: enMessages.Error.goHome }),
    ).toHaveAttribute("href", "/");
  });
});

describe("article reader error boundary", () => {
  it("renders the 404 copy for the NEXT_NOT_FOUND digest", () => {
    const notFound = Object.assign(new Error("missing article"), {
      digest: "NEXT_NOT_FOUND",
    });

    render(withIntl(<ArticleError error={notFound} reset={vi.fn()} />));

    expect(
      screen.getByRole("heading", { name: "Article Not Found" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        // The component writes &apos;, which React renders as a plain apostrophe.
        "Sorry, we couldn't find the article you're looking for.",
      ),
    ).toBeInTheDocument();
    // The not-found branch offers no retry affordance.
    expect(
      screen.queryByRole("button", { name: enMessages.Error.retry }),
    ).not.toBeInTheDocument();
  });

  it("renders the generic retry state for a different digest", () => {
    const other = Object.assign(new Error("reader failure"), {
      digest: "NEXT_SOMETHING_ELSE",
    });
    const reset = vi.fn();

    render(withIntl(<ArticleError error={other} reset={reset} />));

    expect(
      screen.getByRole("heading", { name: enMessages.Error.title }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Article Not Found")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: enMessages.Error.retry }));

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
