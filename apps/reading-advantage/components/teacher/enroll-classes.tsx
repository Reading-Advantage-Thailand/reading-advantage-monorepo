"use client";
import React, { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { CaretSortIcon } from "@radix-ui/react-icons";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useScopedI18n } from "@/locales/client";
import { useParams, useRouter } from "next/navigation";
import { toast } from "../ui/use-toast";
import { Header } from "../header";
import TeacherDataTable from "./teacher-data-table";

type Student = {
  id: string;
  email: string;
  display_name: string;
  last_activity?: string;
};

type StudentInClass = {
  studentId: string;
  lastActivity: string;
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
  student?: StudentInClass[];
  archived: boolean;
  teacherId: string;
};

type MyEnrollProps = {
  classroom: Classroom[];
  student: Student;
};

type MyEnrollClassesProps = {
  mode: "enroll" | "unenroll";
};

export default function MyEnrollClasses({ mode }: MyEnrollClassesProps) {
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const te = useScopedI18n(
    mode === "enroll"
      ? "components.myStudent.enrollPage"
      : "components.myStudent.unEnrollPage"
  );
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<MyEnrollProps>();
  const patchPath = mode === "enroll" ? `/enroll` : `/unenroll`;

  const handleSubmit = async () => {
    if (!selectedClassroomId) {
      toast({
        title: te("toast.errorEnrollment"),
        description: "Please select a classroom first.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/v1/classroom/${selectedClassroomId}${patchPath}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body:
            mode === "enroll"
              ? JSON.stringify({
                  student: [
                    {
                      studentId: params.studentId,
                      lastActivity: data?.student.last_activity
                        ? data.student.last_activity
                        : "No Activity",
                    },
                  ],
                })
              : JSON.stringify({
                  studentId: params.studentId,
                }),
        }
      );

      if (!response.ok) {
        if (mode === "enroll") {
          const result = await response.json();
          if (result.error === "ALREADY_ENROLLED") {
            toast({
              title: "ไม่สามารถเพิ่มนักเรียนได้",
              description: result.message,
              variant: "destructive",
            });
            setIsSubmitting(false);
            return;
          }
        }
        toast({
          title: te("toast.errorEnrollment"),
          description: te("toast.errorEnrollDescription"),
          variant: "destructive",
        });
        setIsSubmitting(false);
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
      console.error(
        `Error during ${mode === "enroll" ? "enrollment" : "unenrollment"}:`,
        error
      );
      toast({
        title: te("toast.errorEnrollment"),
        description: te("toast.errorEnrollDescription"),
        variant: "destructive",
      });
      setIsSubmitting(false);
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
          <div className="ml-4" onClick={() => row.toggleSelected()}>
            {mode === "enroll"
              ? classroomName
                ? classroomName
                : "Anonymous"
              : classroomName || "Unknown"}
          </div>
        );
      },
    },
    {
      accessorKey: "id",
      header: () => {
        return (
          <div className={mode === "unenroll" ? "text-center" : undefined}>
            {te(mode === "enroll" ? "enroll" : "unEnroll")}
          </div>
        );
      },
      cell: ({ row }) => (
        <div className={mode === "enroll" ? "ml-2" : "text-center"}>
          <RadioGroupItem value={row.original.id} />
        </div>
      ),
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      await fetch(
        `/api/v1/classroom/students/${mode}?studentId=${params.studentId}`,
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
      <TeacherDataTable
        data={data?.classroom || []}
        columns={columns}
        searchColumn="classroomName"
        searchPlaceholder={te("search")}
        tableFixed
        headerClassName="font-bold"
        tableWrapper={(table) => (
          <RadioGroup
            value={selectedClassroomId}
            onValueChange={setSelectedClassroomId}
          >
            {table}
          </RadioGroup>
        )}
        toolbar={
          <Button
            variant="default"
            className="max-w-sm"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedClassroomId}
          >
            {isSubmitting
              ? mode === "enroll"
                ? "Adding..."
                : "Removing..."
              : te(mode === "enroll" ? "add" : "remove")}
          </Button>
        }
      />
    </div>
  );
}
