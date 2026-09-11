"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import ClassroomStudentTable from "../classroom-student-table";

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

  const data = React.useMemo(() => studentInClass || [], [studentInClass]);

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

  const addStudentButton = (
    <Button
      variant="outline"
      onClick={() => {
        if (classroomId) {
          router.push(`/teacher/class-roster/${classroomId}/create-new-student`);
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
  );

  const syncStudentsButton = (
    <Button
      onClick={() =>
        classes.googleClassroomId && syncStudents(classes.googleClassroomId)
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
  );

  const rosterToolbar =
    selectedClassroom &&
    classroomId &&
    classes &&
    Object.keys(classes).length > 0 &&
    !classes.importedFromGoogle
      ? addStudentButton
      : classes && Object.keys(classes).length > 0 && classes.importedFromGoogle
        ? syncStudentsButton
      : addStudentButton;

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
      <ClassroomStudentTable
        students={data}
        variant="roster"
        classrooms={classrooms}
        toolbar={rosterToolbar}
        onResetProgress={(studentId) => {
          setIsResetModalOpen(true);
          setSelectedStudentId(studentId);
        }}
      />
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
