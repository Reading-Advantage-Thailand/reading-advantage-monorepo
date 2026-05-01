"use client";
import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
import {
  ChevronsUpDownIcon,
  ChevronDownIcon,
  CircleCheckBigIcon,
  RefreshCcwIcon,
  CircleAlertIcon,
  UsersIcon,
  Loader2Icon,
  PlusIcon,
  ChartColumnBigIcon,
  ArchiveIcon,
  TrashIcon,
  ClipboardListIcon,
  PencilIcon,
  MoreHorizontalIcon,
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { Header } from "../header";
// import { useCourseStore, useClassroomStore } from "@/store/classroom-store";
import { Icons } from "@/components/icons";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { classroom_v1 } from "googleapis";
import { Link } from "@/i18n/navigation";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import CreateClass from "./create-classes";
import { toast } from "sonner";
import { Label } from "@radix-ui/react-label";

type Classes = {
  id: string;
  name: string;
  teacherId: string;
  classCode: string | null;
  codeExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  students: {
    id: string;
    studentId: string;
    classroomId: string;
    student: {
      id: string;
      name: string | null;
      email: string | null;
    };
  }[];
  teacher: {
    id: string;
    name: string | null;
    email: string | null;
  };
  // Legacy fields for backwards compatibility
  classroomName?: string;
  noOfStudents?: number;
  grade?: string;
  coTeacher?: {
    coTeacherId: string;
    name: string;
  };
  archived?: boolean;
  student?: {
    studentId: string;
    lastActivity: Date;
  }[];
  importedFromGoogle?: boolean;
  alternateLink?: string;
};

export default function MyClasses() {
  const t = useTranslations("TeacherMyClasses");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [coursesOpen, setCoursesOpen] = useState<boolean>(false);
  const [importState, setImportState] = useState(0);
  const [selected, setSelected] = useState("");
  const [classrooms, setClassrooms] = useState<Classes[]>([]);
  const [dialogOpen, setDialogOpen] = useState<string>("");
  const [nameChange, setNameChange] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
  const [classroomId, setClassroomId] = useState<string>("");

  const fetchClassrooms = async () => {
    try {
      const response = await fetch("/api/classroom");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("API Response:", data); // Debug log
      setClassrooms(data.classrooms || []);
    } catch (error) {
      console.error("Error fetching classrooms:", error);
      setClassrooms([]);
    }
  };

  const handleEditClass = async (
    classroomId: string,
    classroomName: string,
    grade: string,
  ) => {
    try {
      if (!classroomName || !grade) {
        toast.error(t("toast.attention"), {
          description: t("toast.fillAllFields"),
          richColors: true,
        });
        return;
      }

      const response = await fetch(`/api/classroom/${classroomId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classroomName,
          grade,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update class");
      }

      toast.success(t("toast.success"), {
        description: t("toast.classUpdated"),
        richColors: true,
      });

      setDialogOpen("");
      fetchClassrooms();
    } catch (error) {
      console.error(error);
      toast.error(t("toast.error"), {
        description: t("toast.failedUpdate"),
        richColors: true,
      });
    }
  };

  const handleDeleteClass = async (classroomId: string) => {
    try {
      const res = await fetch(`/api/classroom/${classroomId}`, {
        method: "DELETE",
      });
      if (res.status === 200) {
        toast.success(t("toast.success"), {
          description: t("toast.classDeleted"),
          richColors: true,
        });
        fetchClassrooms();
      } else {
        toast.error(t("toast.error"), {
          description: t("toast.failedDelete"),
          richColors: true,
        });
      }
    } catch (error) {
      console.error(error);
      toast.error(t("toast.error"), {
        description: t("toast.failedDelete"),
        richColors: true,
      });
    } finally {
      setDialogOpen("");
    }
  };

  const handleChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNameChange(e.target.value);
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const columns: ColumnDef<Classes>[] = [
    {
      accessorKey: "name",
      // header: ({ column }) => {
      //   return (
      //     <Button
      //       variant="ghost"
      //       onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      //     >
      //       {/* {tc("className")} */}Class Name
      //       <ChevronsUpDownIcon className="ml-2 h-4 w-4" />
      //     </Button>
      //   );
      // },
      header: () => {
        return <div>{t("table.headers.className")}</div>;
      },
      cell: ({ row }) => {
        const classroomName: string = row.getValue("name");
        const checkImported = row.original.importedFromGoogle;
        return (
          <div className="captoliza flex gap-4">
            {classroomName ? classroomName : "Unknown"}{" "}
            {checkImported ? (
              <Link href={row.original.alternateLink || "#"} target="_blank">
                <Image
                  src={"/96x96_yellow_stroke_icon@1x.png"}
                  alt="google-classroom"
                  width={20}
                  height={20}
                />
              </Link>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: "classCode",
      header: () => {
        return (
          <div className="text-center">{t("table.headers.classCode")}</div>
        );
      },
      cell: ({ row }) => (
        <div className="captoliza text-center">{row.getValue("classCode")}</div>
      ),
    },
    {
      accessorKey: "students.length",
      header: () => {
        return (
          <div className="text-center">{t("table.headers.studentCount")}</div>
        );
      },
      cell: ({ row }) => (
        <div className="captoliza text-center">
          {row.original?.students?.length || 0}
        </div>
      ),
    },
    {
      accessorKey: "grade",
      header: () => {
        return <div className="text-center">{t("table.headers.grade")}</div>;
      },
      cell: ({ row }) => (
        <div className="captoliza text-center">{row.getValue("grade")}</div>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      header: () => {
        return <div className="text-center">{t("table.headers.actions")}</div>;
      },
      cell: ({ row }) => {
        const payment = row.original;
        return (
          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Actions</span>
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/teacher/class-roster/${payment.id}`)
                  }
                >
                  <ClipboardListIcon className="size-4" />
                  {t("actions.roster")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/teacher/reports?classroomId=${payment.id}`)
                  }
                >
                  <ChartColumnBigIcon className="size-4" />
                  {t("actions.reports")}
                </DropdownMenuItem>
                {payment.importedFromGoogle ? null : (
                  <DropdownMenuItem
                    onSelect={() => {
                      setDialogOpen("edit");
                      setNameChange(payment.name);
                      setGrade(payment.grade || "");
                      setClassroomId(payment.id);
                    }}
                  >
                    <PencilIcon className="size-4" />
                    {t("actions.edit")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <ArchiveIcon className="size-4" />
                  {t("actions.archive")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setDialogOpen("delete");
                    setClassroomId(payment.id);
                    setNameChange(payment.name);
                  }}
                >
                  <TrashIcon className="size-4" />
                  {t("actions.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: classrooms,
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

  // const syncClassroom = async () => {
  //   setLoading(true);
  //   try {
  //     const lastUrl = window.location.pathname;
  //     const response = await fetch(
  //       `/api/classroom/oauth2/classroom/courses?redirect=${encodeURIComponent(
  //         lastUrl,
  //       )}`,
  //       {
  //         method: "GET",
  //       },
  //     );

  //     const data = await response.json();

  //     if (response.ok && data.courses) {
  //       const newCourses = data.courses.filter(
  //         (course: Schema$Course) =>
  //           !classrooms.some((cls) => cls.googleClassroomId === course.id),
  //       );
  //       setImportState(0);
  //       setCourses(newCourses);
  //       setCoursesOpen(true);
  //     } else {
  //       window.location.href = data.authUrl;
  //     }
  //   } catch (error) {
  //     console.error("Error fetching courses:", error);
  //   }
  //   setLoading(false);
  // };

  // async function handleImportCourses() {
  //   try {
  //     setImportState(1);
  //     const newCourses = courses.filter((course) => course.id === selected);
  //     setSelectedCourses(newCourses);

  //     const res = await fetch(`/api/classroom`, {
  //       method: "POST",
  //       body: JSON.stringify({ courses: newCourses }),
  //     });

  //     if (res.ok) {
  //       setImportState(2);
  //       fetchClassrooms();
  //     }
  //   } catch (error) {
  //     console.error("Error importing courses:", error);
  //   }
  // }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <Input
            placeholder={t("search.placeholder")}
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
          <div className="flex items-end space-x-2">
            <div className="flex-col space-y-2">
              <p className="text-xs opacity-70">{t("import.fromLabel")}</p>
              <Button
                onClick={() => {
                  // syncClassroom();
                }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2Icon className="mr-2 size-4 animate-spin" />
                    {t("import.googleClassroom")}
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
                    {t("import.googleClassroom")}
                  </>
                )}
              </Button>
            </div>
            <CreateClass onClassCreated={fetchClassrooms} />
          </div>
        </div>
        <div className="rounded-md border">
          <Table>
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
                              header.getContext(),
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
                          cell.getContext(),
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
                    {t("table.empty")}
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
              {t("pagination.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              {t("pagination.next")}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={coursesOpen} onOpenChange={setCoursesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <h1 className="text-2xl">{t("import.dialog.title")}</h1>
            </DialogTitle>
          </DialogHeader>
          <ImportStateSlider currentLevel={importState} />

          <div className="overflow-hidden rounded-lg border shadow-md">
            {importState === 0 && (
              <div className="p-6">
                <h2 className="mb-4 text-xl font-semibold">
                  {t("import.dialog.selectClass")}
                </h2>
                <p className="mb-6">{t("import.dialog.description")}</p>
                <div className="mb-6">
                  <label className="mb-1 block text-sm font-medium">
                    {t("import.dialog.yourClasses")}
                  </label>
                  {/* {courses.length ? (
                    <ScrollArea className="h-52">
                      <RadioGroup value={selected} onValueChange={setSelected}>
                        {courses.map((data: CourseWithCount, i) => (
                          <div
                            key={i}
                            onClick={() => setSelected(data.id as string)}
                            className={cn(
                              "border-muted hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center justify-between rounded-md border-2 bg-transparent p-4",
                              selected === data.id ? "border-primary" : "",
                            )}
                          >
                            <h3 className="font-medium">{data.name}</h3>
                            <div className="flex items-center text-sm text-gray-500">
                              <UsersIcon className="size-4" />
                              <span>
                                {data?.studentCount?.length ?? 0} students
                              </span>
                            </div>
                          </div>
                        ))}
                      </RadioGroup>
                    </ScrollArea>
                  ) : (
                    <p>No courses found</p>
                  )} */}
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-4">
                  <Button
                    className="flex gap-2"
                    variant="outline"
                    // onClick={() => syncClassroom()}
                    disabled={loading}
                  >
                    <RefreshCcwIcon
                      className={cn("size-4", loading ? "animate-spin" : "")}
                    />
                    {t("import.dialog.refresh")}
                  </Button>
                  <Button
                    // onClick={() => handleImportCourses()}
                    disabled={!selected}
                  >
                    {t("import.dialog.continue")}
                  </Button>
                </div>
              </div>
            )}
            {importState === 1 && (
              <div className="flex flex-col items-center justify-center p-6 py-12">
                <div className="mb-4 h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-blue-600"></div>
                <h2 className="mb-2 text-xl font-semibold">
                  {t("import.dialog.syncing")}
                </h2>
                <p className="max-w-md text-center text-gray-600">
                  {t("import.dialog.syncingDescription")}
                </p>
              </div>
            )}
            {importState === 2 && (
              <div className="p-6">
                <div className="mb-6 flex justify-center">
                  <div className="rounded-full bg-green-200 p-3">
                    <CircleCheckBigIcon className="size-10" />
                  </div>
                </div>
                <h2 className="mb-2 text-center text-xl font-semibold">
                  {t("import.dialog.syncCompleted")}
                </h2>
                {/* {selectedCourses.map((course: CourseWithCount) => (
                  <>
                    <p className="mb-6 text-center text-gray-600">
                      Successfully imported {course?.studentCount?.length ?? 0}{" "}
                      students from {course.name}.
                    </p>
                    <div className="mb-6 rounded-md border p-4">
                      <h3 className="mb-2 font-medium">Students Added</h3>
                      {course?.studentCount?.length ? (
                        <ScrollArea className="h-40">
                          <ul className="space-y-2">
                            {course?.studentCount.map((data, index) => (
                              <li key={index} className="flex items-center">
                                <div className="mr-2 flex h-8 w-8 items-center justify-center rounded-full border">
                                  <UserRoundIcon className="size-4" />
                                </div>
                                <span>{data?.profile.name.fullName}</span>
                                <span className="ml-auto text-sm text-green-600">
                                  New
                                </span>
                              </li>
                            ))}
                          </ul>
                        </ScrollArea>
                      ) : (
                        <p>No students found</p>
                      )}
                    </div>
                  </>
                ))} */}

                <div className="flex justify-between border-t border-gray-200 pt-4">
                  <Button
                    className="flex gap-2"
                    variant="outline"
                    onClick={() => {
                      setSelected("");
                      // syncClassroom();
                    }}
                    disabled={loading}
                  >
                    {loading ? (
                      <Icons.spinner className="h-4 w-4 animate-spin" />
                    ) : null}
                    {t("import.dialog.syncAnother")}
                  </Button>
                  <Button
                    onClick={() => {
                      setImportState(0);
                      setSelected("");
                      setCoursesOpen(false);
                    }}
                  >
                    {t("import.dialog.goToClass")}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <div className="rounded-md border p-4">
              <h3 className="mb-1 flex items-center gap-2 font-medium">
                <CircleAlertIcon className="size-4" />{" "}
                {t("import.dialog.aboutTitle")}
              </h3>
              <p className="text-sm">{t("import.dialog.aboutDescription")}</p>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogOpen === "edit"}
        onOpenChange={() => setDialogOpen("")}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("edit.title")}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {t("edit.description")}
            {/* <span className="font-bold">{payment.name}</span> */}
          </DialogDescription>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label>{t("edit.className")}</Label>
              <Input
                type="text"
                className="col-span-3"
                placeholder={t("edit.classNamePlaceholder")}
                value={nameChange}
                onChange={handleChangeName}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label>{t("edit.grade")}</Label>
              <Select value={grade} onValueChange={(value) => setGrade(value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t("edit.gradePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 3).map(
                    (grade, index) => (
                      <SelectItem key={index} value={String(grade)}>
                        {t("edit.gradeItem", { grade })}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => {
                setDialogOpen("");
                handleEditClass(classroomId, nameChange, grade);
              }}
            >
              {t("edit.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={dialogOpen === "delete"}
        onOpenChange={() => setDialogOpen("")}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("delete.title")}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {t("delete.description")}
            {/* <span className="font-bold">{classroomName}</span> */}
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => handleDeleteClass(classroomId)}
            >
              {t("delete.submit")}
            </Button>
            <Button onClick={() => setDialogOpen("")}>
              {t("delete.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ImportStateSlider({ currentLevel }: { currentLevel: number }) {
  const State = [
    { no: 1, name: "Select Class" },
    { no: 2, name: "Syncs Students" },
    { no: 3, name: "Complete" },
  ];
  return (
    <div className="w-full">
      <div className="mb-2 flex justify-between">
        {State.map((level, index) => (
          <div key={index} className="flex flex-col items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                index === currentLevel
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {level.no}
            </div>
            <span>{level.name}</span>
          </div>
        ))}
      </div>
      <div className="bg-muted h-2 rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-all duration-300 ease-in-out"
          style={{
            width: `${(currentLevel / (State.length - 1)) * 100}%`,
          }}
        ></div>
      </div>
    </div>
  );
}
