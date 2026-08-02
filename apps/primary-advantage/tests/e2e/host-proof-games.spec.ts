import { expect, test, type Page, type Request } from "@playwright/test";

const viewports = {
  compact: { width: 390, height: 844 },
  wide: { width: 1280, height: 800 },
} as const;

test.setTimeout(60_000);

/** Opens one authenticated bounded Dragon Flight host and waits for its signed attempt. */
async function openDragonFlight(page: Page): Promise<void> {
  const issuedAttempt = page.waitForResponse((response) =>
    response.url().endsWith("/api/host-proof/games/attempts") && response.request().method() === "POST",
  );
  await page.goto("/en/student/host-proof/games");
  expect((await issuedAttempt).status()).toBe(201);
  await expect(page.getByLabel("Dragon Flight host-proof surface")).toBeVisible();
  await expect(page.getByRole("region", { name: "Dragon Flight vocabulary game" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your recent verified flights" })).toBeVisible();
  await expect(page.locator("select")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Restart game" })).toHaveCount(0);
}

/** Identifies one action-attestation request by its title-owned action kind.
 * @param request Browser request sent by the bounded host client.
 * @param kind Expected Dragon Flight action kind.
 * @returns Whether the request is an action attestation for that kind.
 */
function isDragonFlightActionRequest(request: Request, kind: "choose-gate" | "launch"): boolean {
  if (request.method() !== "POST" || !request.url().endsWith("/api/host-proof/games/attempts/actions")) {
    return false;
  }
  try {
    const body = JSON.parse(request.postData() ?? "") as { action?: { kind?: unknown } };
    return body.action?.kind === kind;
  } catch {
    return false;
  }
}

/** Asserts a title action keeps its exact protocol shape while elapsed diagnostics remain runtime-derived.
 * @param action Untrusted action object captured from the browser request.
 * @param expected Server-required ordered action fields.
 * @returns Nothing after validating the title-owned action contract.
 */
function expectRuntimeAction(
  action: unknown,
  expected: { readonly sequence: number; readonly kind: "choose-gate" | "launch"; readonly gate?: "left" | "right" },
): void {
  expect(action).toEqual({ ...expected, elapsedMs: expect.any(Number) });
  const elapsedMs = (action as { readonly elapsedMs: number }).elapsedMs;
  expect(Number.isInteger(elapsedMs)).toBe(true);
  expect(elapsedMs).toBeGreaterThanOrEqual(0);
}

/** Sends one real title action sequence and proves the public checkpoint protocol.
 * @param page Authenticated browser page hosting the real Dragon Flight cartridge.
 * @param input Real input modality used to select the gate.
 * @returns Resolves after the ordered action receipts and server-derived completion are visible.
 */
async function completeDragonFlight(page: Page, input: "keyboard" | "pointer" | "touch"): Promise<void> {
  const game = page.getByRole("region", { name: "Dragon Flight vocabulary game" });
  const gateReceipt = page.waitForResponse((response) => isDragonFlightActionRequest(response.request(), "choose-gate"));
  const launchRequest = page.waitForRequest((request) => isDragonFlightActionRequest(request, "launch"));
  const launchReceipt = page.waitForResponse((response) => isDragonFlightActionRequest(response.request(), "launch"));
  const completion = page.waitForResponse((response) =>
    response.url().endsWith("/api/host-proof/games/completions") && response.request().method() === "POST",
  );

  if (input === "keyboard") {
    await game.press("ArrowRight");
  } else {
    const canvas = page.locator("[data-apk-canvas-host]");
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    const x = box!.x + box!.width * 0.75;
    const y = box!.y + box!.height * 0.6;
    if (input === "pointer") await page.mouse.click(x, y);
    else await page.touchscreen.tap(x, y);
  }
  await game.press("Enter");

  const gateResponse = await gateReceipt;
  expect(gateResponse.status()).toBe(200);
  const gatePayload = await gateResponse.json() as { readonly checkpoint?: unknown; readonly minimumNextActionDwellMs?: unknown };
  expect(typeof gatePayload.checkpoint).toBe("string");
  expect(gatePayload.minimumNextActionDwellMs).toBe(3000);
  if (typeof gatePayload.checkpoint !== "string" || typeof gatePayload.minimumNextActionDwellMs !== "number") {
    throw new Error("The gate attestation did not return a server-issued receipt and dwell");
  }
  const gateBody = JSON.parse(gateResponse.request().postData() ?? "") as { action?: unknown };
  expectRuntimeAction(gateBody.action, { sequence: 1, kind: "choose-gate", gate: "right" });
  const [launchRequestInfo, launchResponse] = await Promise.all([launchRequest, launchReceipt]);
  expect(launchResponse.status()).toBe(200);
  const launchPayload = await launchResponse.json() as { readonly checkpoint?: unknown };
  expect(typeof launchPayload.checkpoint).toBe("string");
  if (typeof launchPayload.checkpoint !== "string") {
    throw new Error("The launch attestation did not return a checkpoint");
  }
  const launchBody = JSON.parse(launchRequestInfo.postData() ?? "") as { action?: unknown; previousCheckpoint?: unknown };
  expectRuntimeAction(launchBody.action, { sequence: 2, kind: "launch" });
  expect(launchBody.previousCheckpoint).toBe(gatePayload.checkpoint);

  const completionResponse = await completion;
  expect(completionResponse.status()).toBe(200);
  const completionBody = JSON.parse(completionResponse.request().postData() ?? "") as { checkpoints?: unknown; score?: unknown; xpEarned?: unknown };
  expect(completionBody.checkpoints).toEqual([gatePayload.checkpoint, launchPayload.checkpoint]);
  expect(completionBody).not.toHaveProperty("score");
  expect(completionBody).not.toHaveProperty("xpEarned");
  await expect(page.getByRole("heading", { name: "Verified result" })).toBeVisible();
  await expect(page.getByLabel("Dragon Flight proof history")).not.toContainText("No verified Dragon Flight completions yet.");
  await expect(page.getByLabel("Dragon Flight vocabulary game").getByLabel("Game result")).toHaveCount(0);
}

for (const [profile, viewport] of Object.entries(viewports)) {
  test(`Dragon Flight completes a signed keyboard attempt in ${profile}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openDragonFlight(page);
    await completeDragonFlight(page, "keyboard");
  });
}

for (const input of ["pointer", "touch"] as const) {
  test(`Dragon Flight records a signed ${input} gate action`, async ({ page }) => {
    await page.setViewportSize(viewports.compact);
    await openDragonFlight(page);
    await completeDragonFlight(page, input);
  });
}
