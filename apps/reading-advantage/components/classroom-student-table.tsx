"use client";
import React from "react";
import { ColumnDef, Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CaretSortIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useScopedI18n } from "@/locales/client";
import { ScrollArea } from "./ui/scroll-area";
import TeacherDataTable from "./teacher/teacher-data-table";

export type ClassroomStudent = {
  id: string;
  name?: string;
  display_name: string;
  email?: string;
  xp?: number;
  level?: number;
  last_activity?: string;
};

type ClassroomStudentTableProps = {
  students: ClassroomStudent[];
  variant: "admin" | "roster";
  classrooms?: Array<{ id: string }> | null;
  toolbar?: React.ReactNode;
  onResetProgress?: (studentId: string) => void;
  showPagination?: boolean;
  renderPagination?: (table: Table<ClassroomStudent>) => React.ReactNode;
};

/**
 * Renders the classroom student table for the admin report and the
 * teacher roster, delegating the react-table shell to TeacherDataTable.
 * @param props Students plus the variant-specific knobs and callbacks.
 * @returns The search bar, student table, and pagination controls.
 */
export default function ClassroomStudentTable({
  students,
  variant,
  classrooms,
  toolbar,
  onResetProgress,
  showPagination = true,
  renderPagination,
}: ClassroomStudentTableProps) {
  const trp = useScopedI18n("components.reports");
  const tr = useScopedI18n("components.classRoster");
  const ts = useScopedI18n("components.myStudent");
  const router = useRouter();
  const [isClient, setIsClient] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [columnVisibility, setColumnVisibility] = React.useState({});

  React.useEffect(() => {
    setIsClient(true);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  React.useEffect(() => {
    if (!isClient) return;

    if (isMobile) {
      setColumnVisibility({
        email: false,
        xp: false,
        last_activity: false,
        actions: false,
      });
    } else {
      setColumnVisibility({
        email: true,
        xp: true,
        last_activity: true,
        actions: true,
      });
    }
  }, [isMobile, isClient]);

  const viewDetails = (studentId: string) =>
    router.push(`/teacher/student-progress/${studentId}`);

  const adminColumns: ColumnDef<ClassroomStudent>[] = [
    {
      accessorKey: "display_name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {trp("name")}
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="font-medium ml-2">
          <div>{row.getValue("display_name")}</div>
          {isMobile && (
            <div className="text-xs text-muted-foreground mt-1 space-y-1">
              <div>{row.getValue("email")}</div>
              <div>
                XP: {(row.getValue("xp") as number)?.toLocaleString() || "0"}
              </div>
              <div>
                Last Activity:{" "}
                {row.getValue("last_activity")
                  ? format(
                      new Date(row.getValue("last_activity") as string),
                      "MMM dd, yyyy"
                    )
                  : "No Activity"}
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div className="lowercase">{row.getValue("email")}</div>
      ),
    },
    {
      accessorKey: "level",
      header: ({ column }) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="w-full justify-center"
            >
              {trp("level")}
              <CaretSortIcon className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );
      },
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant="secondary">{row.getValue("level") || 0}</Badge>
          {isMobile && (
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => viewDetails(row.original.id)}
                className="w-full text-xs"
              >
                {trp("viewDetails")}
              </Button>
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "xp",
      header: ({ column }) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="w-full justify-center"
            >
              {trp("xp")}
              <CaretSortIcon className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );
      },
      cell: ({ row }) => {
        const xp = row.getValue("xp") as number;
        return (
          <div className="text-center font-mono">
            {isClient ? xp?.toLocaleString() || "0" : xp || "0"}
          </div>
        );
      },
    },
    {
      accessorKey: "last_activity",
      header: ({ column }) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="w-full justify-center"
            >
              {trp("lastActivity")}
              <CaretSortIcon className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );
      },
      cell: ({ row }) => {
        const lastActivity = row.getValue("last_activity") as string;
        if (!isClient) {
          return <div className="text-center">Loading...</div>;
        }
        return (
          <div className="text-center">
            {lastActivity
              ? format(new Date(lastActivity), "MMM dd, yyyy")
              : "No Activity"}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-center">{trp("actions")}</div>,
      cell: ({ row }) => {
        const student = row.original;
        return (
          <div className="text-center">
            {isMobile ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => viewDetails(student.id)}
                className="w-full"
              >
                {trp("viewDetails")}
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {trp("actions")}{" "}
                    <ChevronDownIcon className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => viewDetails(student.id)}>
                    {trp("viewDetails")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      },
    },
  ];

  const rosterColumns: ColumnDef<ClassroomStudent>[] = [
    {
      accessorKey: "display_name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {tr("name")}
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="ml-4">{row.getValue("display_name")}</div>
      ),
    },
    {
      accessorKey: "last_activity",
      header: () => {
        return <div className="text-center">{tr("lastActivity")}</div>;
      },
      cell: ({ row }) => {
        return (
          <div className="text-center">
            {row.getValue("last_activity")
              ? new Date(row.getValue("last_activity") as string).toLocaleString()
              : "No Activity"}
          </div>
        );
      },
    },
    {
      accessorKey: "action",
      header: () => {
        return <div className="text-center">{tr("actions")}</div>;
      },
      cell: ({ row }) => {
        const student = row.original;
        return (
          <div className="text-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" className="ml-auto">
                  {tr("actions")} <ChevronDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => viewDetails(student.id)}>
                  {ts("progress")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/teacher/enroll-classes/${student.id}`)
                  }
                >
                  {ts("enroll")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    onResetProgress?.(student.id);
                  }}
                >
                  {ts("resetProgress")}
                </DropdownMenuItem>
                {classrooms && classrooms.length > 0 && (
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(
                        `/teacher/class-roster/${classrooms[0].id}/history/${student.id}`
                      )
                    }
                  >
                    {tr("history")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  if (variant === "admin") {
    return (
      <TeacherDataTable
        data={students}
        columns={adminColumns}
        searchColumn="display_name"
        searchPlaceholder={trp("search")}
        searchClassName="w-full md:max-w-sm"
        toolbarClassName="p-4"
        borderClassName=""
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        tableWrapper={(table) => (
          <ScrollArea className="h-[400px]">{table}</ScrollArea>
        )}
        emptyMessage="No students found."
        showPagination={showPagination}
        paginationClassName="flex flex-col space-y-2 md:flex-row md:items-center md:justify-end md:space-y-0 md:space-x-2 p-4"
        paginationButtonClassName="w-full md:w-auto"
        renderPagination={renderPagination}
      />
    );
  }

  return (
    <TeacherDataTable
      data={students}
      columns={rosterColumns}
      searchColumn="display_name"
      searchPlaceholder={tr("search")}
      tableFixed
      headerClassName="font-bold"
      toolbar={toolbar}
      toolbarClassName="flex justify-between items-center"
      showPagination={showPagination}
      renderPagination={renderPagination}
    />
  );
}
