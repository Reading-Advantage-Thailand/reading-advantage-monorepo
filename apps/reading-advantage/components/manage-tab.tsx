"use client";
import * as React from "react";
import { toast } from "./ui/use-toast";
import { formatDate, formatTimestamp, levelCalculation } from "@/lib/utils";
import { useScopedI18n } from "@/locales/client";
import Link from "next/link";
import { Button } from "./ui/button";
import { State } from "ts-fsrs";
import { useRouter } from "next/navigation";
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
import {
  CaretSortIcon,
  ChevronDownIcon,
  DotsHorizontalIcon,
} from "@radix-ui/react-icons";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/header";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import dayjs_plugin_isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import dayjs_plugin_isSameOrAfter from "dayjs/plugin/isSameOrAfter";

import { date_scheduler } from "ts-fsrs";
import { filter } from "lodash";
import { UserXpEarned } from "./models/user-activity-log-model";
import { Badge } from "./ui/badge";

dayjs.extend(utc);
dayjs.extend(dayjs_plugin_isSameOrBefore);
dayjs.extend(dayjs_plugin_isSameOrAfter);

export type Sentence = {
  articleId: string;
  createdAt: { _seconds: number; _nanoseconds: number };
  endTimepoint: number;
  sentence: string;
  sn: number;
  timepoint: number;
  translation: { th: string };
  userId: string;
  id: string;
  due: Date; // Date when the card is next due for review
  stability: number; // A measure of how well the information is retained
  difficulty: number; // Reflects the inherent difficulty of the card content
  elapsed_days: number; // Days since the card was last reviewed
  scheduled_days: number; // The interval at which the card is next scheduled
  reps: number; // Total number of times the card has been reviewed
  lapses: number; // Times the card was forgotten or remembered incorrectly
  state: State; // The current state of the card (New, Learning, Review, Relearning)
  last_review?: Date; // The most recent review date, if applicable
};

type Props = {
  userId: string;
};

export default function ManageTab({ userId }: Props) {
  const t = useScopedI18n("pages.student.practicePage");
  const tUpdateScore = useScopedI18n(
    "pages.student.practicePage.flashcardPractice"
  );

  const router = useRouter();
  const [sentences, setSentences] = React.useState<Sentence[]>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const getUserSentenceSaved = async () => {
    try {
      const res = await fetch(`/api/v1/users/sentences/${userId}`);
      const data = await res.json();
      const startOfDay = dayjs().startOf('day').toDate();
      // const filteredData = await data.sentences
      //   .filter((record: Sentence) => {
      //     const dueDate = new Date(record.due);
      //     return record.state === 0 || dueDate < startOfDay;
      //   })
      //   .sort((a: Sentence, b: Sentence) => {
      //     return dayjs(a.due).isAfter(dayjs(b.due)) ? 1 : -1;
      //   });
      // setSentences(filteredData);
      setSentences(data.sentences);

      // updateScore
      let filterDataUpdateScore = filter(data.sentences, (item) => {
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
                    activityType: "sentence_flashcards",
                    activityStatus: "completed",
                    xpEarned: UserXpEarned.Sentence_Flashcards,
                    details: {
                      ...filterDataUpdateScore[i],
                      cefr_level: levelCalculation(
                        UserXpEarned.Sentence_Flashcards
                      ).cefrLevel,
                    },
                  }),
                }
              );
              if (updateScrore?.status === 201) {
                toast({
                  title: t("toast.success"),
                  description: tUpdateScore("yourXp", {
                    xp: UserXpEarned.Sentence_Flashcards,
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

  React.useEffect(() => {
    getUserSentenceSaved();
  }, []);

  const columns: ColumnDef<Sentence>[] = [
    {
      accessorKey: "sentence",
      header: "Sentence",
      cell: ({ row }) => (
        <div
          className="capitalize cursor-pointer"
          onClick={() => handleNavigateToArticle(row.original.articleId)}
        >
          {row.getValue("sentence")}
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <CaretSortIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const createdAt = row.getValue("due") as string;
        const date = new Date(createdAt).toLocaleString();
        return <div>{date}</div>;
      },
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
      cell: ({ row }) => {
        const due = row.getValue("due") as string;
        const date = formatDate(due);
        return <div>{date}</div>;
      },
    },
    // {
    //   accessorKey: "update_score",
    //   header: ({ column }) => (
    //     <div className="text-center font-medium">Status</div>
    //   ),
    //   cell: ({ row }) => {
    //     const status = row.getValue("update_score");

    //     return (
    //       <div className="text-center font-medium">
    //         {status ? (
    //           <Badge className="bg-green-700" variant="outline">
    //             Complate
    //           </Badge>
    //         ) : (
    //           <Badge className="bg-orange-400" variant="outline">
    //             In Progress
    //           </Badge>
    //         )}
    //       </div>
    //     );
    //   },
    // },
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
    data: sentences,
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
      const res = await fetch(`/api/v1/users/sentences/${id}`, {
        method: "DELETE",
        body: JSON.stringify({
          id,
        }),
      });
      const data = await res.json();
      if (data.status === 200) {
        const updateSentences = sentences.filter((item) => item.id !== id);
        setSentences(updateSentences);
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
      <Header
        heading={t("savedSentences")}
        text={
          sentences.length == 0
            ? t("noSavedSentences")
            : t("savedSentencesDescription", {
                total: sentences.length,
              })
        }
      />
      <div className="w-full">
        <div className="flex items-center py-4">
          <Input
            placeholder={"Search..."}
            value={
              (table.getColumn("sentence")?.getFilterValue() as string) ?? ""
            }
            onChange={(event) =>
              table.getColumn("sentence")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
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
                    {row.getVisibleCells().map((cell) => {
                      return (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      );
                    })}
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
        <div className="flex items-center justify-end space-x-2 pt-4">
          {/* <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div> */}
          <div className="space-x-2">
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
      </div>
      {/* )}  */}
    </>
  );
}
