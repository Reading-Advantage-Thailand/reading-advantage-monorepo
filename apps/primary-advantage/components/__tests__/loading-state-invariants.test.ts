import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const appRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

/**
 * Reads a source file relative to the app root.
 * @param rel Path relative to apps/primary-advantage.
 * @returns File contents.
 */
function read(rel: string): string {
  return readFileSync(join(appRoot, rel), "utf8");
}

describe("FR-3 StudentCartridgeHost launch phase", () => {
  it("reads no window.location.search during render", () => {
    expect(read("components/apk/StudentCartridgeHost.tsx")).not.toContain(
      "window.location.search",
    );
  });

  it("derives the launch phase from a mode prop", () => {
    expect(read("components/apk/StudentCartridgeHost.tsx")).toContain(
      'mode === "demo"',
    );
  });
});

describe("FR-8 change-role static colour classes", () => {
  it("builds no Tailwind class by interpolation", () => {
    expect(read("components/shared/change-role.tsx")).not.toContain(
      "dark:bg-${",
    );
  });

  it("uses a static colour lookup map", () => {
    expect(read("components/shared/change-role.tsx")).toContain(
      "ROLE_COLOR_CLASSES",
    );
  });
});

describe("FR-7 hardcoded Thai lookups", () => {
  it("looks up sentence translations by locale", () => {
    expect(read("components/articles/sentence.tsx")).not.toContain(
      "translation.th",
    );
  });

  it("looks up vocabulary definitions by locale", () => {
    expect(
      read("components/lesson/task/task-vocabulary-collection.tsx"),
    ).not.toContain("definition?.th");
  });

  it("looks up deep-reading translations by locale", () => {
    expect(
      read("components/lesson/task/task-reading.tsx"),
    ).not.toContain("translatedPassage?.th");
  });
});

describe("FR-12 full-reload navigation", () => {
  it("navigates student assignments with the router", () => {
    expect(
      read("components/student-assignment-table.tsx"),
    ).not.toContain("window.location.href");
  });

  it("refreshes the deck view with the router", () => {
    expect(read("components/flashcards/deck-view.tsx")).not.toContain(
      "window.location.reload()",
    );
  });

  it("retries the flashcard dashboard without a full reload", () => {
    expect(
      read("components/flashcards/flashcard-dashboard.tsx"),
    ).not.toContain("window.location.reload()");
  });
});

describe("FR-10 assignment dashboard response check", () => {
  it("checks response.ok before parsing the assignment", () => {
    expect(read("components/teacher/assignment-dashboard.tsx")).toMatch(
      /fetch\(`\/api\/assignments\?id=\$\{assignmentId\}`\)[\s\S]{0,200}response\.ok/,
    );
  });
});

describe("FR-9 teacher assignments table", () => {
  it("calls init() on mount", () => {
    expect(read("components/teacher/assignments.tsx")).toMatch(/\n\s*init\(\);/);
  });

  it("renders the table body from the row model", () => {
    expect(read("components/teacher/assignments.tsx")).toContain("<DataTable");
    expect(read("components/ui/data-table.tsx")).toContain(
      "table.getRowModel().rows.map",
    );
  });
});

describe("FR-5 admin student search debounce", () => {
  it("debounces the admin search query", () => {
    expect(
      read("app/[locale]/admin/students/page.tsx"),
    ).toContain("debouncedSearchQuery");
  });

  it("skips the duplicate mount fetch in the records table", () => {
    expect(read("components/dashboard/history-table.tsx")).toContain(
      "isFirstSearchEffect",
    );
  });

  it("shares one module-scope debounce hook", () => {
    expect(read("hooks/use-debounce.ts")).toContain(
      "export function useDebounce",
    );
  });
});

describe("FR-11 fabricated admin fallbacks", () => {
  it("renders an error state instead of fallback KPIs", () => {
    const source = read("components/admin/admin-stats-cards.tsx");
    expect(source).toContain("loadError");
    expect(source).not.toContain("totalTeachers: 25");
    expect(source).not.toContain("monthlyGrowth: 12.5");
  });

  it("renders an error state instead of mock activity", () => {
    const source = read("components/admin/admin-recent-activity.tsx");
    expect(source).toContain("loadError");
    expect(source).not.toContain("Sarah Johnson");
  });
});

describe("FR-4 article-select pagination", () => {
  it("keys grid cards by stable article id", () => {
    expect(read("components/articles/article-select.tsx")).toContain(
      "key={article.id}",
    );
  });

  it("advances an offset ref on every page", () => {
    expect(read("components/articles/article-select.tsx")).toContain(
      "offsetRef",
    );
  });

  it("guards against overlapping fetches", () => {
    expect(read("components/articles/article-select.tsx")).toContain(
      "inFlightRef",
    );
  });
});

describe("FR-6 hoisted components and hooks", () => {
  it("declares AssignmentDetailDialog at module scope", () => {
    const source = read("components/student-assignment-table.tsx");
    expect(source).toContain("\nfunction AssignmentDetailDialog(");
    expect(source).not.toMatch(/\n {2}const AssignmentDetailDialog =/);
  });

  it("hoists the assignment table debounce hook out of the body", () => {
    expect(read("components/student-assignment-table.tsx")).not.toMatch(
      /\n {2}const useDebounce =/,
    );
  });

  it("declares StudentRow at module scope", () => {
    const source = read("components/teacher/enhanced-class-roster.tsx");
    expect(source).toContain("\nfunction StudentRow(");
    expect(source).not.toMatch(/\n {2}const StudentRow =/);
  });

  it("declares LessonTimer at module scope in the merged progress bar", () => {
    for (const file of ["components/lesson/lesson-progress-bar.tsx"]) {
      const source = read(file);
      expect(source).toContain("\nfunction LessonTimer(");
      expect(source).not.toMatch(/\n {2}const LessonTimer =/);
    }
  });
});
