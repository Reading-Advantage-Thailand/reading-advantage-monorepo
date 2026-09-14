"use client";

import * as React from "react";
import { ChevronsUpDownIcon } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useFormatDate } from "@/lib/utils";

/**
 * History table variant.
 */
export type HistoryTableVariant = "history" | "reminder";

interface HistoryRecord {
  id: string;
  title: string;
  scores: string;
  updated_at: string;
  rated: number;
  status: string;
}

/**
 * Renders the student article history or the reminder reread list.
 * @param variant Which list to show and which controls to enable.
 * @returns The history table.
 */
export function HistoryTable({ variant }: { variant: HistoryTableVariant }) {
  const isHistory = variant === "history";
  const t = useTranslations("Student.history");
  const formatDate = useFormatDate();
  const tStatus = useTranslations("Overall.status");
  const tComponents = useTranslations("Components");
  const [data, setData] = React.useState<HistoryRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const user = useCurrentUser();

  // Fetch data function
  const fetchData = React.useCallback(
    async (page = 1, search = "") => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        if (isHistory) {
          const searchParams = new URLSearchParams({
            page: page.toString(),
            limit: pagination.limit.toString(),
            ...(search && { search }),
          });

          const response = await fetch(
            `/api/users/${user.id}/article-records?${searchParams}`,
          );
          if (response.ok) {
            const result = await response.json();
            setData(result.data || []);
            setPagination(result.pagination || pagination);
          }
        } else {
          const response = await fetch(
            `/api/users/${user.id}/reminder-reread`,
          );
          if (response.ok) {
            const result = await response.json();
            setData(result.data || []);
          }
        }
      } catch (error) {
        console.error(
          isHistory
            ? "Error fetching article records:"
            : "Error fetching reminder reread data:",
          error,
        );
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, pagination.limit, isHistory],
  );

  // Fetch data on component mount and user change
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle search with debouncing (skips the first run: mount already fetches)
  const [searchValue, setSearchValue] = React.useState("");
  const isFirstSearchEffect = React.useRef(true);

  React.useEffect(() => {
    if (!isHistory) return;
    if (isFirstSearchEffect.current) {
      isFirstSearchEffect.current = false;
      return;
    }
    const handler = setTimeout(() => {
      fetchData(1, searchValue);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchValue, fetchData, isHistory]);

  const columns: ColumnDef<HistoryRecord>[] = [
    {
      accessorKey: "title",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("title")}
            <ChevronsUpDownIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="capitalize">{row.getValue("title")}</div>
      ),
    },
    {
      accessorKey: "scores",
      header: () => {
        return <div>{t("score")}</div>;
      },
      cell: ({ row }) => {
        return <div>{row.getValue("scores")}</div>;
      },
    },
    {
      accessorKey: "updated_at",
      header: () => {
        return <div>{t("date")}</div>;
      },
      cell: ({ row }) => {
        const updatedAt = row.getValue("updated_at") as string;
        const date = formatDate(new Date(updatedAt));
        return <div>{date}</div>;
      },
    },
    {
      accessorKey: "rated",
      header: () => <div className="text-center">{t("rated")}</div>,
      cell: ({ row }) => {
        const amount = parseInt(row.getValue("rated"));
        return <div className="text-center font-medium">{amount}</div>;
      },
    },
    {
      accessorKey: "status",
      header: () => <div className="text-center">{t("status")}</div>,
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const map = {
          READ: tStatus("READ"),
          COMPLETED_MCQ: tStatus("COMPLETED_MCQ"),
          COMPLETED_SAQ: tStatus("COMPLETED_SAQ"),
          COMPLETED_LAQ: tStatus("COMPLETED_LAQ"),
          UNRATED: tStatus("UNRATED"),
        };
        return (
          <div className="text-center font-medium">
            {map[status as keyof typeof map]}
          </div>
        );
      },
    },
  ];

  const router = useRouter();
  const handleNavigateToArticle = (articleId: string) => {
    router.push(`/student/read/${articleId}`);
  };
  return (
    <DataTable
      columns={columns}
      data={data}
      loading={loading}
      loadingText={t("loading")}
      emptyText={isHistory ? t("noArticles") : t("noArticlesToRead")}
      onRowClick={(row) => handleNavigateToArticle(row.id)}
      wrapperClassName={
        isHistory
          ? "rounded-md border"
          : "mt-3 mb-4 rounded-md border bg-[#ffedd5] dark:bg-[#7c2d12]"
      }
      toolbar={
        isHistory ? (
          <div className="flex items-center py-4">
            <Input
              placeholder={t("searchPlaceholder")}
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              className="max-w-sm"
            />
          </div>
        ) : undefined
      }
      footer={
        isHistory ? (
          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchData(pagination.page - 1, searchValue)}
                disabled={pagination.page <= 1 || loading}
              >
                {tComponents("previousButton")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchData(pagination.page + 1, searchValue)}
                disabled={pagination.page >= pagination.totalPages || loading}
              >
                {tComponents("nextButton")}
              </Button>
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
