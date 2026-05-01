"use client";
import React, { useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { useScopedI18n } from "@/locales/client";
import { last } from "lodash";
import { Timestamp } from "firebase-admin/firestore";

type Student = {
  id: string;
  last_activity: { _seconds?: number } | "No Activity";
  email: string;
};

type Classrooms = {
  id: string;
  classroomName: string;
};

type CreateNewStudentProps = {
  allStudentEmail: Student[];
  classrooms: Classrooms;
  studentDataInClass: Student[];
};

export default function CreateNewStudent({
  studentDataInClass,
  allStudentEmail,
  classrooms,
}: CreateNewStudentProps) {
  const router = useRouter();
  const [inputs, setInputs] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const t = useScopedI18n("components.classRoster.addNewStudent");

  const handleAddStudent = async (
    classroomId: string,
    email: FormDataEntryValue[]
  ) => {
    for (const emailValue of email) {
      if (studentDataInClass.some((student) => student.email === emailValue)) {
        toast({
          title: t("toast.studentAlreadyInClass"),
          description: t("toast.studentAlreadyInClassDescription"),
          variant: "destructive",
        });
        continue;
      }

      const studentToAdd = allStudentEmail.find(
        (student: { email: string }) => student.email === emailValue
      );

      if (!studentToAdd) {
        toast({
          title: t("toast.emailNotFound"),
          description: t("toast.emailNotFoundDescription"),
          variant: "destructive",
        });
        continue;
      }

      const updatedStudentList = [...studentDataInClass, studentToAdd];

      const updateStudentListBuilder = updatedStudentList.map((item) => ({
        studentId: item.id,
        lastActivity:
          typeof item.last_activity === "object" &&
          "_seconds" in item.last_activity
            ? new Date(item.last_activity._seconds! * 1000).toISOString()
            : "No Activity",
      }));

      try {
        const response = await fetch(
          `/api/v1/classroom/${classroomId}/enroll`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              student: updateStudentListBuilder,
            }),
          }
        );
        if (response.ok) {
          toast({
            title: t("toast.successAddStudent"),
            description: t("toast.successAddStudentDescription"),
            variant: "default",
          });
          router.push(`/teacher/class-roster/${classroomId}`);
        } else {
          toast({
            title: t("toast.errorAddStudent"),
            description: t("toast.errorAddStudentDescription"),
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: t("toast.errorAddStudent"),
          description: t("toast.errorAddStudentDescription"),
          variant: "destructive",
        });
      } finally {
        router.refresh();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formRef.current) {
      const formEmail = new FormData(formRef.current);
      const entriesArray = Array.from(formEmail.entries());
      const emails = entriesArray
        .map(([key, value]) => value)
        .filter((value) => value);
      handleAddStudent(classrooms.id, emails);
    }
  };

  return (
    <div>
      <Card className="flex flex-col items-center justify-center">
        <CardTitle className="mt-10 mb-4 text-3xl ">
          {t("title", { className: classrooms.classroomName })}
        </CardTitle>
        <CardDescription className="text-base mb-4">
          {t("description")}
        </CardDescription>
        <form ref={formRef} onSubmit={handleSubmit}>
          <CardContent className="flex flex-col items-center mb-8 overflow-auto md:w-full">
            <Card className="my-4 flex flex-col items-center justify-center">
              <div className="flex justify-center items-center mt-8 w-[90%]">
                <label htmlFor="email" className="text-base">
                  {t("email")}
                </label>
                <Input
                  type="email"
                  name="email"
                  placeholder={t("placeholder")}
                  className="  p-2 m-2 focus:outline-none focus:border-transparent"
                />
              </div>
              {Array.from({ length: inputs }).map((_: any, index: number) => (
                <Input
                  key={index}
                  type="email"
                  name="email"
                  placeholder={t("placeholder")}
                  className="  p-2 m-2 ml-12 focus:outline-none focus:border-transparent w-[77%]"
                />
              ))}
              <Link
                href=""
                className="flex justify-end m-4 p-4 text-[#3882fd] cursor-pointer"
                onClick={() => {
                  setInputs((prevInputs) => prevInputs + 1);
                }}
              >
                {t("addStudent")} <Icons.addUser className="w-5 ml-2" />
              </Link>
              <CardDescription className="text-center w-full m-4 p-4 mr-8 text-red-500 mb-16">
                {t("warning")}
              </CardDescription>
            </Card>
            <Button type="submit" variant={"default"} className=" mt-2">
              {t("saveButton")}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
