"use client";
import { licenseService } from "@/client/services/firestore-client-services";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CopyKeyButton from "@/components/copy-key-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { License } from "@/server/models/license";
import { ColumnDef, Row } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const apiDeleteLicense = async (id: string) => {
  await licenseService.licenses.deleteDoc(id);
};

const convertToReadableDate = (isoDateString: unknown): string => {
  if (typeof isoDateString !== "string" || !isoDateString) return "—";
  const date = new Date(isoDateString);
  if (Number.isNaN(date.getTime())) return "—";
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
};

function ActionsCell({ license }: { license: License }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiDeleteLicense(license.id);
      setConfirmOpen(false);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setConfirmOpen(true);
            }}
          >
            Delete
          </DropdownMenuItem>
          <CopyKeyButton
            asDropdownItem
            copyText={license.key}
            dropdownLabel="Copy License Key"
          />
          <DropdownMenuSeparator />
          <DropdownMenuItem>View license details</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleDelete}
        title="Delete license?"
        description={`This permanently deletes the license for ${license.schoolName}. This action cannot be undone.`}
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        variant="destructive"
      />
    </>
  );
}

export const columns: ColumnDef<License>[] = [
  {
    accessorKey: "schoolName",
    header: "School name",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("schoolName")}</div>
    ),
  },
  {
    accessorKey: "maxUsers",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Total
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div>{row.getValue("maxUsers")}</div>,
  },
  {
    accessorKey: "usedLicenses",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Used
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div>{row.getValue("usedLicenses")}</div>,
  },
  {
    accessorKey: "licenseType",
    header: "Subscription",
    cell: ({ row }) => (
      <Badge
        className={cn(
          row.getValue("licenseType") === "BASIC"
            ? "bg-green-300"
            : row.getValue("licenseType") === "ENTERPRISE"
            ? "bg-blue-300"
            : "bg-red-300"
        )}
      >
        {row.getValue("licenseType")}
      </Badge>
    ),
  },
  {
    accessorKey: "expiresAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Expiration
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div>{convertToReadableDate(row.getValue("expiresAt"))}</div>
    ),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => <ActionsCell license={row.original} />,
  },
];
