/**
 * Visual baselines for the Primary UX rework (track_id: primary_ux_rework_20261003).
 *
 * Local QA only: needs a Primary dev server (PLAYWRIGHT_PORT) on the local QA database and
 * VISUAL_QA_PASS, the password of the QA accounts. Signs in through `/api/auth/login`, opens
 * each key screen at 375, 768, and 1280 px, and compares a full-page screenshot with the
 * recorded baseline. Record new baselines with `playwright test --project=visual --update-snapshots`.
 */
import { test, expect, type BrowserContext } from "@playwright/test";

const PASS = process.env.VISUAL_QA_PASS;
const CLASS = process.env.VISUAL_CLASS_ID ?? "828838c2-322e-435a-84b5-539dab1594e8";
const CLASS_BOOK = process.env.VISUAL_CLASS_BOOK_ID ?? "9a6c6b18-fc6f-4644-85e6-73fcecea9062";
const ARTICLE = process.env.VISUAL_ARTICLE_ID ?? "577addb8-4fb2-4b60-adeb-d52236d2c4c2";

const WIDTHS = [
  { name: "375", width: 375, height: 812 },
  { name: "768", width: 768, height: 1024 },
  { name: "1280", width: 1280, height: 900 },
] as const;

/** The key screens of the rework, by the account that sees them. */
const SCREENS: ReadonlyArray<{ role: "public" | "student" | "teacher"; name: string; path: string }> = [
  { role: "public", name: "signin", path: "/auth/signin" },
  { role: "student", name: "student-home", path: "/student/home" },
  { role: "student", name: "student-read", path: "/student/read" },
  { role: "student", name: "student-lesson", path: `/student/lesson/${ARTICLE}` },
  { role: "student", name: "student-assignments", path: "/student/assignments" },
  { role: "student", name: "student-vocabulary", path: "/student/vocabulary" },
  { role: "student", name: "student-games", path: "/student/games" },
  { role: "student", name: "student-reports", path: "/student/reports" },
  { role: "teacher", name: "teacher-my-classes", path: "/teacher/my-classes" },
  { role: "teacher", name: "teacher-class", path: `/teacher/class-roster/${CLASS}` },
  { role: "teacher", name: "teacher-class-book", path: `/teacher/class-roster/${CLASS}/books/${CLASS_BOOK}` },
  { role: "teacher", name: "teacher-class-book-progress", path: `/teacher/class-roster/${CLASS}/books/${CLASS_BOOK}/progress` },
  { role: "teacher", name: "teacher-lesson-guide", path: `/teacher/class-roster/${CLASS}/books/${CLASS_BOOK}/lessons/1` },
  { role: "teacher", name: "teacher-assignments", path: "/teacher/assignments" },
  { role: "teacher", name: "teacher-reports", path: "/teacher/reports" },
];

const USERS = { student: "qa-student-a1", teacher: "qa-teacher-a" } as const;

/** Signs the context in as a QA account through the login API; the cookie lands in the context. */
async function signIn(context: BrowserContext, role: "student" | "teacher") {
  const response = await context.request.post("/api/auth/login", { data: { username: USERS[role], password: PASS } });
  expect(response.status(), `sign in as ${role}`).toBe(200);
}

test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);

for (const screen of SCREENS) {
  for (const size of WIDTHS) {
    test(`${screen.name} at ${size.name}`, async ({ browser }) => {
      test.skip(!PASS, "VISUAL_QA_PASS not set");
      const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, locale: "en-US", reducedMotion: "reduce" });
      if (screen.role !== "public") await signIn(context, screen.role);
      const page = await context.newPage();
      await page.goto(`/en${screen.path}`, { waitUntil: "load" });
      await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
      await expect(page).toHaveScreenshot(`${screen.name}-${size.name}.png`, {
        fullPage: true,
        animations: "disabled",
        caret: "hide",
        maxDiffPixelRatio: 0.02,
        // Dates, streaks, and the class code change between runs.
        mask: [page.locator("time"), page.locator("[data-visual-mask]")],
      });
      await context.close();
    });
  }
}
