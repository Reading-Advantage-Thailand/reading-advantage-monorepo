"use client";

import React, { startTransition } from "react";
import { useTranslations } from "next-intl";
import { Header } from "./header";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "./ui/button";
import { ArrowUpDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteFlashcardCard } from "@/actions/flashcard";
import { useFormatDate } from "@/lib/utils";
import type { InferSelectModel } from "drizzle-orm";
import { flashcardCards } from "@reading-advantage/db";

type Sentence = InferSelectModel<typeof flashcardCards>;

interface ManageTabProps {
  data: Sentence[];
}

export default function ManageTab({ data }: ManageTabProps) {
  const t = useTranslations("SentencesPage.manage");
  const formatDate = useFormatDate();
  const [sentences, setSentences] = React.useState<Sentence[]>(data);

  const columns: ColumnDef<Sentence>[] = [
    {
      accessorKey: "front",
      header: t("tableHeaders.sentence"),
      cell: ({ row }) => {
        const sentence = row.getValue("front") as string;
        return <div className="whitespace-pre-wrap">{sentence}</div>;
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("tableHeaders.createdAt")}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const createdAt = row.getValue("createdAt") as Date;
        return (
          <div
            className="text-muted-foreground text-center text-sm"
            title={`Created: ${createdAt.toLocaleString()}`}
          >
            {formatDate(createdAt)}
          </div>
        );
      },
    },
    {
      accessorKey: "action",
      header: t("tableHeaders.action"),
      cell: ({ row }) => {
        const id = row.original.id;
        const sentence = row.original.front;
        return (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="destructive"
                aria-label={t("deleteDialog.delete")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("deleteDialog.description")}
                </AlertDialogDescription>
                <div className="bg-muted mt-2 rounded p-2 font-mono text-sm">
                  &quot;{sentence?.substring(0, 50)}...&quot;
                </div>
                <div className="text-muted-foreground text-sm">
                  {t("deleteDialog.warning")}
                </div>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {t("deleteDialog.cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t("deleteDialog.delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );
      },
    },
  ];

  const handleDelete = async (id: string) => {
    startTransition(async () => {
      const result = await deleteFlashcardCard(id);
      if (result.success) {
        toast.success(result.message);
        setSentences(sentences.filter((sentence) => sentence.id !== id));
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <Header heading={t("heading")} text={t("description")} />
      <div className="flex flex-col gap-4">

        <DataTable
          columns={columns}
          data={sentences}
          emptyText={t("noResults")}
          initialSorting={[{ id: "createdAt", desc: true }]}
          filterColumnId="front"
          toolbar={({ filterValue, setFilterValue }) => (
            <div className="flex items-center py-4">
              <Input
                placeholder={t("searchPlaceholder")}
                value={filterValue}
                onChange={(event) => setFilterValue(event.target.value)}
                className="max-w-sm"
              />
            </div>
          )}
          footer={({ previousPage, nextPage, canPreviousPage, canNextPage }) => (
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => previousPage()}
                disabled={!canPreviousPage}
              >
                {t("pagination.previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => nextPage()}
                disabled={!canNextPage}
              >
                {t("pagination.next")}
              </Button>
            </div>
          )}
        />
      </div>
    </div>
  );
}
