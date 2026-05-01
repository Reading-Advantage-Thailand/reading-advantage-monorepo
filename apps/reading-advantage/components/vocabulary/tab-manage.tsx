"use client";
import * as React from "react";
import dayjs from "dayjs";
import { toast } from "../ui/use-toast";
import { useScopedI18n } from "@/locales/client";
import { formatDate, levelCalculation } from "@/lib/utils";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import { State } from "ts-fsrs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { CaretSortIcon } from "@radix-ui/react-icons";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/header";

import { date_scheduler } from "ts-fsrs";
import { filter } from "lodash";
import { UserXpEarned } from "../models/user-activity-log-model";

export type Vocabulary = {
  articleId: string;
  word: string;
  definition: string;
  createdAt: string;
  id: string;
  due: Date; 
  stability: number; 
  difficulty: number; 
  elapsed_days: number; 
  scheduled_days: number; 
  reps: number; 
  lapses: number; 
  state: State; 
  last_review?: Date; 
};

type Props = {
  userId: string;
};

export default function VocabularyManageTab({ userId }: Props) {
  const t = useScopedI18n("pages.student.practicePage");
  const tUpdateScore = useScopedI18n(
    "pages.student.practicePage.flashcardPractice"
  );

  const router = useRouter();
  const [vocabularies, setVocabularies] = React.useState<Vocabulary[]>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const getVocabularyData = async () => {
    try {
      const res = await fetch(`/api/v1/users/vocabularies/${userId}`);
      const data = await res.json();
      const startOfDay = dayjs().startOf('day').toDate();

      if (!data || !data.vocabularies || !Array.isArray(data.vocabularies)) {
        console.error("Invalid API response:", data);
        return; 
      }

      const vocabulariesWithFormattedData = data.vocabularies.map(
        (vocabulary: any) => {
          const word = vocabulary.word || {}; 
          const definition = word.definition || {}; 

          return {
            ...vocabulary,
            createdAtString: formatDateFromTimestamp(vocabulary.createdAt),
            word: word.vocabulary, 
            definition:
              definition.th ||
              definition.en ||
              definition.cn ||
              definition.tw ||
              definition.vi ||
              "No definition", 
          };
        }
      );

      setVocabularies(vocabulariesWithFormattedData);

      let filterDataUpdateScore = filter(data.vocabularies, (item) => {
        const dueDate = new Date(item.due);
        return (
          (item.state === 2 || item.state === 3) &&
          dueDate < startOfDay &&
          !item.update_score
        );
      });

      if (filterDataUpdateScore?.length > 0) {
        for (let i = 0; i < filterDataUpdateScore.length; i++) {
          try {
            if (!filterDataUpdateScore[i]?.update_score) {
              await fetch(
                `/api/v1/assistant/ts-fsrs-test/flash-card/${filterDataUpdateScore[i]?.id}`,
                {
                  method: "POST",
                  body: JSON.stringify({
                    ...filterDataUpdateScore[i],
                    update_score: true,
                  }),
                }
              );

              const updateScrore = await fetch(
                `/api/v1/users/${userId}/activitylog`,
                {
                  method: "POST",
                  body: JSON.stringify({
                    articleId: filterDataUpdateScore[i]?.articleId,
                    activityType: "vocabulary_flashcards",
                    activityStatus: "completed",
                    xpEarned: UserXpEarned.Vocabulary_Flashcards,
                    details: {
                      ...filterDataUpdateScore[i],
                      cefr_level: levelCalculation(
                        UserXpEarned.Vocabulary_Flashcards
                      ).cefrLevel,
                    },
                  }),
                }
              );
              if (updateScrore?.status === 201) {
                toast({
                  title: t("toast.success"),
                  description: tUpdateScore("yourXp", {
                    xp: UserXpEarned.Vocabulary_Flashcards,
                  }),
                });
                router.refresh();
              }
            }
          } catch (error) {
            console.error(`Failed to update data`);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const formatDateFromTimestamp = (timestamp: any): string => {
    if (!timestamp) return ""; 

    if (typeof timestamp === "object" && timestamp._seconds) {
      const seconds = timestamp._seconds;
      const nanoseconds = timestamp._nanoseconds;
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
      const date = new Date(milliseconds);
      return date.toLocaleString();
    } else if (typeof timestamp === "string") {
      try {
        const date = new Date(timestamp);
        return date.toLocaleString();
      } catch (error) {
        console.error("Invalid date string:", timestamp);
        return "Invalid Date";
      }
    }
    return "Invalid Date"; 
  };

  React.useEffect(() => {
    getVocabularyData();
  }, []);

  const columns: ColumnDef<Vocabulary>[] = [
    {
      accessorKey: "word",
      header: "Vocabulary",
      cell: ({ row }) => (
        <div
          className="capitalize cursor-pointer"
          onClick={() => handleNavigateToArticle(row.original.articleId)}
        >
          {row.getValue("word")}
        </div>
      ),
    },
    {
      accessorKey: "createdAtString",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date Saved
          <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div>{row.getValue("createdAtString")}</div>,
    },
    {
      accessorKey: "due",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Due
          <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div>{formatDate(row.getValue("due"))}</div>,
    },
    {
      accessorKey: "delete",
      header: "",
      cell: ({ row }) => {
        return (
          <Button
            className="ml-auto font-medium"
            size="sm"
            variant="destructive"
            onClick={() => handleDelete(row.original.id)}
          >
            Delete
          </Button>
        );
      },
    },
  ];

  const table = useReactTable({
    data: vocabularies,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const handleNavigateToArticle = (articleId: string) => {
    router.push(`/student/read/${articleId}`);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/users/vocabularies/${id}`, {
        method: "DELETE",
        body: JSON.stringify({
          id,
        }),
      });
      const data = await res.json();
      if (data.status === 200) {
        const updateVocabularies = vocabularies.filter(
          (item) => item.id !== id
        );
        setVocabularies(updateVocabularies);
        toast({
          title: t("toast.success"),
          description: t("toast.successDescription"),
        });
      } else {
        toast({
          title: t("toast.error"),
          description: t("toast.errorDescription"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.log(error);
      toast({
        title: t("toast.error"),
        description: t("toast.errorDescription"),
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="mt-5">
        <Header
          heading={t("savedVocabulary")}
          text={
            vocabularies?.length === 0
              ? t("noSavedVocabulary")
              : t("savedVocabularyDescription", {
                  total: vocabularies?.length,
                })
          }
        />
      </div>
      <div className="w-full">
        <div className="flex items-center py-4">
          <Input
            placeholder={"Search..."}
            value={(table.getColumn("word")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("word")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : typeof header.column.columnDef.header === "function"
                        ? header.column.columnDef.header(header.getContext())
                        : header.column.columnDef.header}{" "}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    Empty
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 pt-4 pb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
