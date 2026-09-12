import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RpgCosmeticId, StudentRpgState } from "@reading-advantage/game-contracts";

import { useStudentRpg } from "./use-student-rpg.js";

const fetchMock = vi.fn<typeof fetch>();

/** Creates valid server state with selected unlocks and equipment. */
function createState(
  unlockedIds: readonly RpgCosmeticId[] = ["apprentice-wand"],
  equippedEmblemId: RpgCosmeticId | null = null,
): StudentRpgState {
  const unlockedAt = "2026-09-09T01:00:00.000Z";
  return {
    schemaVersion: 1,
    equippedEmblemId,
    cosmetics: [
      { id: "apprentice-wand", slot: "profile-emblem", name: "Apprentice Wand", unlockedAt: unlockedIds.includes("apprentice-wand") ? unlockedAt : null, equipped: equippedEmblemId === "apprentice-wand" },
      { id: "graveyard-staff", slot: "profile-emblem", name: "Graveyard Staff", unlockedAt: unlockedIds.includes("graveyard-staff") ? unlockedAt : null, equipped: equippedEmblemId === "graveyard-staff" },
      { id: "echo-staff", slot: "profile-emblem", name: "Echo Staff", unlockedAt: unlockedIds.includes("echo-staff") ? unlockedAt : null, equipped: equippedEmblemId === "echo-staff" },
    ],
    quests: [
      { id: "first-ward", completed: unlockedIds.includes("apprentice-wand"), completedAt: unlockedIds.includes("apprentice-wand") ? unlockedAt : null, rewardId: "apprentice-wand" },
      { id: "complete-the-ward", completed: unlockedIds.includes("graveyard-staff"), completedAt: unlockedIds.includes("graveyard-staff") ? unlockedAt : null, rewardId: "graveyard-staff" },
      { id: "perfect-english-audio", completed: unlockedIds.includes("echo-staff"), completedAt: unlockedIds.includes("echo-staff") ? unlockedAt : null, rewardId: "echo-staff" },
    ],
  };
}

