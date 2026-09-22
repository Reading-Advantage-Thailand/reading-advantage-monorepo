/**
 * FR-9 behavioral regression test for the matching game states.
 *
 * An empty deck must render an explicit empty state and a failed fetch must
 * render an explicit error state. Skeletons must only show while loading.
 */

import { render, screen, waitFor } from "@testing-library/react";

import Matching, {
  fetchVocabularyMatchingWords,
} from "@/components/matching";
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

/**
 * The `user_word_records.word` jsonb column holds two shapes: the canonical
 * `{ vocabulary, definition }` shape and the legacy `{ word, translation }`
 * shape saved by demo seeds. The vocabulary matching game must render cards
 * for both and drop rows that match neither shape.
 */

function makeLegacyRow(index: number) {
  return {
    id: `word-${index}`,
    due: "2099-01-01",
    word: { word: `Legacy ${index}`, translation: `คำศัพท์ ${index}` },
  };
}

function makeCanonicalRow(index: number) {
  return {
    id: `word-${index}`,
    due: "2099-01-01",
    word: {
      vocabulary: `Canonical ${index}`,
      definition: { en: `meaning ${index}`, th: `ความหมาย ${index}` },
    },
  };
}

describe("Matching vocabulary word payload shapes", () => {
  beforeEach(() => {
    (globalThis.fetch as jest.Mock) = jest.fn();
  });

  it("renders legacy-shape rows as cards with the word text and translation", async () => {
    const rows = Array.from({ length: 5 }, (_, i) => makeLegacyRow(i));
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ word: rows }),
    });

    render(
      <Matching userId="user-1" fetchWords={fetchVocabularyMatchingWords} />
    );

    await waitFor(() => expect(screen.getByText("Legacy 0")).toBeInTheDocument());
    expect(screen.getByText("คำศัพท์ 0")).toBeInTheDocument();
    expect(document.querySelector(".animate-pulse")).toBeNull();
  });

  it("renders canonical-shape rows as cards with the vocabulary and definition", async () => {
    const rows = Array.from({ length: 5 }, (_, i) => makeCanonicalRow(i));
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ word: rows }),
    });

    render(
      <Matching userId="user-1" fetchWords={fetchVocabularyMatchingWords} />
    );

    await waitFor(() =>
      expect(screen.getByText("Canonical 0")).toBeInTheDocument()
    );
    expect(screen.getByText("meaning 0")).toBeInTheDocument();
    expect(document.querySelector(".animate-pulse")).toBeNull();
  });

  it("filters out rows that match neither payload shape", async () => {
    const rows = [
      ...Array.from({ length: 5 }, (_, i) => makeLegacyRow(i)),
      { id: "junk-1", due: "2099-01-01", word: { foo: "Junk One" } },
      { id: "junk-2", due: "2099-01-01", word: null },
    ];
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ word: rows }),
    });

    render(
      <Matching userId="user-1" fetchWords={fetchVocabularyMatchingWords} />
    );

    await waitFor(() => expect(screen.getByText("Legacy 0")).toBeInTheDocument());
    expect(screen.queryByText("Junk One")).not.toBeInTheDocument();
    expect(screen.queryByText("foo")).not.toBeInTheDocument();
    expect(screen.getAllByText(/^Legacy \d$/)).toHaveLength(5);
    expect(document.querySelector(".animate-pulse")).toBeNull();
  });
});
