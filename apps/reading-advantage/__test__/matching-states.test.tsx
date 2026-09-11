/**
 * FR-9 behavioral regression test for the matching game states.
 *
 * An empty deck must render an explicit empty state and a failed fetch must
 * render an explicit error state. Skeletons must only show while loading.
 */

import { render, screen, waitFor } from "@testing-library/react";

import Matching from "@/components/matching";
import type { Sentence } from "@/components/practic/types";

jest.mock("@/locales/client", () => ({
  useCurrentLocale: () => "en",
  useScopedI18n: () => (key: string) => key,
  usePathname: () => "/student/practice",
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock("@/components/audio-button", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => <img {...props} alt={(props.alt as string) ?? ""} />,
}));

function makeSentence(index: number): Sentence {
  return {
    id: `sentence-${index}`,
    articleId: `article-${index}`,
    createdAt: { _seconds: 0, _nanoseconds: 0 },
    endTimepoint: 2,
    sentence: `Sentence ${index}`,
    sn: index,
    timepoint: 1,
    translation: { th: `ประโยค ${index}` },
    userId: "user-1",
    due: "2099-01-01",
  };
}

describe("Matching empty and error states", () => {
  beforeEach(() => {
    (globalThis.fetch as jest.Mock) = jest.fn();
  });

  it("renders the word cards after a successful fetch", async () => {
    const sentences = Array.from({ length: 5 }, (_, i) => makeSentence(i));
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sentences }),
    });

    render(<Matching userId="user-1" />);

    await waitFor(() => expect(screen.getByText("Sentence 0")).toBeInTheDocument());
    expect(document.querySelector(".animate-pulse")).toBeNull();
  });

  it("renders the empty state instead of skeletons when no sentences are saved", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sentences: [] }),
    });

    render(<Matching userId="user-1" />);

    await waitFor(() => expect(screen.getByText("matchingPractice.minSentencesAlert")).toBeInTheDocument());
    expect(document.querySelector(".animate-pulse")).toBeNull();
  });

  it("renders the error state when the fetch rejects", async () => {
    (globalThis.fetch as jest.Mock).mockRejectedValue(new Error("network down"));

    render(<Matching userId="user-1" />);

    await waitFor(() => expect(screen.getByText("toast.error")).toBeInTheDocument());
    expect(document.querySelector(".animate-pulse")).toBeNull();
  });
});
