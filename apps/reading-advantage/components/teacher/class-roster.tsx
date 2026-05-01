"use client";
import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CaretSortIcon, ChevronDownIcon } from "@radix-ui/react-icons";
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
import { Input } from "@/components/ui/input";
import { useScopedI18n } from "@/locales/client";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icons } from "@/components/icons";
import { Header } from "@/components/header";
import { toast } from "../ui/use-toast";
import { ScrollArea } from "../ui/scroll-area";
import { useClassroomState, useClassroomStore } from "@/store/classroom-store";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClassroomActions } from "@/hooks/teacher/useClassroomActions";

type StudentData = {
  id: string;
  display_name: string;
  email: string;
  last_activity: string;
};

interface Classes {
  classroomName: string;
  classCode: string;
  noOfStudents: number;
  grade: string;
  coTeacher: {
    coTeacherId: string;
    name: string;
  };
  id: string;
  archived: boolean;
  title: string;
  student: [
    {
      studentId: string;
      lastActivity: Date;
    },
  ];
  importedFromGoogle: boolean;
  alternateLink: string;
  googleClassroomId?: string;
}

export default function ClassRoster() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const t = useScopedI18n("components.articleRecordsTable");
  const tr = useScopedI18n("components.classRoster");
  const ts = useScopedI18n("components.myStudent");
  const router = useRouter();
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const { classrooms, fetchClassrooms } = useClassroomStore();
  const pathname = usePathname();
  const [classroomId, setClassroomId] = useState<string>("");
  const {
    classes,
    selectedClassroom,
    studentInClass,
    setClasses,
    setSelectedClassroom,
    setStudentInClass,
  } = useClassroomState();
  const {
    fetchStudentInClass,
    handleClassChange,
    syncStudents,
    handleResetProgress,
    setIsResetModalOpen,
    loading,
    isResetting,
    isResetModalOpen,
  } = useClassroomActions();

  const columns: ColumnDef<StudentData>[] = React.useMemo(
    () => [
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
          <div className="captoliza ml-4">{row.getValue("display_name")}</div>
        ),
      },
      {
        accessorKey: "last_activity",
        header: () => {
          return <div className="text-center">{tr("lastActivity")}</div>;
        },
        cell: ({ row }) => {
          return (
            <div className="captoliza text-center">
              {row.getValue("last_activity")
                ? new Date(row.getValue("last_activity")).toLocaleString()
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
          const payment = row.original;
          return (
            <div className="text-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" className="ml-auto">
                    {tr("actions")} <ChevronDownIcon className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(
                        `${process.env.NEXT_PUBLIC_BASE_URL}/teacher/student-progress/${payment.id}`
                      )
                    }
                  >
                    {ts("progress")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(
                        `${process.env.NEXT_PUBLIC_BASE_URL}/teacher/enroll-classes/${payment.id}`
                      )
                    }
                  >
                    {ts("enroll")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setIsResetModalOpen(true);
                      setSelectedStudentId(payment.id);
                    }}
                  >
                    {ts("resetProgress")}
                  </DropdownMenuItem>
                  {classrooms && (
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(
                          `${process.env.NEXT_PUBLIC_BASE_URL}//teacher/class-roster/${classrooms[0]?.id}/history/${payment.id}`
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
    ],
    [tr, ts]
  );
  const data = React.useMemo(() => studentInClass || [], [studentInClass]);

  const table = useReactTable({
    data,
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

  useEffect(() => {
    if (classrooms.length) {
      const pathSegments = pathname.split("/");
      const currentClassroomId = pathSegments[4];
      setClassroomId(currentClassroomId);

      if (
        currentClassroomId &&
        classrooms.some((c) => c.id === currentClassroomId)
      ) {
        setSelectedClassroom(currentClassroomId);
        fetchStudentInClass(currentClassroomId);
      } else {
        setClasses({} as Classes);
        setSelectedClassroom("");
        setStudentInClass([]);
      }
    }
  }, [pathname, classrooms]);

  useEffect(() => {
    if (!classrooms.length) {
      fetchClassrooms();
    }
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        {/* <Header heading="Class Roster" /> */}
        <Select value={selectedClassroom} onValueChange={handleClassChange}>
          <SelectTrigger className="mt-4 h-auto w-[180px]">
            <SelectValue placeholder="Select a Classroom" />
          </SelectTrigger>
          <SelectContent className="max-h-48 overflow-y-auto">
            {classrooms?.map((classroom, index) => (
              <SelectItem key={index} value={classroom.id}>
                {classroom.classroomName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {classes &&
        Object.keys(classes).length > 0 &&
        (studentInClass.length ? (
          <Header heading={tr("title", { className: classes.classroomName })} />
        ) : (
          <Header heading={tr("noStudent")} />
        ))}
      <div className="flex justify-between items-center">
        <Input
          placeholder={tr("search")}
          value={
            (table.getColumn("display_name")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("display_name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        {selectedClassroom &&
          classroomId &&
          (classes &&
            Object.keys(classes).length > 0 &&
            !classes.importedFromGoogle ? (
            <Button
              variant="outline"
              onClick={() => {
                if (classroomId) {
                  router.push(
                    `/teacher/class-roster/${classroomId}/create-new-student`
                  );
                } else {
                  toast({
                    title: "Error",
                    description: "Classroom ID is not available.",
                  });
                }
              }}
            >
              <Icons.add />
              {tr("addStudentButton")}
            </Button>
          ) : classes &&
            Object.keys(classes).length > 0 &&
            classes.importedFromGoogle ? (
            <Button
              onClick={() =>
                classes.googleClassroomId &&
                syncStudents(classes.googleClassroomId)
              }
              disabled={loading || !classes.googleClassroomId}
            >
              {loading ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Sync students
                </>
              ) : (
                <>
                  <Image
                    className="mr-2"
                    src={"/96x96_yellow_stroke_icon@1x.png"}
                    alt="google-classroom"
                    width={20}
                    height={20}
                  />
                  Sync students
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                if (classroomId) {
                  router.push(
                    `/teacher/class-roster/${classroomId}/create-new-student`
                  );
                } else {
                  toast({
                    title: "Error",
                    description: "Classroom ID is not available.",
                  });
                }
              }}
            >
              <Icons.add />
              {tr("addStudentButton")}
            </Button>
          ))}
      </div>
      <div className="rounded-md border">
        <Table style={{ tableLayout: "fixed", width: "100%" }}>
          <TableHeader className="font-bold">
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
      <div className="flex items-center justify-end space-x-2">
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {t("previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {t("next")}
          </Button>
        </div>
      </div>
      <Dialog
        open={isResetModalOpen}
        onOpenChange={(open) => !isResetting && setIsResetModalOpen(open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ts("resetTitle")}</DialogTitle>
          </DialogHeader>
          <DialogDescription>{ts("resetDescription")}</DialogDescription>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsResetModalOpen(false)}
              disabled={isResetting}
            >
              {ts("cancelReset")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleResetProgress(selectedStudentId)}
              disabled={isResetting}
            >
              {isResetting ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                ts("reset")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
