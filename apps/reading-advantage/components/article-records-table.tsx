"use client";

import * as React from "react";
import { CaretSortIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArticleRecord } from "@/types";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { useScopedI18n } from "@/locales/client";
import { RecordStatus } from "@/types/constants";
import TeacherDataTable from "./teacher/teacher-data-table";

interface ArticleRecordsTableProps {
  className?: string;
  articles: ArticleRecord[];
  isLoading?: boolean;
  error?: string;
  variant?: "records" | "reminder";
}

const STATUS_MAP: Record<RecordStatus, string> = {
  [RecordStatus.COMPLETED]: "Complete",
  [RecordStatus.UNRATED]: "In Progress",
  [RecordStatus.UNCOMPLETED_MCQ]: "In Progress",
  [RecordStatus.UNCOMPLETED_SHORT_ANSWER]: "In Progress",
};

/**
 * Renders the article history table for the full records list and the
 * reminder-to-reread variant with one set of columns and status mapping.
 * @param props Articles plus loading, error, and variant options.
 * @returns The history table for the requested variant.
 */
export function ArticleRecordsTable({
  articles,
  isLoading = false,
  error,
  variant = "records",
}: ArticleRecordsTableProps) {
  const td = useScopedI18n("components.history.record");
  const tReminder = useScopedI18n("components.history.reminder");
  const t = useScopedI18n("components.articleRecordsTable");
  const router = useRouter();

  const isReminder = variant === "reminder";
  const navigateToArticle = (articleId: string) => {
    router.push(`/student/read/${articleId}`);
  };

  const columns: ColumnDef<ArticleRecord>[] = [
    {
      accessorKey: "title",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {isReminder ? tReminder("title") : td("title")}
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => <div>{row.getValue("title")}</div>,
    },
    {
      accessorKey: isReminder ? "created_at" : "updated_at",
      header: isReminder
        ? () => <div>{tReminder("date")}</div>
        : ({ column }) => {
            return (
              <Button
                variant="ghost"
                onClick={() =>
                  column.toggleSorting(column.getIsSorted() === "asc")
                }
              >
                {td("updated_at")}
                <CaretSortIcon className="ml-2 h-4 w-4" />
              </Button>
            );
          },
      cell: ({ row }) => {
        const dateValue = row.getValue(
          isReminder ? "created_at" : "updated_at"
        ) as string;
        return <div>{formatDate(dateValue)}</div>;
      },
    },
    {
      accessorKey: "status",
      header: () => (
        <div className="text-center">
          {isReminder ? tReminder("status") : td("status")}
        </div>
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as RecordStatus;
        return (
          <div className="text-center font-medium">
            {STATUS_MAP[status] || "In Progress"}
          </div>
        );
      },
    },
  ];

  if (error) {
    return (
      <div className="w-full p-4 text-center text-red-500">
        <p>
          {isReminder
            ? `Error loading reminder articles: ${error}`
            : `Error loading articles: ${error}`}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full p-4 text-center">
        <p>
          {isReminder ? "Loading reminder articles..." : "Loading articles..."}
        </p>
      </div>
    );
  }

  if (isReminder) {
    return (
      <TeacherDataTable
        data={articles}
        columns={columns}
        borderClassName="rounded-md border mt-3 mb-4 bg-[#ffedd5] dark:bg-[#7c2d12]"
        showPagination={false}
        onRowClick={(row) =>
          navigateToArticle(
            row.original.targetId ? row.original.targetId : row.original.articleId
          )
        }
        rowClassName="cursor-pointer"
        emptyMessage={
          articles.length === 0
            ? "Great! No incomplete articles."
            : "No articles match your current filters."
        }
      />
    );
  }

  return (
    <div className="w-full">
      <TeacherDataTable
        data={articles}
        columns={columns}
        searchColumn="title"
        searchPlaceholder={td("search")}
        toolbarClassName="flex items-center py-4 space-x-2"
        toolbar={(table) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                {td("columns")} <ChevronDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        paginationClassName="flex items-center justify-end space-x-2 py-4"
        paginationLeft={(table) => (
          <div className="flex-1 text-sm text-muted-foreground">
            {t("select", {
              selected: table.getFilteredSelectedRowModel().rows.length,
              total: table.getFilteredRowModel().rows.length,
            })}
          </div>
        )}
        onRowClick={(row) => navigateToArticle(row.original.articleId)}
        rowClassName="cursor-pointer"
        emptyMessage={
          articles.length === 0
            ? "No articles found. Start reading to see your progress here!"
            : "No articles match your current filters."
        }
      />
    </div>
  );
}
