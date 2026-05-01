"use client";

import { LocalizedLink } from "@/components/common/localized-link";
import { useScopedI18n } from "@/locales/client";

interface BlogPaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl?: string;
}

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
      className="flex items-center justify-center gap-2 py-8"
      aria-label="Pagination"
    >
      <LocalizedLink
        href={currentPage > 1 ? `${baseUrl}/page/${currentPage - 1}` : "#"}
        className={`px-4 py-2 rounded-md border ${
          currentPage === 1
            ? "opacity-50 cursor-not-allowed pointer-events-none border-muted text-muted-foreground"
            : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
        }`}
        aria-disabled={currentPage === 1}
        scroll={false}
      >
        {t("previous")}
      </LocalizedLink>

      {pageNumbers.map((page, index) =>
        typeof page === "number" ? (
          <LocalizedLink
            key={`page-${page}-${index}`}
            href={`${baseUrl}/page/${page}`}
            className={`px-4 py-2 rounded-md border ${
              page === currentPage
                ? "bg-primary text-primary-foreground border-primary"
                : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
            }`}
            scroll={false}
          >
            {page}
          </LocalizedLink>
        ) : (
          <span
            key={`ellipsis-${index}`}
            className="px-2 py-2 text-muted-foreground"
          >
            {page}
          </span>
        ),
      )}

      <LocalizedLink
        href={
          currentPage < totalPages ? `${baseUrl}/page/${currentPage + 1}` : "#"
        }
        className={`px-4 py-2 rounded-md border ${
          currentPage === totalPages
            ? "opacity-50 cursor-not-allowed pointer-events-none border-muted text-muted-foreground"
            : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
        }`}
        aria-disabled={currentPage === totalPages}
        scroll={false}
      >
        {t("next")}
      </LocalizedLink>
    </nav>
  );
}
