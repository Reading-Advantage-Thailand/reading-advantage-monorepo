"use client";

import { useEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { BookOpenIcon, CalendarIcon, ClipboardListIcon, RotateCcwIcon, SearchIcon } from "lucide-react";
import { EmptyState, ErrorState, StatusChip, cardHoverClassName } from "@reading-advantage/ui";
import { getDueDateStatus } from "@reading-advantage/domain/assignments/due-date";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import type { PaginationInfo } from "@/types";
import { AssignmentCardsSkeleton } from "./assignment-list-skeleton";

/** Progress of one student on one assignment (`student_assignments.status`, plain text). */
type AssignmentStatusValue = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

/** One student-assignment row with its nested assignment, as the API returns it (dates as ISO). */
export interface AssignmentStudent {
  id: string;
  studentId: string;
  status: AssignmentStatusValue | null;
  score: number | null;
  startedAt: string | null;
  assignmentId: string;
  createdAt: string;
  completedAt: string | null;
  assignment: {
    id: string;
    classroomId: string;
    articleId: string | null;
    lessonId: string | null;
    title: string;
    type: string;
    description: string | null;
    /** Null when the teacher set no due date. */
    dueDate: string | null;
    createdAt: string;
    teacherId: string;
    teacherName: string | null;
  };
}

/** Status filter values the assignments API reads (0 not started, 1 in progress, 2 completed). */
const STATUS_FILTERS = [
  { value: "all", label: "statusAll" },
  { value: "0", label: "statusNotStarted" },
  { value: "1", label: "statusInProgress" },
  { value: "2", label: "statusCompleted" },
] as const;

const EMPTY_PAGE: PaginationInfo = {
  currentPage: 1,
  totalPages: 1,
  totalCount: 0,
  hasNextPage: false,
  hasPrevPage: false,
  limit: 10,
};

const ACTION = "min-h-12 rounded-xl px-5 text-base";

/**
 * The student assignment list (FR-5): a card per assignment with its due date, progress, and a
 * link to the lesson. It shows the server-fetched first page and fetches again only for filters,
 * search, paging, and retry. States: shimmer cards while loading, an empty state (with "Show all"
 * when a filter matches nothing), and an error with a retry.
 * @param props.initialAssignments The first page from the server; without it the list fetches on mount.
 * @param props.initialPagination The paging of the first page.
 * @returns The list with its filters and states.
 */
export default function StudentAssignmentList({
  initialAssignments,
  initialPagination,
}: {
  initialAssignments?: AssignmentStudent[];
  initialPagination?: PaginationInfo;
}) {
  const t = useTranslations("StudentAssignments");
  const te = useTranslations("Error");
  const user = useCurrentUser();

  const [assignments, setAssignments] = useState<AssignmentStudent[]>(initialAssignments ?? []);
  const [pagination, setPagination] = useState<PaginationInfo>(initialPagination ?? EMPTY_PAGE);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [due, setDue] = useState("all");
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [failed, setFailed] = useState(false);
  const debouncedSearch = useDebounce(search, 500);

  const params = new URLSearchParams({ page: String(page), limit: "10" });
  if (status !== "all") params.set("status", status);
  if (due !== "all") params.set("dueDateFilter", due);
  if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
  const queryKey = params.toString();
  // The server page already fetched the first page (page 1, no filters).
  const [loadedKey, setLoadedKey] = useState<string | null>(initialAssignments !== undefined ? queryKey : null);
  const skipFirstFetch = useRef(initialAssignments !== undefined);
  // Loading is derived from the query, so a new filter never shows the old result for a render.
  const loading = Boolean(user?.id) && loadedKey !== queryKey;

  useEffect(() => {
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }
    if (!user?.id) return;
    let active = true;
    setFailed(false);
    setLoadedKey(null);

    (async () => {
      try {
        const response = await fetch(`/api/students/${user.id}/assignments?${queryKey}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!active) return;
        setAssignments(data.assignments ?? []);
        setPagination(data.pagination ?? EMPTY_PAGE);
      } catch (error) {
        if (!active) return;
        console.error("Error fetching assignments:", error);
        setFailed(true);
      } finally {
        if (active) setLoadedKey(queryKey);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id, queryKey, reloadKey]);

  const filtersActive = status !== "all" || due !== "all" || debouncedSearch.trim() !== "";

  /** Clears every filter and goes back to the first page. */
  const showAll = () => {
    setStatus("all");
    setDue("all");
    setSearch("");
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold md:text-3xl">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </header>

      <section aria-label={t("filters")} className="bg-card flex flex-col gap-4 rounded-2xl border p-4">
        <div className="relative">
          <label htmlFor="assignment-search" className="sr-only">
            {t("search")}
          </label>
          <SearchIcon aria-hidden="true" className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2" />
          <Input
            id="assignment-search"
            type="search"
            value={search}
            placeholder={t("searchPlaceholder")}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="h-12 rounded-xl pl-10 text-base"
          />
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <span id="assignment-status-label" className="text-sm font-semibold">
              {t("status")}
            </span>
            <div role="group" aria-labelledby="assignment-status-label" className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  variant={status === filter.value ? "default" : "outline"}
                  aria-pressed={status === filter.value}
                  className="min-h-12 rounded-full px-5 text-base"
                  onClick={() => {
                    setStatus(filter.value);
                    setPage(1);
                  }}
                >
                  {t(filter.label)}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="assignment-due" className="text-sm font-semibold">
              {t("due")}
            </label>
            <select
              id="assignment-due"
              value={due}
              onChange={(event) => {
                setDue(event.target.value);
                setPage(1);
              }}
              className="border-input bg-background focus-visible:ring-ring/50 h-12 min-w-44 rounded-xl border px-3 text-base outline-none focus-visible:ring-[3px]"
            >
              <option value="all">{t("dueAll")}</option>
              <option value="overdue">{t("dueOverdue")}</option>
              <option value="today">{t("dueToday")}</option>
              <option value="upcoming">{t("dueUpcoming")}</option>
            </select>
          </div>
        </div>
        <p aria-live="polite" className="text-muted-foreground min-h-5 text-sm">
          {search !== debouncedSearch ? t("searching") : null}
        </p>
      </section>

      {failed ? (
        <ErrorState
          className="bg-card border"
          icon={<ClipboardListIcon />}
          title={t("loadError")}
          description={t("loadErrorHint")}
          action={
            <Button type="button" className="min-h-12 px-6" onClick={() => setReloadKey((key) => key + 1)}>
              <RotateCcwIcon aria-hidden="true" />
              {te("retry")}
            </Button>
          }
        />
      ) : loading ? (
        <div aria-busy="true" aria-label={t("loading")}>
          <AssignmentCardsSkeleton />
        </div>
      ) : assignments.length === 0 ? (
        filtersActive ? (
          <EmptyState
            className="bg-card border"
            icon={<ClipboardListIcon />}
            title={t("noMatch")}
            description={t("noMatchHint")}
            action={
              <Button type="button" className={ACTION} onClick={showAll}>
                {t("showAll")}
              </Button>
            }
          />
        ) : (
          <EmptyState
            className="bg-card border"
            icon={<ClipboardListIcon />}
            title={t("empty")}
            description={t("emptyHint")}
            action={
              <Link href="/student/read" className={cn(buttonVariants({ variant: "default" }), ACTION)}>
                <BookOpenIcon aria-hidden="true" />
                {t("findStory")}
              </Link>
            }
          />
        )
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {assignments.map((row) => (
            <AssignmentCard key={row.id} row={row} />
          ))}
        </ul>
      )}

      {pagination.totalPages > 1 && !failed ? (
        <nav aria-label={t("pages")} className="flex flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            className={ACTION}
            disabled={!pagination.hasPrevPage || loading}
            onClick={() => setPage((current) => current - 1)}
          >
            {t("previous")}
          </Button>
          <span className="text-muted-foreground text-sm">
            {t("page", { page: pagination.currentPage, total: pagination.totalPages })}
          </span>
          <Button
            type="button"
            variant="outline"
            className={ACTION}
            disabled={!pagination.hasNextPage || loading}
            onClick={() => setPage((current) => current + 1)}
          >
            {t("next")}
          </Button>
        </nav>
      ) : null}
    </div>
  );
}

/**
 * One assignment card: progress and due chips, the title, the due date, the teacher, and the
 * lesson link (48 px). A finished assignment is never marked late.
 * @param props.row The student assignment.
 * @returns The list item.
 */
function AssignmentCard({ row }: { row: AssignmentStudent }) {
  const t = useTranslations("StudentAssignments");
  const format = useFormatter();
  const { assignment } = row;
  const done = row.status === "COMPLETED";
  const dueStatus = getDueDateStatus(assignment.dueDate);

  const progress =
    row.status === "COMPLETED"
      ? { tone: "success" as const, label: t("statusCompleted"), action: t("review") }
      : row.status === "IN_PROGRESS"
        ? { tone: "info" as const, label: t("statusInProgress"), action: t("continue") }
        : { tone: "neutral" as const, label: t("statusNotStarted"), action: t("start") };

  const dueChip = done
    ? null
    : dueStatus.kind === "overdue"
      ? { tone: "danger" as const, label: t("late") }
      : dueStatus.kind === "today"
        ? { tone: "warning" as const, label: t("dueToday") }
        : dueStatus.kind === "soon"
          ? { tone: "warning" as const, label: t("daysLeft", { days: dueStatus.days }) }
          : null;

  return (
    <li className="bg-card text-card-foreground flex flex-col gap-3 rounded-2xl border p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip tone={progress.tone}>{progress.label}</StatusChip>
        {dueChip ? <StatusChip tone={dueChip.tone}>{dueChip.label}</StatusChip> : null}
      </div>
      <h2 className="text-lg leading-snug font-semibold">{assignment.title}</h2>
      {assignment.description ? (
        <p className="text-muted-foreground line-clamp-2 text-sm">{assignment.description}</p>
      ) : null}
      <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
        <CalendarIcon aria-hidden="true" className="size-4 shrink-0" />
        {assignment.dueDate && dueStatus.kind !== "none"
          ? t("dueOn", { date: format.dateTime(new Date(assignment.dueDate), { day: "numeric", month: "short", year: "numeric" }) })
          : t("noDueDate")}
      </p>
      {assignment.teacherName ? (
        <p className="text-muted-foreground text-sm">{t("from", { teacher: assignment.teacherName })}</p>
      ) : null}
      <Link
        href={`/student/lesson/${assignment.id}`}
        className={cn(
          buttonVariants({ variant: done ? "outline" : "default" }),
          ACTION,
          "mt-auto self-start",
          cardHoverClassName,
        )}
      >
        {progress.action}
        <span className="sr-only">: {assignment.title}</span>
      </Link>
    </li>
  );
}
