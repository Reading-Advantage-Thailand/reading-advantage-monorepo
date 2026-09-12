import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StudentChallengeRunLaunch } from "@reading-advantage/game-contracts";

import { useStudentChallengeRun } from "./use-student-challenge-run.js";

const challengeOne = "11111111-1111-4111-8111-111111111111";
const challengeTwo = "22222222-2222-4222-8222-222222222222";
const runOne = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const runTwo = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const classId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const fetchMock = vi.fn<typeof fetch>();

/** Creates one valid server-issued reading launch. */
function createLaunch(
  challengeId = challengeOne,
  runId = runOne,
  modality: "reading" | "read-to-select-audio" = "reading",
): StudentChallengeRunLaunch {
  return {
    runId,
    challengeId,
    userId: "student-1",
    challenge: {
      id: challengeId,
      classId,
      title: "River words",
      gameId: "wizard-vs-zombie",
      gameVersion: "2026-09-09.1",
      contentMode: "vocabulary",
      contentLocale: "th",
      contentItemCount: 1,
      seed: 42,
      difficulty: "medium",
      modality: modality === "reading" ? {
        modality: "reading",
        promptLocale: "th-TH",
        answerLocale: "en-US",
        promptField: "translation",
        answerField: "term",
        scored: true,
      } : {
        modality: "read-to-select-audio",
        promptLocale: "th-TH",
        answerLocale: "en-US",
        promptField: "translation",
        answerField: "term",
        scored: true,
      },
      startsAt: "2026-09-09T01:00:00.000Z",
      expiresAt: "2026-09-10T01:00:00.000Z",
      target: 10,
      contributionCount: 0,
    },
    content: { mode: "vocabulary", items: [{ term: "river", translation: "แม่น้ำ" }] },
    issuedAt: "2026-09-09T02:00:00.000Z",
    expiresAt: "2026-09-09T03:00:00.000Z",
  };
}

/** Creates a JSON response for a mocked route request. */
function jsonResponse(body: unknown, status = 201): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("useStudentChallengeRun", () => {
  it("starts and retains one validated reading challenge launch", async () => {
    const launch = createLaunch();
    fetchMock.mockResolvedValueOnce(jsonResponse(launch));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useStudentChallengeRun({
      endpoint: "/base/api/v1/apk/challenges/runs",
      ownerKey: "school-1:student-1",
      challengeId: challengeOne,
    }));

    await waitFor(() => expect(result.current.launch).toEqual(launch));
    expect(fetchMock).toHaveBeenCalledWith(
      "/base/api/v1/apk/challenges/runs",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({ challengeId: challengeOne }),
      }),
    );
    expect(result.current.launch?.challenge.seed).toBe(42);
    expect(result.current.launch?.challenge.difficulty).toBe("medium");
    expect(result.current.failureMessage).toBeNull();
  });

  it("clears the launch and ignores a stale response after the scope changes", async () => {
    let resolveFirst: ((response: Response) => void) | undefined;
    const firstResponse = new Promise<Response>((resolve) => { resolveFirst = resolve; });
    const secondLaunch = createLaunch(challengeTwo, runTwo);
    fetchMock.mockReturnValueOnce(firstResponse).mockResolvedValueOnce(jsonResponse(secondLaunch));
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(
      ({ ownerKey, challengeId }) => useStudentChallengeRun({ ownerKey, challengeId }),
      { initialProps: { ownerKey: "owner-1", challengeId: challengeOne } },
    );
    rerender({ ownerKey: "owner-2", challengeId: challengeTwo });

    expect(result.current.launch).toBeNull();
    expect((fetchMock.mock.calls[0]?.[1]?.signal as AbortSignal).aborted).toBe(true);
    await waitFor(() => expect(result.current.launch).toEqual(secondLaunch));
    await act(async () => resolveFirst?.(jsonResponse(createLaunch())));
    expect(result.current.launch).toEqual(secondLaunch);
  });

  it("rejects answer audio without a reading fallback", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(createLaunch(
      challengeOne,
      runOne,
      "read-to-select-audio",
    )));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useStudentChallengeRun({
      ownerKey: "owner-1",
      challengeId: challengeOne,
    }));

    await waitFor(() => expect(result.current.failureMessage).toBe(
      "This challenge needs prepared answer audio, which is unavailable.",
    ));
    expect(result.current.launch).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("clears an earlier launch before a failed retry", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(createLaunch()))
      .mockResolvedValueOnce(jsonResponse({ error: "unavailable" }, 503));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useStudentChallengeRun({
      ownerKey: "owner-1",
      challengeId: challengeOne,
    }));
    await waitFor(() => expect(result.current.launch).not.toBeNull());

    let retryPromise: Promise<void> | undefined;
    act(() => { retryPromise = result.current.retry(); });
    expect(result.current.launch).toBeNull();
    await act(async () => retryPromise);

    expect(result.current.failureMessage).toBe("The challenge could not start. Try again.");
    expect(result.current.launch).toBeNull();
  });

  it("does not request a run without an enabled owner and challenge", async () => {
    vi.stubGlobal("fetch", fetchMock);
    const { result, rerender } = renderHook(
      ({ ownerKey, challengeId, enabled }) => useStudentChallengeRun({ ownerKey, challengeId, enabled }),
      { initialProps: { ownerKey: "", challengeId: null as string | null, enabled: true } },
    );

    rerender({ ownerKey: "owner-1", challengeId: challengeOne, enabled: false });
    await act(async () => result.current.retry());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.launch).toBeNull();
  });
});
