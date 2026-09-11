/**
 * FR-2 behavioral regression test for the handle-article infinite-scroll race.
 *
 * Rapid scroll events must issue at most one in-flight fetch. The loading
 * flag guards the IntersectionObserver trigger while a fetch is pending.
 */

import * as React from "react";
import { act, render, waitFor } from "@testing-library/react";

import HandleArticle from "@/components/handle-article";

jest.mock("nuqs", () => ({
  useQueryState: jest.fn(() => ["", jest.fn()]),
  parseAsArrayOf: jest.fn(() => ({})),
  parseAsInteger: {},
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));

jest.mock("@/components/article-showcase-card", () => ({
  __esModule: true,
  default: React.forwardRef(function MockShowcaseCard(
    { article }: { article: { id: string; title: string } },
    ref: React.Ref<HTMLDivElement>,
  ) {
    return <div ref={ref} data-testid="showcase-card">{article.title}</div>;
  }),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectSeparator: () => null,
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuCheckboxItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => null,
}));

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly callback: IntersectionObserverCallback;
  readonly observe = jest.fn();
  readonly unobserve = jest.fn();
  readonly disconnect = jest.fn();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }
}

(globalThis as any).IntersectionObserver = MockIntersectionObserver;

const passage = (id: string) => ({ id, title: `Article ${id}` });

function deferred() {
  let resolve!: (value: unknown) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function latestObserver(): MockIntersectionObserver {
  const instance = MockIntersectionObserver.instances.at(-1);
  if (!instance) throw new Error("Expected an IntersectionObserver instance.");
  return instance;
}

function triggerIntersection(instance: MockIntersectionObserver) {
  act(() => {
    instance.callback([{ isIntersecting: true } as IntersectionObserverEntry], instance as unknown as IntersectionObserver);
  });
}

describe("HandleArticle infinite scroll", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockIntersectionObserver.instances = [];
  });

  it("issues one fetch per page while scroll events fire during a pending fetch", async () => {
    const firstPage = deferred();
    const secondPage = deferred();
    (globalThis.fetch as jest.Mock) = jest
      .fn()
      .mockImplementationOnce(() => firstPage.promise.then(() => ({ ok: true, json: () => Promise.resolve([passage("a"), passage("b")]) })))
      .mockImplementationOnce(() => secondPage.promise.then(() => ({ ok: true, json: () => Promise.resolve([passage("c"), passage("d")]) })))
      .mockImplementation(() => {
        throw new Error("Unexpected extra fetch");
      });

    render(<HandleArticle />);

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));

    // The first page resolves and the sentinel observes the last card.
    await act(async () => {
      firstPage.resolve(undefined);
    });
    await waitFor(() => expect(MockIntersectionObserver.instances.length).toBeGreaterThan(0));

    const observer = latestObserver();
    expect(observer.observe).toHaveBeenCalled();

    // First scroll trigger starts the page-2 fetch.
    triggerIntersection(observer);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));

    // Rapid extra scroll events while page 2 is in flight must not fetch again.
    triggerIntersection(observer);
    triggerIntersection(observer);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);

    // After the fetch settles, the next scroll trigger fetches page 3.
    await act(async () => {
      secondPage.resolve(undefined);
    });
    await waitFor(() => {
      const newest = latestObserver();
      if (newest !== observer) {
        expect(newest.observe).toHaveBeenCalled();
      }
    });
    const settledObserver = latestObserver();
    triggerIntersection(settledObserver);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(3));
  });
});
