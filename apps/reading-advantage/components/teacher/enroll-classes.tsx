"use client";
import React, { useCallback, useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CaretSortIcon } from "@radix-ui/react-icons";
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
import { Checkbox } from "../ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useScopedI18n } from "@/locales/client";
import { useParams, useRouter } from "next/navigation";
import { toast } from "../ui/use-toast";
import { Header } from "../header";

type Student = {
  id: string;
  email: string;
  display_name: string;
  last_activity: string;
};

type Classroom = {
  id: string;
  classroomName: string;
  classCode: string;
  grade: string;
  coTeacher: {
    coTeacherId: string;
    name: string;
  };
  archived: boolean;
  teacherId: string;
};

type MyEnrollProps = {
  classroom: Classroom[];
  student: Student;
};

export default function MyEnrollClasses() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("");
  const [isEnrolling, setIsEnrolling] = useState<boolean>(false);
  const t = useScopedI18n("components.articleRecordsTable");
  const te = useScopedI18n("components.myStudent.enrollPage");
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<MyEnrollProps>();

  const handleStudentEnrollment = async () => {
    if (!selectedClassroomId) {
      toast({
        title: te("toast.errorEnrollment"),
        description: "Please select a classroom first.",
        variant: "destructive",
      });
      return;
    }

    setIsEnrolling(true);

    const studentdata = [
      {
        studentId: params.studentId,
        lastActivity: data?.student.last_activity
          ? data.student.last_activity
          : "No Activity",
      },
    ];

    try {
      const response = await fetch(
        `/api/v1/classroom/${selectedClassroomId}/enroll`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            student: studentdata,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (result.error === "ALREADY_ENROLLED") {
          toast({
            title: "ไม่สามารถเพิ่มนักเรียนได้",
            description: result.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: te("toast.errorEnrollment"),
            description: te("toast.errorEnrollDescription"),
            variant: "destructive",
          });
        }
        setIsEnrolling(false);
      } else {
        setData((prevData) => {
          const safePrevData = prevData ?? {
            classroom: [],
            student: {} as Student,
          };

          return {
            ...safePrevData,
            classroom: safePrevData.classroom.filter(
              (classroom: Classroom) => classroom.id !== selectedClassroomId
            ),
          };
        });

        toast({
          title: te("toast.successEnrollment"),
          description: te("toast.successEnrollDescription"),
        });

        setTimeout(() => {
          router.push("/teacher/my-students");
        }, 1000);
      }
    } catch (error) {
      console.error("Error during enrollment:", error);
      toast({
        title: te("toast.errorEnrollment"),
        description: te("toast.errorEnrollDescription"),
        variant: "destructive",
      });
      setIsEnrolling(false);
    }
  };

  const columns: ColumnDef<Classroom>[] = [
    {
      accessorKey: "classroomName",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {te("className")}
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const classroomName: string = row.getValue("classroomName");
        return (
          <div className="captoliza ml-4" onClick={() => row.toggleSelected}>
            {classroomName ? classroomName : "Anonymous"}
          </div>
        );
      },
    },
    {
      accessorKey: "id",
      header: () => {
        return <div>{te("enroll")}</div>;
      },
      cell: ({ row }) => (
        <div className="ml-2">
          <RadioGroupItem value={row.original.id} />
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: data?.classroom || [],
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
    const fetchData = async () => {
      await fetch(
        `/api/v1/classroom/students/enroll?studentId=${params.studentId}`,
        {
          method: "GET",
        }
      )
        .then((res) => {
          if (!res.ok) {
            throw new Error("Failed to fetch data");
          }
          return res.json();
        })
        .then((res) => setData(res));
    };
    fetchData();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <Header
        heading={te("title", {
          studentName: data ? data.student?.display_name : "Unknown",
        })}
      />
      <div className="flex items-center justify-between">
        <Input
          placeholder={te("search")}
          value={
            (table.getColumn("classroomName")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("classroomName")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <Button
          variant="default"
          className="max-w-sm"
          onClick={handleStudentEnrollment}
          disabled={isEnrolling || !selectedClassroomId}
        >
          {isEnrolling ? "Adding..." : te("add")}
        </Button>
      </div>
      <div className="rounded-md border">
        <RadioGroup
          value={selectedClassroomId}
          onValueChange={setSelectedClassroomId}
        >
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
        </RadioGroup>
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
    </div>
  );
}
