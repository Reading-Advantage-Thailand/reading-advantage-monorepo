/**
 * Static source invariants for part A of the
 * `structural_ux_alignment_20260911` track — FR-1 through FR-5.
 *
 * These checks read repository source as text. They do not render components
 * or import app modules. The suite is expected to FAIL before the Phase 3
 * edits and PASS after.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const APP_ROOT = path.resolve(__dirname, "..");

/** Reads a path relative to the reading-advantage app root. */
function readSource(relativePath: string): string {
  const absolutePath = path.resolve(APP_ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Expected source file at ${absolutePath} but it is missing.`);
  }
  return fs.readFileSync(absolutePath, "utf8");
}

/** Returns true when a path exists relative to the app root. */
function exists(relativePath: string): boolean {
  return fs.existsSync(path.resolve(APP_ROOT, relativePath));
}

describe("FR-1 dashboard and goals data lives on the server", () => {
  test("useDashboardMetrice hook is deleted and unreferenced", () => {
    expect(exists("hooks/student/useDashboardMetrice.ts")).toBe(false);
    expect(exists("hooks/student/useDashboardMetrice.tsx")).toBe(false);

    const content = readSource("components/dashboard/student-dashboard-content.tsx");
    expect(content).not.toContain("useDashboardMetrice");
  });

  test("dashboard and reports pages share one view and use their own i18n scopes", () => {
    const view = readSource("components/dashboard/student-dashboard-view.tsx");
    expect(view).toContain("getStudentDashboardMetrics");
    expect(view).toContain("StudentDashboardContent");

    const dashboard = readSource("app/[locale]/(student)/student/dashboard/page.tsx");
    expect(dashboard).toContain('getScopedI18n("pages.student.dashboard")');
    expect(dashboard).not.toContain("pages.student.reportpage");

    const reports = readSource("app/[locale]/(student)/student/reports/page.tsx");
    expect(reports).toContain('getScopedI18n("pages.student.reportpage")');
    expect(reports).not.toContain('getScopedI18n("pages.student.dashboard")');
  });

  test("goals page fetches goals and summary on the server and passes props", () => {
    const page = readSource("app/[locale]/(student)/student/goals/page.tsx");
    expect(page).toContain("GoalsService");
    expect(page).toContain("initialGoals");
    expect(page).toContain("initialSummary");

    const content = readSource("components/goals/goals-page-content.tsx");
    expect(content).toContain("initialGoals");
    expect(content).toContain("initialSummary");
    // The initial mount must not fire the goals fetch again; only the
    // post-mutation refetch may call the API.
    expect(content).not.toMatch(/useEffect\(\(\)\s*=>\s*\{\s*fetchGoals/);
  });

  test("ActiveGoalsWidget receives goals as props and never fetches", () => {
    const widget = readSource("components/dashboard/active-goals-widget.tsx");
    expect(widget).toContain("goals");
    expect(widget).not.toContain('fetch("/api/v1/goals');
    expect(widget).not.toContain("useEffect");
  });

  test("goal deletion uses AlertDialog instead of native confirm()", () => {
    const card = readSource("components/goals/goal-card.tsx");
    expect(card).toContain("AlertDialog");
    expect(card).not.toContain("confirm(");
  });
});

describe("FR-2 no self-HTTP fetches from read and lesson server pages", () => {
  const pages = [
    "app/[locale]/(student)/student/read/[articleId]/page.tsx",
    "app/[locale]/(student)/student/lesson/[articleId]/page.tsx",
  ];

  test.each(pages)("%s does not call its own app over HTTP", (page) => {
    const source = readSource(page);
    expect(source).not.toContain("fetchData");
    expect(source).not.toContain("NEXT_PUBLIC_BASE_URL");
    expect(source).not.toMatch(/\bfetch\(\s*`?\s*(\$\{?env\.)?N?E?X?T?/);
    expect(source).not.toContain('fetch("http');
    expect(source).not.toContain("fetch(`http");
  });

  test("read and lesson pages load the article through the article service", () => {
    for (const page of [
      "app/[locale]/(student)/student/read/[articleId]/page.tsx",
      "app/[locale]/(student)/student/lesson/[articleId]/page.tsx",
    ]) {
      expect(readSource(page)).toContain("getArticleForReader");
    }
    expect(readSource("server/services/article-service.ts")).toContain("getArticleForReader");
  });
});

describe("FR-3 student-progress role and ownership check", () => {
  test("student-progress page verifies teacher access to the student", () => {
    const source = readSource(
      "app/[locale]/(teacher)/teacher/student-progress/[studentId]/page.tsx",
    );
    expect(source).toContain("classroomTeachers");
    expect(source).toContain("classroomStudents");
    expect(source).toContain('redirect("/teacher/dashboard")');
    // The ownership check must run before any student data fetch.
    expect(source.indexOf("eq(classroomTeachers.teacherId")).toBeLessThan(
      source.indexOf("getUserActivityData(studentId)"),
    );
  });
});

describe("FR-4 level-test placement authority lives on the server", () => {
  test("placement endpoint exists and is Zod-validated", () => {
    const route = readSource("app/api/v1/level-test/placement/route.ts");
    expect(route).toContain("handleLevelTestPlacement");

    const controller = readSource("server/controllers/level-test-controller.ts");
    expect(controller).toContain("handleLevelTestPlacement");
    expect(controller).toMatch(/z\.object\(\{[\s\S]*level: z\.string\(\)/);
  });

  test("cefrToSystemXp moved to lib/utils and removed from the client", () => {
    expect(readSource("lib/utils.ts")).toContain("export function cefrToSystemXp");
    const chat = readSource("components/level-test-chat.tsx");
    expect(chat).not.toContain("cefrToSystemXp");
    expect(chat).not.toContain("levelCalculation");
    expect(chat).toContain("/api/v1/level-test/placement");
  });
});

describe("FR-5 lesson page parallel lookups and error state", () => {
  test("lesson page runs article and classroom lookups in Promise.all", () => {
    const source = readSource(
      "app/[locale]/(student)/student/lesson/[articleId]/page.tsx",
    );
    expect(source).toContain("Promise.all");
    expect(source).toContain("getStudentClassroomId");
    expect(source).toContain("CustomError");
  });
});
