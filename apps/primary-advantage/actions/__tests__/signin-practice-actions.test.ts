// @vitest-environment node
/** signInAction and the practice deck lookups: input checks, the fetch calls, and the error answers. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ currentUser: vi.fn(), deckRows: [] as unknown[], selectError: null as Error | null }));

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/lib/observability/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));
vi.mock("@reading-advantage/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            if (mocks.selectError) throw mocks.selectError;
            return mocks.deckRows;
          },
        }),
      }),
    }),
  },
  eq: vi.fn(),
  and: vi.fn(),
  flashcardDecks: { userId: "fd.u", type: "fd.t" },
}));

import { signInAction } from "../signinAction";
import { getFlashcardDeckId, getSentencesForOrderingGame } from "../practice";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mocks.deckRows = [];
  mocks.selectError = null;
  mocks.currentUser.mockResolvedValue({ id: "stu-1", role: "STUDENT" });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_BASE_URL", "http://app.test");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://app.test");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("signInAction", () => {
  it("refuses invalid input without a network call", async () => {
    expect(await signInAction({} as never)).toEqual({ error: "Invalid input data" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts only the username and password to the login route", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    expect(await signInAction({ username: "kid1", password: "secret123" } as never)).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("http://app.test/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "kid1", password: "secret123" }),
    });
  });

  it("answers a generic error for a refused login", async () => {
    fetchMock.mockResolvedValue({ ok: false });
    expect(await signInAction({ username: "kid1", password: "wrong-pass" } as never)).toEqual({ error: "Invalid username or password" });
  });

  it("answers an unknown error when the network fails", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    expect(await signInAction({ username: "kid1", password: "secret123" } as never)).toEqual({ error: "An unknown error occurred" });
  });
});

describe("getFlashcardDeckId", () => {
  it("refuses without a user", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect(await getFlashcardDeckId()).toEqual({ success: false, error: "Unauthorized" });
  });

  it("answers not found without a sentence deck", async () => {
    expect(await getFlashcardDeckId()).toEqual({ success: false, error: "No sentence flashcard deck found" });
  });

  it("returns the deck id", async () => {
    mocks.deckRows = [{ id: "deck-1" }];
    expect(await getFlashcardDeckId()).toEqual({ success: true, deckId: "deck-1" });
  });

  it("answers an error when the database fails", async () => {
    mocks.selectError = new Error("db");
    expect(await getFlashcardDeckId()).toEqual({ success: false, error: "Failed to get flashcard deck" });
  });
});

describe("getSentencesForOrderingGame", () => {
  it("refuses without a user", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect(await getSentencesForOrderingGame()).toEqual({ success: false, error: "Unauthorized" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers not found without a sentence deck", async () => {
    expect((await getSentencesForOrderingGame()).success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the sentence groups from the deck route", async () => {
    mocks.deckRows = [{ id: "deck-1" }];
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ sentenceGroups: [{ id: "g1" }] }) });
    expect(await getSentencesForOrderingGame()).toEqual({ success: true, data: [{ id: "g1" }] });
    expect(fetchMock).toHaveBeenCalledWith("http://app.test/api/flashcard/decks/deck-1/sentences-for-ordering");
  });

  it("returns an empty list when the route sends no groups", async () => {
    mocks.deckRows = [{ id: "deck-1" }];
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    expect(await getSentencesForOrderingGame()).toEqual({ success: true, data: [] });
  });

  it("answers an error when the route fails", async () => {
    mocks.deckRows = [{ id: "deck-1" }];
    fetchMock.mockResolvedValue({ ok: false });
    expect(await getSentencesForOrderingGame()).toEqual({ success: false, error: "Failed to fetch sentences for ordering game" });
  });

  it("answers an error when the fetch throws", async () => {
    mocks.deckRows = [{ id: "deck-1" }];
    fetchMock.mockRejectedValue(new Error("offline"));
    expect(await getSentencesForOrderingGame()).toEqual({ success: false, error: "Failed to get sentences for ordering game" });
  });
});
