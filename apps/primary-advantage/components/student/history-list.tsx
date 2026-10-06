"use client";

import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { BookOpenIcon, HistoryIcon, RotateCcwIcon, SearchIcon } from "lucide-react";
import { EmptyState, ErrorState, ShimmerSkeleton, StatusChip, cardHoverClassName } from "@reading-advantage/ui";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

/** Which list to show: the read-again reminders or every article record. */
export type HistoryListVariant = "history" | "reminder";

/** One article record from `/api/users/[id]/article-records` or `/reminder-reread`. */
interface HistoryRecord {
  id: string;
  title: string;
  /** "80%" after a multiple-choice quiz, "Completed" or "N/A" otherwise. */
  scores: string;
  updated_at: string;
  rated: number;
  status: string;
}

const ACTION = "min-h-12 rounded-xl px-5 text-base";

/**
 * The student reading history (FR-5) as story cards that open the story. The "history" variant
 * lists every article record with a title search and pages; the "reminder" variant lists the
 * stories to read again. States: shimmer rows while loading, an empty state (with "Show all" when
 * a search finds nothing), and an error with a retry.
 * @param props.variant Which list to show.
 * @returns The list with its controls and states.
 */
export function HistoryList({ variant }: { variant: HistoryListVariant }) {
  const isHistory = variant === "history";
  const t = useTranslations("StudentHistory");
  const te = useTranslations("Error");
  const user = useCurrentUser();

  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const debouncedSearch = useDebounce(search, 400);

  const query = new URLSearchParams({ page: String(page), limit: "10" });
  if (debouncedSearch.trim()) query.set("search", debouncedSearch.trim());
  const url = !user?.id
    ? null
    : isHistory
      ? `/api/users/${user.id}/article-records?${query.toString()}`
      : `/api/users/${user.id}/reminder-reread`;
  // Loading is derived from the request, so a new search never shows the old result for a render.
  const loading = url !== null && loadedUrl !== url;

  useEffect(() => {
    if (!url) return;
    let active = true;
    setFailed(false);
    setLoadedUrl(null);

    (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        if (!active) return;
        setRecords(result.data ?? []);
        setTotalPages(result.pagination?.totalPages ?? 0);
      } catch (error) {
        if (!active) return;
        console.error(isHistory ? "Error fetching article records:" : "Error fetching reminder reread data:", error);
        setFailed(true);
      } finally {
        if (active) setLoadedUrl(url);
      }
    })();
    return () => {
      active = false;
    };
  }, [url, isHistory, reloadKey]);

  const searching = debouncedSearch.trim() !== "";

  return (
    <div className="flex flex-col gap-4">
      {isHistory ? (
        <div className="flex flex-col gap-1">
          <div className="relative">
            <label htmlFor="history-search" className="sr-only">
              {t("search")}
            </label>
            <SearchIcon aria-hidden="true" className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2" />
            <Input
              id="history-search"
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
          <p aria-live="polite" className="text-muted-foreground min-h-5 text-sm">
            {search !== debouncedSearch ? t("searching") : null}
          </p>
        </div>
      ) : null}

      {failed ? (
        <ErrorState
          className="bg-card border"
          icon={<HistoryIcon />}
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
        <div role="status" aria-busy="true" aria-label={t("loading")} className="grid gap-3 md:grid-cols-2">
          {[0, 1].map((row) => (
            <ShimmerSkeleton key={row} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : records.length === 0 ? (
        !isHistory ? (
          <EmptyState className="bg-card border" icon={<RotateCcwIcon />} title={t("noReadAgain")} description={t("noReadAgainHint")} />
        ) : searching ? (
          <EmptyState
            className="bg-card border"
            icon={<SearchIcon />}
            title={t("noMatch")}
            description={t("noMatchHint")}
            action={
              <Button
                type="button"
                className={ACTION}
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
              >
                {t("showAll")}
              </Button>
            }
          />
        ) : (
          <EmptyState
            className="bg-card border"
            icon={<BookOpenIcon />}
            title={t("noRecords")}
            description={t("noRecordsHint")}
            action={
              <Link href="/student/read" className={cn(buttonVariants({ variant: "default" }), ACTION)}>
                <BookOpenIcon aria-hidden="true" />
                {t("findStory")}
              </Link>
            }
          />
        )
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {records.map((record) => (
            <li key={record.id}>
              <RecordCard record={record} reminder={!isHistory} />
            </li>
          ))}
        </ul>
      )}

      {isHistory && totalPages > 1 && !failed ? (
        <nav aria-label={t("pages")} className="flex flex-wrap items-center justify-center gap-3">
          <Button type="button" variant="outline" className={ACTION} disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>
            {t("previous")}
          </Button>
          <span className="text-muted-foreground text-sm">{t("page", { page, total: totalPages })}</span>
          <Button
            type="button"
            variant="outline"
            className={ACTION}
            disabled={page >= totalPages || loading}
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
 * One story record as a card link: the title, a progress chip, the quiz score when there is one,
 * and the date. A reminder card also says "Read again".
 * @param props.record The article record.
 * @param props.reminder True in the read-again list.
 * @returns The card link.
 */
function RecordCard({ record, reminder }: { record: HistoryRecord; reminder: boolean }) {
  const t = useTranslations("StudentHistory");
  const format = useFormatter();
  const statusKey = `status.${record.status}`;
  const status = t.has(statusKey) ? t(statusKey) : null;
  const tone = record.status.startsWith("COMPLETED") ? "success" : record.status === "READ" ? "info" : "neutral";
  const score = /^\d+%$/.test(record.scores) ? record.scores : null;
  const date = new Date(record.updated_at);

  return (
    <Link
      href={`/student/read/${record.id}`}
      className={cn(
        "bg-card text-card-foreground focus-visible:ring-ring/50 flex h-full min-h-12 flex-col gap-2 rounded-2xl border p-4 shadow-sm outline-none focus-visible:ring-[3px]",
        reminder && "border-l-4 border-l-amber-500",
        cardHoverClassName,
      )}
    >
      <span className="font-article text-lg leading-snug font-semibold">{record.title}</span>
      <span className="flex flex-wrap items-center gap-2 text-sm">
        {status ? <StatusChip tone={tone}>{status}</StatusChip> : null}
        {score ? <span className="font-semibold">{t("score", { score })}</span> : null}
        {Number.isNaN(date.getTime()) ? null : (
          <span className="text-muted-foreground">
            {t("readOn", { date: format.dateTime(date, { day: "numeric", month: "short", year: "numeric" }) })}
          </span>
        )}
      </span>
      {reminder ? (
        <span className="text-primary mt-1 flex items-center gap-1.5 text-sm font-semibold">
          <RotateCcwIcon aria-hidden="true" className="size-4" />
          {t("readAgainAction")}
        </span>
      ) : null}
    </Link>
  );
}
