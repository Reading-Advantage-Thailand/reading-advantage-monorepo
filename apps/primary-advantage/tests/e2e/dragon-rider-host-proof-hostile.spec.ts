import { expect, test, type Page } from "@playwright/test";

interface IssuedDragonRiderAttempt {
  readonly attemptId: string;
  readonly credential: string;
  readonly seed: string;
}

interface JsonResponse {
  readonly status: number;
  readonly body: unknown;
}

/** Posts JSON from the authenticated browser context and returns its parsed response. */
async function postJson(page: Page, path: string, body: unknown): Promise<JsonResponse> {
  return page.evaluate(async ({ requestBody, requestPath }) => {
    const response = await fetch(requestPath, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(requestBody),
    });
    return { status: response.status, body: await response.json() };
  }, { requestPath: path, requestBody: body });
}

/** Issues a real signed Dragon Rider attempt through the title-local browser route. */
async function issueAttempt(page: Page): Promise<IssuedDragonRiderAttempt> {
  const issued = await postJson(page, "/api/host-proof/dragon-rider/attempts", {
    gameType: "dragon-rider",
    difficulty: "easy",
  });
  expect(issued.status).toBe(201);
  return issued.body as IssuedDragonRiderAttempt;
}

/** Derives the server-replayed gate choice for a zero-based frozen round. */
function gateForRound(seed: string, roundIndex: number): "left" | "right" {
  const offset = [...seed].reduce((total, character) => total + character.charCodeAt(0), 0) % 2;
  return (offset + roundIndex) % 2 === 0 ? "left" : "right";
}

/** Proves title-local routes reject client timing and completion before the server terminal time. */
test("Dragon Rider host proof rejects client timing and pre-terminal completion", async ({ page }) => {
  await page.goto("/en/student/host-proof/dragon-rider");
  await expect(page.getByRole("heading", { name: "Dragon Rider host proof" })).toBeVisible();

  const attempt = await issueAttempt(page);

  const clientTimedAction = await postJson(page, "/api/host-proof/dragon-rider/attempts/actions", {
    attemptId: attempt.attemptId,
    credential: attempt.credential,
    action: { sequence: 1, kind: "choose-gate", round: 1, gate: "left", elapsedMs: 0 },
  });
  expect(clientTimedAction).toEqual({
    status: 400,
    body: {
      error: {
        code: "DRAGON_RIDER_VALIDATION_FAILED",
        message: "Request includes invalid or server-owned fields",
      },
    },
  });

  const validAction = await postJson(page, "/api/host-proof/dragon-rider/attempts/actions", {
    attemptId: attempt.attemptId,
    credential: attempt.credential,
    action: { sequence: 1, kind: "choose-gate", round: 1, gate: gateForRound(attempt.seed, 0) },
  });
  expect(validAction.status).toBe(200);

  const preTerminalCompletion = await postJson(page, "/api/host-proof/dragon-rider/completions", {
    attemptId: attempt.attemptId,
    credential: attempt.credential,
  });
  expect(preTerminalCompletion).toEqual({
    status: 400,
    body: {
      error: {
        code: "DRAGON_RIDER_ATTEMPT_REJECTED",
        message: "Signed attempt evidence was rejected",
      },
    },
  });
});
