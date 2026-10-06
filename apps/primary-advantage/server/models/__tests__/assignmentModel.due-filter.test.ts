// @vitest-environment node
/**
 * Phase 2 review (item 2): the student "Late / Due today / Coming up" filter compared instants
 * (`dueDate < now`) and server dates (`toDateString()` in UTC), so an assignment due today was
 * "Late" from midnight. The filter uses the same calendar-day rule as the due chips (Bangkok).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ select: vi.fn() }));

vi.mock("@/lib/session", () => ({ currentUser: vi.fn(), getCurrentUser: vi.fn() }));
vi.mock("@reading-advantage/db", async (importOriginal) => ({
  // The real tables stay: the domain and auth modules register them when they load.
  ...(await importOriginal<typeof import("@reading-advantage/db")>()),
  db: { select: mocks.select },
  classrooms: {},
  articles: {},
  assignments: { id: "assignments.id" },
  studentAssignments: { studentId: "sa.studentId", status: "sa.status", createdAt: "sa.createdAt" },
  lessonProgress: {},
  articleActivityLogs: {},
  eq: vi.fn(() => ({})),
  and: vi.fn(() => ({})),
  desc: vi.fn(() => ({})),
  count: vi.fn(() => ({})),
}));

import { getStudentAssignments } from "../assignmentModel";

/**
 * Builds a chainable Drizzle stub resolving to rows.
 * @param value The rows returned when awaited.
 * @returns A stub with the select chain methods.
 */
function chain<T>(value: T) {
  const stub: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ["from", "leftJoin", "where", "orderBy", "limit", "offset"]) {
    stub[method] = () => stub;
  }
  (stub as Record<string, unknown>).then = (resolve: (value: T) => unknown) => Promise.resolve(value).then(resolve);
  return stub;
}

/**
 * Builds one joined student-assignment row.
 * @param id The assignment id.
 * @param dueDate The due date, or null.
 * @returns The row as the model selects it.
 */
function row(id: string, dueDate: Date | null) {
  return {
    id: `sa-${id}`,
    assignmentId: id,
    studentId: "student-1",
    status: "NOT_STARTED",
    assignmentIdJoin: id,
    assignmentTitle: id,
    assignmentDescription: null,
    assignmentDueDate: dueDate,
  };
}

const bangkok = (local: string) => new Date(`${local}+07:00`);
const ROWS = [
  row("yesterday", bangkok("2026-10-06T23:59:00")),
  row("today-midnight", bangkok("2026-10-07T00:00:00")),
  row("today-late", bangkok("2026-10-07T23:59:00")),
  row("tomorrow", bangkok("2026-10-08T00:00:00")),
  row("none", null),
];

/**
 * Runs the student list with a due filter at 10:00 on 7 October in Bangkok.
 * @param dueDateFilter The filter value.
 * @returns The assignment ids in the result.
 */
async function filtered(dueDateFilter: string) {
  mocks.select.mockReturnValueOnce(chain([{ value: ROWS.length }])).mockReturnValueOnce(chain(ROWS));
  const result = await getStudentAssignments({ studentId: "student-1", page: 1, limit: 10, dueDateFilter });
  return result.assignments.map((assignment: { assignmentId: string }) => assignment.assignmentId);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(bangkok("2026-10-07T10:00:00"));
});

afterEach(() => vi.useRealTimers());

describe("student assignment due filter", () => {
  it("puts only assignments due before today under Late", async () => {
    expect(await filtered("overdue")).toEqual(["yesterday"]);
  });

  it("puts every assignment due today under Due today, from midnight to 23:59", async () => {
    expect(await filtered("today")).toEqual(["today-midnight", "today-late"]);
  });

  it("puts assignments due after today under Coming up", async () => {
    expect(await filtered("upcoming")).toEqual(["tomorrow"]);
  });
});
