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
import ReadListError from "../(student)/student/read/error";

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
    // A signed-in student goes back to the student home, not the marketing page.
    { name: "student", Component: StudentError, home: "/student/home" },
    { name: "teacher", Component: TeacherError, home: "/" },
  ] as const;

  for (const { name, Component, home } of boundaries) {
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

      it("points the home link at the home of the area", () => {
        render(withIntl(<Component error={error} reset={vi.fn()} />));

        expect(
          screen.getByRole("link", { name: enMessages.Error.goHome }),
        ).toHaveAttribute("href", home);
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
  // A missing article is a page state (not-found empty state in page.tsx), so this boundary
  // only handles load failures: it offers a retry and a way back to the read list.
  it("shows a retry state with a way back to the stories", () => {
    const reset = vi.fn();
    render(withIntl(<ArticleError error={error} reset={reset} />));

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(enMessages.ReadList.articleError);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(enMessages.ReadList.articleError);
    fireEvent.click(screen.getByRole("button", { name: enMessages.Error.retry }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: enMessages.ReadList.backToStories })).toHaveAttribute("href", "/student/read");
  });
});

describe("read list error boundary", () => {
  it("shows the load error with a retry", () => {
    const reset = vi.fn();
    render(withIntl(<ReadListError error={error} reset={reset} />));

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(enMessages.ReadList.loadError);
    fireEvent.click(screen.getByRole("button", { name: enMessages.Error.retry }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