/** Creates a JSON response for a mocked route request. */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("useStudentRpg", () => {
  it("validates the initial state, sends a strict equip body, and reloads confirmed state", async () => {
    const initial = createState();
    const equipped = createState(["apprentice-wand"], "apprentice-wand");
    fetchMock
      .mockResolvedValueOnce(jsonResponse(initial))
      .mockResolvedValueOnce(jsonResponse({ equippedEmblemId: "apprentice-wand" }))
      .mockResolvedValueOnce(jsonResponse(equipped));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useStudentRpg({ endpoint: "/api/rpg", ownerKey: "student-1" }));
    await waitFor(() => expect(result.current.state).toEqual(initial));

    await act(async () => result.current.equip("apprentice-wand"));

    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/rpg", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ cosmeticId: "apprentice-wand" }),
    }));
    expect(result.current.state).toEqual(equipped);
    expect(result.current.pendingCosmeticId).toBeNull();
    expect(result.current.failureMessage).toBeNull();
  });

  it("preserves confirmed state and retries the exact failed equip", async () => {
    const initial = createState();
    const equipped = createState(["apprentice-wand"], "apprentice-wand");
    fetchMock
      .mockResolvedValueOnce(jsonResponse(initial))
      .mockResolvedValueOnce(jsonResponse({ error: { code: "SAVE_FAILED", message: "Equipment could not be saved." } }, 500))
      .mockResolvedValueOnce(jsonResponse({ equippedEmblemId: "apprentice-wand" }))
      .mockResolvedValueOnce(jsonResponse(equipped));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useStudentRpg({ endpoint: "/api/rpg", ownerKey: "student-1" }));
    await waitFor(() => expect(result.current.state).toEqual(initial));
    await act(async () => result.current.equip("apprentice-wand"));

    expect(result.current.state).toEqual(initial);
    expect(result.current.failureMessage).toBe("Reward could not be equipped. Try again.");

    await act(async () => result.current.retry());

    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/rpg", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ cosmeticId: "apprentice-wand" }),
    }));
    expect(result.current.state).toEqual(equipped);
  });

  it("rejects an invalid read response and retries the failed GET", async () => {
    const confirmed = createState();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ schemaVersion: 1, cosmetics: [] }))
      .mockResolvedValueOnce(jsonResponse(confirmed));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useStudentRpg({ endpoint: "/api/rpg", ownerKey: "student-1" }));
    await waitFor(() => expect(result.current.failureMessage).not.toBeNull());
    expect(result.current.state).toBeNull();

    await act(async () => result.current.retry());

    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/rpg", expect.objectContaining({ method: "GET" }));
    expect(result.current.state).toEqual(confirmed);
  });

  it("announces only new confirmed unlocks and clears the notice for replay", async () => {
    const initial = createState();
    const refreshed = createState(["apprentice-wand", "graveyard-staff"]);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(initial))
      .mockResolvedValueOnce(jsonResponse(refreshed))
      .mockResolvedValueOnce(jsonResponse({ error: { code: "LOAD_FAILED", message: "Rewards could not be refreshed." } }, 500));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useStudentRpg({ endpoint: "/api/rpg", ownerKey: "student-1" }));
    await waitFor(() => expect(result.current.state).toEqual(initial));
    act(() => result.current.beginSession());
    await act(async () => result.current.refreshAfterSavedCompletion());

    expect(result.current.newlyUnlockedCosmetics.map(({ id }) => id)).toEqual(["graveyard-staff"]);
    act(() => result.current.beginSession());
    expect(result.current.newlyUnlockedCosmetics).toEqual([]);

    await act(async () => result.current.refreshAfterSavedCompletion());
    expect(result.current.state).toEqual(refreshed);
    expect(result.current.newlyUnlockedCosmetics).toEqual([]);
    expect(result.current.failureMessage).toBe("Rewards could not be loaded. Try again.");
  });

  it("does not publish a late unlock notice after a replay starts", async () => {
    const initial = createState();
    let resolveRefresh: ((response: Response) => void) | undefined;
    const refreshResponse = new Promise<Response>((resolve) => { resolveRefresh = resolve; });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(initial))
      .mockReturnValueOnce(refreshResponse);
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useStudentRpg({ endpoint: "/api/rpg", ownerKey: "student-1" }));
    await waitFor(() => expect(result.current.state).toEqual(initial));
    act(() => result.current.beginSession());
    let refreshPromise: Promise<void> | undefined;
    act(() => { refreshPromise = result.current.refreshAfterSavedCompletion(); });
    act(() => result.current.beginSession());

    await act(async () => {
      resolveRefresh?.(jsonResponse(createState(["apprentice-wand", "graveyard-staff"])));
      await refreshPromise;
    });

    expect(result.current.newlyUnlockedCosmetics).toEqual([]);
  });

  it("does not assign a prior pending refresh unlock to the next saved completion", async () => {
    const initial = createState();
    const unlocked = createState(["apprentice-wand", "graveyard-staff"]);
    let resolveFirstRefresh: ((response: Response) => void) | undefined;
    const firstRefresh = new Promise<Response>((resolve) => { resolveFirstRefresh = resolve; });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(initial))
      .mockReturnValueOnce(firstRefresh)
      .mockResolvedValueOnce(jsonResponse(unlocked));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useStudentRpg({ endpoint: "/api/rpg", ownerKey: "student-1" }));
    await waitFor(() => expect(result.current.state).toEqual(initial));
    act(() => result.current.beginSession());
    let firstRefreshPromise: Promise<void> | undefined;
    act(() => { firstRefreshPromise = result.current.refreshAfterSavedCompletion(); });

    act(() => result.current.beginSession());
    await act(async () => {
      resolveFirstRefresh?.(jsonResponse(unlocked));
      await firstRefreshPromise;
    });
    expect(result.current.newlyUnlockedCosmetics).toEqual([]);

    await act(async () => result.current.refreshAfterSavedCompletion());
    expect(result.current.state).toEqual(unlocked);
    expect(result.current.newlyUnlockedCosmetics).toEqual([]);
  });

  it("does not fetch when RPG state is disabled", async () => {
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useStudentRpg({ endpoint: "/api/rpg", ownerKey: "student-1", enabled: false }));

    await act(async () => {
      result.current.beginSession();
      await result.current.refreshAfterSavedCompletion();
      await result.current.equip("apprentice-wand");
      await result.current.retry();
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears ownership immediately and ignores stale responses after an owner change", async () => {
    let resolveFirst: ((response: Response) => void) | undefined;
    const firstResponse = new Promise<Response>((resolve) => { resolveFirst = resolve; });
    const second = createState(["graveyard-staff"]);
    fetchMock
      .mockReturnValueOnce(firstResponse)
      .mockResolvedValueOnce(jsonResponse(second));
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(
      ({ ownerKey }) => useStudentRpg({ endpoint: "/api/rpg", ownerKey }),
      { initialProps: { ownerKey: "student-1" } },
    );
    rerender({ ownerKey: "student-2" });
    expect(result.current.state).toBeNull();
    expect((fetchMock.mock.calls[0]?.[1]?.signal as AbortSignal).aborted).toBe(true);
    await waitFor(() => expect(result.current.state).toEqual(second));

    await act(async () => resolveFirst?.(jsonResponse(createState(["echo-staff"]))));
    expect(result.current.state).toEqual(second);
  });
});
