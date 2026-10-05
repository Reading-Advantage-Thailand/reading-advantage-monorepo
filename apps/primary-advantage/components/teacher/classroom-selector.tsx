"use client";

import { useCallback, useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { BookOpen, PlayIcon, TriangleAlertIcon, Users } from "lucide-react";
import { EmptyState, ErrorState, ShimmerSkeleton, cardHoverClassName } from "@reading-advantage/ui";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import CreateNewClass from "./create-classes";
import { TEACHER_ACTION, TEACHER_CARD } from "./teacher-shell";

/** One class, as `/api/classroom` returns it. */
interface Classroom {
  id: string;
  name: string;
  grade?: string | number | null;
  classCode?: string | null;
  createdAt: string;
  students: unknown[];
}

/**
 * Class roster index: a card per class with the class name (a real link to the class page), the
 * grade, the student count, the class code, the created date (Bangkok calendar date), and
 * "Start class" (the class page at its sign-in panel). Loading shows shimmer cards; a failed
 * load shows an error with a retry; no class shows an empty state with "New Classroom".
 * @returns The class cards.
 */
export default function ClassroomSelector() {
  const t = useTranslations("Teacher.ClassroomSelector");
  const tc = useTranslations("TeacherClass");
  const tUi = useTranslations("TeacherUi");
  const te = useTranslations("Error");
  const format = useFormatter();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const fetchClassrooms = useCallback(async () => {
    try {
      const response = await fetch("/api/classroom");
      if (!response.ok) throw new Error(`Failed to fetch classrooms: ${response.status}`);
      const data = await response.json();
      setClassrooms(data.classrooms || []);
      setState("ready");
    } catch (error) {
      console.error("Error fetching classrooms:", error);
      setState("error");
    }
  }, []);

  useEffect(() => {
    void fetchClassrooms();
  }, [fetchClassrooms]);

  if (state === "loading") {
    return (
      <div aria-busy="true" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((card) => (
          <ShimmerSkeleton key={card} className="h-44 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (state === "error") {
    return (
      <ErrorState
        className="bg-card border"
        icon={<TriangleAlertIcon />}
        title={tc("loadClassesError")}
        description={tc("loadErrorHint")}
        action={
          <Button
            type="button"
            className={cn(TEACHER_ACTION, "px-6")}
            onClick={() => {
              setState("loading");
              void fetchClassrooms();
            }}
          >
            {te("retry")}
          </Button>
        }
      />
    );
  }

  if (classrooms.length === 0) {
    return (
      <EmptyState
        className="bg-card border"
        icon={<BookOpen />}
        title={t("empty.title")}
        description={t("empty.description")}
        action={<CreateNewClass buttonText={t("empty.createFirst")} onClassCreated={fetchClassrooms} />}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <CreateNewClass buttonText={t("actions.newClassroom")} onClassCreated={fetchClassrooms} />
      </div>
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {classrooms.map((classroom) => (
          <li key={classroom.id} className={cn(TEACHER_CARD, cardHoverClassName)}>
            <div className="flex flex-col gap-1">
              <Link
                href={`/teacher/class-roster/${classroom.id}`}
                className={cn(TEACHER_ACTION, "inline-flex items-center text-lg font-semibold break-words underline-offset-4 hover:underline")}
              >
                {classroom.name}
              </Link>
              {classroom.grade ? <p className="text-muted-foreground text-sm">{t("grade", { grade: classroom.grade })}</p> : null}
            </div>
            <p className="flex items-center gap-2 text-sm">
              <Users className="size-4" aria-hidden="true" />
              <span>{t("studentsCount", { count: classroom.students.length })}</span>
            </p>
            {classroom.classCode ? <p className="text-muted-foreground font-mono text-sm">{classroom.classCode}</p> : null}
            <p className="text-muted-foreground text-xs">
              {t("createdAt", { date: format.dateTime(new Date(classroom.createdAt), { day: "numeric", month: "short", year: "numeric" }) })}
            </p>
            <div className="mt-auto flex flex-wrap gap-2 pt-1">
              <Link
                href={`/teacher/class-roster/${classroom.id}#class-login`}
                aria-label={tUi("startClassFor", { name: classroom.name })}
                className={cn(buttonVariants({ variant: "default" }), TEACHER_ACTION, "px-4")}
              >
                <PlayIcon aria-hidden="true" />
                {tUi("startClass")}
              </Link>
              <Link
                href={`/teacher/class-roster/${classroom.id}`}
                aria-label={tc("openClassFor", { name: classroom.name })}
                className={cn(buttonVariants({ variant: "outline" }), TEACHER_ACTION, "px-4")}
              >
                {tc("openClass")}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
