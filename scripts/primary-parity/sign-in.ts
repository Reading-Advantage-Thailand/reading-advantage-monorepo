/**
 * Sign-in helpers of the capture script. They take a Playwright browser context and the matched account
 * of a role (see `accounts-file.ts`). No helper prints a password.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import type { BrowserContext, Page, Response } from "playwright";
import type { AccountsFileData } from "./accounts-file.js";

type Entry = AccountsFileData["accounts"][keyof AccountsFileData["accounts"]] & object;

/**
 * Opens a URL with up to 3 tries on a local network error or time-out, then waits up to 30 s for idle.
 * @param page The page.
 * @param url The URL.
 * @returns The response of the last navigation, or null.
 */
export async function gotoRetry(page: Page, url: string): Promise<Response | null> {
  for (let i = 1; ; i++) {
    try {
      const response = await page.goto(url, { waitUntil: "load", timeout: 90000 });
      await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
      return response;
    } catch (e) {
      if (i >= 3 || !/net::ERR_|Timeout/.test(String(e))) throw e;
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

const leftSignIn = (page: Page) => page.waitForURL((u) => !u.pathname.endsWith("/auth/signin"), { timeout: 60000 });

/**
 * Signs a staff user in to the legacy app (Teacher tab, email and password).
 * @param ctx The browser context that keeps the session.
 * @param base The legacy base URL.
 * @param entry The matched account of the role.
 */
export async function signInLegacyStaff(ctx: BrowserContext, base: string, entry: Entry): Promise<void> {
  if (entry.legacy.kind !== "password") throw new Error("legacy staff sign-in needs a password entry");
  const page = await ctx.newPage();
  await gotoRetry(page, `${base}/en/auth/signin`);
  await page.getByRole("tab", { name: /teacher/i }).click();
  await page.locator('input[name="email"]').fill(entry.legacy.email);
  await page.locator('input[name="password"]').fill(entry.legacy.password);
  await page.locator('form button[type="submit"]').click();
  await leftSignIn(page);
  await page.close();
}

/**
 * Signs a student in to the legacy app (class code, then the name).
 * @param ctx The browser context that keeps the session.
 * @param base The legacy base URL.
 * @param entry The matched account of the STUDENT role.
 */
export async function signInLegacyStudent(ctx: BrowserContext, base: string, entry: Entry): Promise<void> {
  if (entry.legacy.kind !== "classCode") throw new Error("legacy student sign-in needs a class code entry");
  const page = await ctx.newPage();
  await gotoRetry(page, `${base}/en/auth/signin`);
  await page.getByLabel("Classroom Code").fill(entry.legacy.classCode);
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: entry.legacy.studentName, exact: true }).click();
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL((u) => u.pathname.includes("/student"), { timeout: 60000 });
  await page.close();
}

/**
 * Reads the temporary password of a user from the hand-out CSV (`school,name,role,username,temporary password`).
 * @param csvPath The hand-out file written by `issue-temporary-passwords.ts`.
 * @param username The username.
 * @returns The temporary password.
 * @throws When the file has no row for the username (the message holds no password).
 */
export function temporaryPasswordOf(csvPath: string, username: string): string {
  const row = readFileSync(csvPath, "utf8").trim().split("\n").slice(1).map((l) => l.split(",")).find((r) => r[3] === username);
  if (!row) throw new Error("no hand-out row for the username");
  return row[4];
}

async function submitStaffLogin(ctx: BrowserContext, base: string, username: string, password: string) {
  const page = await ctx.newPage();
  await gotoRetry(page, `${base}/en/auth/signin`);
  await page.getByRole("tab", { name: "Teacher" }).click();
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  const response = page.waitForResponse((r) => r.url().endsWith("/api/auth/login"), { timeout: 60000 });
  await page.locator('form button[type="submit"]').click();
  return { page, status: (await response).status() };
}

/**
 * Signs a staff user in to the new app. A kept password signs in directly. Without one, the temporary password
 * triggers the forced change once, and the function returns the new password for the caller to keep.
 * @param ctx The browser context that keeps the session.
 * @param base The new app base URL.
 * @param entry The matched account of the role.
 * @param temporary The temporary password from the hand-out file, used only when the entry has no kept password.
 * @returns The new password after a forced change, or undefined when a kept password signed in.
 * @throws When the sign-in or the change fails (the message holds no password).
 */
export async function signInNewStaff(
  ctx: BrowserContext,
  base: string,
  entry: Entry,
  temporary?: () => string,
): Promise<string | undefined> {
  if (entry.new.password) {
    const { page, status } = await submitStaffLogin(ctx, base, entry.new.username, entry.new.password);
    if (status !== 200) throw new Error(`new app staff sign-in failed with status ${status}`);
    await leftSignIn(page);
    await page.close();
    return undefined;
  }
  if (!temporary) throw new Error("the entry has no password and no hand-out file was given");
  const { page, status } = await submitStaffLogin(ctx, base, entry.new.username, temporary());
  if (status !== 403) throw new Error(`temporary password sign-in gave status ${status}, expected 403`);
  const fresh = `Kit1-${randomBytes(6).toString("hex")}!`;
  await page.locator("#new-password").waitFor({ timeout: 30000 });
  await page.locator("#new-password").fill(fresh);
  await page.locator("#confirm-password").fill(fresh);
  const change = page.waitForResponse((r) => r.url().endsWith("/api/auth/temporary-password"), { timeout: 60000 });
  await page.getByRole("button", { name: "Save and sign in" }).click();
  const changeStatus = (await change).status();
  if (changeStatus !== 200) throw new Error(`forced password change gave status ${changeStatus}`);
  await leftSignIn(page);
  await page.close();
  return fresh;
}

/**
 * Makes the class sheet as the signed-in teacher and returns the password of one student.
 * The function sets new class passwords, so it runs once for each run.
 * @param teacherCtx A browser context signed in as the matched teacher of the new app.
 * @param base The new app base URL.
 * @param classroomId The new classroom id of the student.
 * @param username The matched student username.
 * @returns The password on the row of the username.
 * @throws When the sheet has no row for the username.
 */
export async function readClassSheetPassword(
  teacherCtx: BrowserContext,
  base: string,
  classroomId: string,
  username: string,
): Promise<string> {
  const page = await teacherCtx.newPage();
  await gotoRetry(page, `${base}/en/teacher/class-roster/${classroomId}/class-sheet`);
  await page.getByRole("button", { name: "Make class sheet" }).click();
  await page.getByRole("button", { name: "Set new passwords" }).click();
  const rows = page.locator("[data-print-area] tbody tr");
  await rows.first().waitFor({ timeout: 60000 });
  for (const row of await rows.all()) {
    const [, user, password] = (await row.locator("td").allInnerTexts()).map((x) => x.trim());
    if (user === username) {
      await page.close();
      return password;
    }
  }
  throw new Error("the class sheet has no row for the matched username");
}

/**
 * Signs a student in to the new app with the username and password of the class sheet.
 * @param ctx The browser context that keeps the session.
 * @param base The new app base URL.
 * @param username The student username.
 * @param password The student password.
 * @throws When the login does not return status 200.
 */
export async function signInNewStudent(ctx: BrowserContext, base: string, username: string, password: string): Promise<void> {
  const page = await ctx.newPage();
  await gotoRetry(page, `${base}/en/auth/signin`);
  await page.getByRole("button", { name: "Sign in with username and password" }).click();
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  const login = page.waitForResponse((x) => x.url().endsWith("/api/auth/login"), { timeout: 60000 });
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const status = (await login).status();
  if (status !== 200) throw new Error(`new app student sign-in failed with status ${status}`);
  await page.waitForURL((u) => u.pathname.includes("/student"), { timeout: 60000 });
  await page.close();
}
