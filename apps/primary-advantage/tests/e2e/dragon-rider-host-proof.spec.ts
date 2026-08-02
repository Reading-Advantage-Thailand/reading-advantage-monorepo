import { expect, test, type Page } from "@playwright/test";

interface IssuedDragonRiderAttempt {
  readonly input: readonly { readonly term: string; readonly translation: string }[];
  readonly seed: string;
}

interface DragonRiderCompletion {
  readonly xpEarned: number;
  readonly score: number;
  readonly correctAnswers: number;
  readonly totalAttempts: number;
  readonly duration: number;
  readonly victory: boolean;
  readonly duplicate: boolean;
}

/** Derives the server-replayed gate choice for a zero-based frozen round. */
function gateForRound(seed: string, roundIndex: number): "left" | "right" {
  const offset = [...seed].reduce((total, character) => total + character.charCodeAt(0), 0) % 2;
  return (offset + roundIndex) % 2 === 0 ? "left" : "right";
}

/** Waits for a successful title-local Dragon Rider action receipt. */
async function chooseGate(page: Page, gate: "left" | "right"): Promise<void> {
  const receipt = page.waitForResponse((response) =>
    response.url().endsWith("/api/host-proof/dragon-rider/attempts/actions")
    && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: `${gate === "left" ? "Left" : "Right"} gate` }).click();
  expect((await receipt).status()).toBe(200);
}

/** Exercises a complete direct hidden Dragon Rider attempt with only server-observed timing. */
test("Dragon Rider hidden host proof completes and returns its canonical retry result", async ({ page }) => {
  test.setTimeout(210_000);

  await page.goto("/en/student/host-proof/dragon-rider");
  await expect(page.getByRole("heading", { name: "Dragon Rider host proof" })).toBeVisible();

  const issued = page.waitForResponse((response) =>
    response.url().endsWith("/api/host-proof/dragon-rider/attempts")
    && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Issue attempt" }).click();
  const issuedResponse = await issued;
  expect(issuedResponse.status()).toBe(201);
  const issuedAttempt = await issuedResponse.json() as IssuedDragonRiderAttempt;
  const issuedAt = Date.now();

  expect(issuedAttempt.input).toHaveLength(4);
  for (const [roundIndex, prompt] of issuedAttempt.input.entries()) {
    await expect(page.getByText(prompt.term)).toBeVisible();
    await page.waitForTimeout(75);
    await chooseGate(page, gateForRound(issuedAttempt.seed, roundIndex));
  }

  await page.waitForTimeout(Math.max(0, 150_100 - (Date.now() - issuedAt)));

  const completion = page.waitForResponse((response) =>
    response.url().endsWith("/api/host-proof/dragon-rider/completions")
    && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Complete stored attempt" }).click();
  const first = await (await completion).json() as DragonRiderCompletion;

  expect(first).toEqual({
    score: 400,
    xpEarned: 7,
    correctAnswers: 4,
    totalAttempts: 4,
    duration: 150_000,
    victory: true,
    duplicate: false,
  });
  await expect(page.getByText("Canonical result: 400 score, 7 XP.")).toBeVisible();

  const retry = page.waitForResponse((response) =>
    response.url().endsWith("/api/host-proof/dragon-rider/completions")
    && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Complete stored attempt" }).click();
  const second = await (await retry).json() as DragonRiderCompletion;
  expect(second).toEqual({ ...first, duplicate: true });
  await expect(page.getByText("Canonical result: 400 score, 7 XP (retry).")).toBeVisible();
  await expect(page.getByRole("link", { name: "Return home" })).toHaveAttribute("href", "/");
});
