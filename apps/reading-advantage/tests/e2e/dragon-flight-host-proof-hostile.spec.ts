import { expect, test, type Page } from "@playwright/test";

interface IssuedAttempt {
  readonly attemptId: string;
  readonly credential: string;
}

interface HostProofHistoryResponse {
  readonly history: unknown;
}

/** Opens the real authenticated host and returns the exact attempt issued to its client. */
async function openDragonFlightHost(page: Page): Promise<IssuedAttempt> {
  const issuedAttempt = page.waitForResponse((response) => (
    response.url().endsWith("/api/host-proof/games/attempts")
    && response.request().method() === "POST"
  ));

  await page.goto("/en/student/host-proof/games");
  const response = await issuedAttempt;
  expect(response.status()).toBe(201);
  await expect(page.getByLabel("Dragon Flight host-proof surface")).toBeVisible();

  const payload: unknown = await response.json();
  expect(payload).toEqual(expect.objectContaining({
    attemptId: expect.any(String),
    credential: expect.any(String),
  }));
  const attempt = payload as IssuedAttempt;
  return { attemptId: attempt.attemptId, credential: attempt.credential };
}

/** Warms the real server routes with a disposable signed attempt without persisting a completion. */
async function warmHostProofRoutes(page: Page): Promise<void> {
  const result = await page.evaluate(async () => {
    const historyBeforeResponse = await fetch("/api/host-proof/games/completions?limit=10", {
      credentials: "same-origin",
    });
    const historyBefore = await historyBeforeResponse.json() as HostProofHistoryResponse;
    const issuedResponse = await fetch("/api/host-proof/games/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ gameType: "dragon-flight", difficulty: "medium" }),
    });
    const issued = await issuedResponse.json() as IssuedAttempt;
    const actionResponse = await fetch("/api/host-proof/games/attempts/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        attemptId: issued.attemptId,
        credential: issued.credential,
        action: { sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 0 },
      }),
    });
    const invalidCompletionResponse = await fetch("/api/host-proof/games/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({}),
    });
    const historyAfterResponse = await fetch("/api/host-proof/games/completions?limit=10", {
      credentials: "same-origin",
    });
    const historyAfter = await historyAfterResponse.json() as HostProofHistoryResponse;
    return {
      historyBefore,
      historyBeforeStatus: historyBeforeResponse.status,
      issuedStatus: issuedResponse.status,
      actionStatus: actionResponse.status,
      invalidCompletionStatus: invalidCompletionResponse.status,
      historyAfter,
      historyAfterStatus: historyAfterResponse.status,
    };
  });

  expect(result.historyBeforeStatus).toBe(200);
  expect(result.issuedStatus).toBe(201);
  expect(result.actionStatus).toBe(200);
  expect(result.invalidCompletionStatus).toBe(400);
  expect(result.historyAfterStatus).toBe(200);
  expect(result.historyAfter).toEqual(result.historyBefore);
}

test.describe("Dragon Flight hostile direct-JSON protocol", () => {
  test.setTimeout(60_000);

  test("rejects an immediate direct launch and cannot complete its transcript", async ({ page }) => {
    const attempt = await openDragonFlightHost(page);
    await warmHostProofRoutes(page);

    const result = await page.evaluate(async ({ attemptId, credential }) => {
      const historyBeforeResponse = await fetch("/api/host-proof/games/completions?limit=10", {
        credentials: "same-origin",
      });
      const historyBefore = await historyBeforeResponse.json() as HostProofHistoryResponse;

      const chooseGateAction = {
        sequence: 1,
        kind: "choose-gate",
        gate: "right",
        elapsedMs: 0,
      };
      const chooseGateResponse = await fetch("/api/host-proof/games/attempts/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ attemptId, credential, action: chooseGateAction }),
      });
      const chooseGatePayload: unknown = await chooseGateResponse.json();
      const checkpoint = (chooseGatePayload as { readonly checkpoint?: unknown }).checkpoint;
      const minimumNextActionDwellMs = (
        chooseGatePayload as { readonly minimumNextActionDwellMs?: unknown }
      ).minimumNextActionDwellMs;

      const launchAction = { sequence: 2, kind: "launch", elapsedMs: 0 };
      // Intentionally no dwell or timer: this is the hostile same-frame bypass attempt.
      const launchResponse = await fetch("/api/host-proof/games/attempts/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          attemptId,
          credential,
          action: launchAction,
          previousCheckpoint: checkpoint,
        }),
      });
      const launchPayload: unknown = await launchResponse.json();

      const completionResponse = await fetch("/api/host-proof/games/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          attemptId,
          credential,
          idempotencyKey: attemptId,
          actions: [chooseGateAction, launchAction],
          checkpoints: [checkpoint, checkpoint],
        }),
      });
      const completionPayload: unknown = await completionResponse.json();

      const historyAfterResponse = await fetch("/api/host-proof/games/completions?limit=10", {
        credentials: "same-origin",
      });
      const historyAfter = await historyAfterResponse.json() as HostProofHistoryResponse;

      return {
        historyBeforeStatus: historyBeforeResponse.status,
        historyBefore,
        chooseGateStatus: chooseGateResponse.status,
        checkpoint,
        minimumNextActionDwellMs,
        launchStatus: launchResponse.status,
        launchPayload,
        completionStatus: completionResponse.status,
        completionPayload,
        historyAfterStatus: historyAfterResponse.status,
        historyAfter,
      };
    }, attempt);

    expect(result.historyBeforeStatus).toBe(200);
    expect(result.chooseGateStatus).toBe(200);
    expect(result.checkpoint).toEqual(expect.any(String));
    expect(result.minimumNextActionDwellMs).toBe(3000);
    expect(result.launchStatus).toBe(400);
    expect(result.launchPayload).toEqual({
      error: {
        code: "HOST_PROOF_ATTEMPT_REJECTED",
        message: "Action observation was rejected",
      },
    });
    expect(result.completionStatus).toBe(400);
    expect(result.completionStatus).not.toBe(200);
    expect(result.historyAfterStatus).toBe(200);
    expect(result.historyAfter).toEqual(result.historyBefore);
  });
});
