"use client";

import { Link } from "@/locales/navigation";
import { useScopedI18n } from "@/locales/client";

interface BlogPaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl?: string;
}

/**
 * Renders translated navigation for a paginated blog list.
 * @param props The current page, total pages, and optional base path.
 * @param props.currentPage The active page number.
 * @param props.totalPages The total number of pages.
 * @param props.baseUrl The base path for pagination links.
 * @returns The pagination navigation or null when one page exists.
 */
export function BlogPagination({
  currentPage,
  totalPages,
  baseUrl = "/blog",
}: BlogPaginationProps) {
  const t = useScopedI18n("components.pagination");

  if (totalPages <= 1) {
    return null;
  }

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const half = Math.floor(maxVisible / 2);
      let start = Math.max(1, currentPage - half);
      const end = Math.min(totalPages, start + maxVisible - 1);

      if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
      }

      if (start > 1) {
        pages.push(1);
        if (start > 2) {
          pages.push("...");
        }
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages) {
        if (end < totalPages - 1) {
          pages.push("...");
        }
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-2 py-8"
      aria-label={t("page")}
    >
      {currentPage > 1 ? (
        <Link
          href={currentPage === 2 ? baseUrl : `${baseUrl}/page/${currentPage - 1}`}
          className="px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
          scroll={false}
        >
          {t("previous")}
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="px-4 py-2 rounded-md border opacity-50 cursor-not-allowed border-muted text-muted-foreground"
        >
          {t("previous")}
        </span>
      )}

      {pageNumbers.map((page, index) =>
        typeof page === "number" ? (
          <Link
            key={`page-${page}-${index}`}
            href={page === 1 ? baseUrl : `${baseUrl}/page/${page}`}
            className={`px-4 py-2 rounded-md border ${
              page === currentPage
                ? "bg-primary text-primary-foreground border-primary"
                : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
            }`}
            aria-current={page === currentPage ? "page" : undefined}
            scroll={false}
          >
            {page}
          </Link>
        ) : (
          <span
            key={`ellipsis-${index}`}
            className="px-2 py-2 text-muted-foreground"
          >
            {page}
          </span>
        ),
      )}

      {currentPage < totalPages ? (
        <Link
          href={`${baseUrl}/page/${currentPage + 1}`}
          className="px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
          scroll={false}
        >
          {t("next")}
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="px-4 py-2 rounded-md border opacity-50 cursor-not-allowed border-muted text-muted-foreground"
        >
          {t("next")}
        </span>
      )}
    </nav>
  );
}
