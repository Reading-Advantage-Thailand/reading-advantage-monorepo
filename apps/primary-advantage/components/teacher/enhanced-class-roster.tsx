"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { MoreVertical, RotateCcw, Search, TrendingUp, TriangleAlert, Users } from "lucide-react";
import { toast } from "sonner";
import { calendarDayNumber } from "@reading-advantage/domain/calendar-day";
import { EmptyState, ErrorState, ShimmerSkeleton } from "@reading-advantage/ui";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCefrLevelColor } from "@/lib/cefr";
import { cn } from "@/lib/utils";
import StudentEnrollmentButton from "./student-enrollment-button";
import StudentUnenrollmentButton from "./student-unenrollment-button";
import ClassroomNavigation from "./classroom-navigation";
import StudentCefrLevelSetter from "./student-cefr-level-setter";
import { ClassLoginPanel } from "./class-login/class-login-panel";
import type { RosterStudent } from "./class-login/api";
import { ClassBookSlot } from "./class-book-slot";
import { TEACHER_ACTION, TEACHER_CARD } from "./teacher-shell";

/** One student of the class, as `/api/classroom/[id]` returns it. */
interface StudentData {
  id: string;
  display_name: string | null;
  email: string | null;
  last_activity: string | null;
  level?: number;
  xp?: number;
  cefrLevel?: string | null;
}

/** The class, as `/api/classroom/[id]` returns it. */
interface ClassroomData {
  id: string;
  classroomName: string;
  grade?: string | number | null;
}

/** Load state of the class data. */
type LoadState = "loading" | "ready" | "error" | "notFound";

/** Translator passed into the row parts. */
type Translator = (key: string, values?: Record<string, string | number>) => string;

/**
 * Says how long ago a student was last active, in Bangkok calendar days.
 * @param lastActivity ISO time of the newest activity, or null.
 * @param t Translator for `Teacher.EnhancedClassRoster`.
 * @param formatDate Formats an older date.
 * @returns The text, for example "Today" or "3 days ago".
 */
function formatLastActivity(lastActivity: string | null, t: Translator, formatDate: (date: Date) => string): string {
  if (!lastActivity) return t("activity.none");
  const date = new Date(lastActivity);
  const days = calendarDayNumber(new Date()) - calendarDayNumber(date);
  if (days <= 0) return t("activity.today");
  if (days === 1) return t("activity.yesterday");
  if (days < 7) return t("activity.daysAgo", { count: days });
  if (days < 30) return t("activity.weeksAgo", { count: Math.floor(days / 7) });
  return formatDate(date);
}

/**
 * The teacher class page (Lane C Phase 3): the class heading, the class sign-in card, one student
 * list, and the class book slot. The student list is the Lane B live roster (sign-in status,
 * lockouts, picture and card actions); each row also has the roster management parts from
 * `/api/classroom/[id]` (CEFR, level, XP, last activity, progress link, CEFR setting and progress
 * reset, remove). When the live roster cannot load, a plain list with the management parts takes
 * its place, so enroll and remove still work.
 * @param props.classroomId The class (read from the route when empty).
 * @param props.classBook The class book card from the server; the placeholder slot when absent.
 * @param props.classQuest The class quest card from the server (Class Quest FR-4).
 * @returns The class page body.
 */
export default function EnhancedClassRoster({ classroomId: classroomIdProp, classBook, classQuest }: { classroomId?: string; classBook?: ReactNode; classQuest?: ReactNode } = {}) {
  const params = useParams();
  const classroomId = classroomIdProp ?? (params?.classroomId as string);
  const t = useTranslations("Teacher.EnhancedClassRoster");
  const tc = useTranslations("TeacherClass");
  const te = useTranslations("Error");
  const tLogin = useTranslations("ClassLogin");
  const format = useFormatter();

  const [state, setState] = useState<LoadState>("loading");
  const [classroom, setClassroom] = useState<ClassroomData | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [rosterVersion, setRosterVersion] = useState(0);
  const [resetStudentId, setResetStudentId] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const fetchClassroomData = useCallback(async () => {
    if (!classroomId) return;
    try {
      const response = await fetch(`/api/classroom/${classroomId}`);
      if (response.status === 404) {
        setState("notFound");
        return;
      }
      if (!response.ok) throw new Error(`Failed to fetch classroom data: ${response.status}`);
      const data = await response.json();
      setClassroom(data.classroom);
      setStudents(data.studentInClass || []);
      setState("ready");
    } catch (error) {
      console.error("Error fetching classroom data:", error);
      setState((current) => (current === "ready" ? current : "error"));
      toast.error(t("toast.loadClassroomError"));
    }
  }, [classroomId, t]);

  useEffect(() => {
    void fetchClassroomData();
  }, [fetchClassroomData]);

  /** Reads the class and the live roster again after an enroll, a removal, or a level change. */
  const refreshAll = useCallback(() => {
    void fetchClassroomData();
    setRosterVersion((version) => version + 1);
  }, [fetchClassroomData]);

  const handleResetProgress = async () => {
    if (!resetStudentId) return;
    setResetLoading(true);
    try {
      const response = await fetch(`/api/users/${resetStudentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xp: 0, level: 1, cefrLevel: "A0" }),
      });
      if (!response.ok) throw new Error("Failed to reset progress");
      toast.success(t("toast.resetSuccess"));
      await fetchClassroomData();
    } catch (error) {
      console.error("Error resetting progress:", error);
      toast.error(t("toast.resetError"));
    } finally {
      setResetLoading(false);
      setResetStudentId("");
    }
  };

  if (state === "notFound") {
    return (
      <EmptyState
        className="bg-card border"
        titleAs="h1"
        icon={<Users />}
        title={t("notFound.title")}
        description={t("notFound.description")}
        action={
          <Link href="/teacher/class-roster" className={cn(buttonVariants({ variant: "outline" }), TEACHER_ACTION, "px-5")}>
            {t("actions.backToRoster")}
          </Link>
        }
      />
    );
  }

  const byId = new Map(students.map((student) => [student.id, student]));
  const className = classroom?.classroomName ?? "";
  const formatDate = (date: Date) => format.dateTime(date, { day: "numeric", month: "short", year: "numeric" });
  const parts = (student: StudentData, name: string) => ({
    details: (
      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-normal">
        {student.cefrLevel ? (
          <Badge variant="secondary" className={cn("text-xs", getCefrLevelColor(student.cefrLevel))}>
            {student.cefrLevel}
          </Badge>
        ) : null}
        {student.level ? <span className="text-muted-foreground text-xs">{tc("level", { level: student.level })}</span> : null}
        {student.xp ? <span className="text-muted-foreground text-xs">{tc("xp", { xp: student.xp })}</span> : null}
        <span className="text-muted-foreground w-full text-xs">
          {tc("lastActive", { when: formatLastActivity(student.last_activity, t, formatDate) })}
        </span>
      </span>
    ),
    actions: (
      <StudentActions
        student={student}
        name={name}
        classroomId={classroomId}
        classroomName={className}
        onRequestReset={setResetStudentId}
        onChange={refreshAll}
      />
    ),
  });
  const extras = (row: RosterStudent) => {
    const student = byId.get(row.userId);
    return student ? parts(student, student.display_name || row.name) : {};
  };

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 basis-56">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden="true" />
        <Input
          type="search"
          aria-label={tc("searchStudents")}
          placeholder={t("students.searchPlaceholder")}
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="min-h-11 pl-10"
        />
      </div>
      {classroom ? (
        <StudentEnrollmentButton
          classroomId={classroom.id}
          classroomName={className}
          onStudentEnrolled={refreshAll}
          buttonText={t("students.enrollButton")}
        />
      ) : null}
    </div>
  );

  // The live roster failed: a plain list keeps the management actions (enroll, remove, progress).
  const query = searchTerm.trim().toLowerCase();
  const fallbackRows = students.filter(
    (student) => !query || student.display_name?.toLowerCase().includes(query) || student.email?.toLowerCase().includes(query),
  );
  const fallback = (
    <section className={TEACHER_CARD}>
      <h2 className="text-lg font-semibold">{tLogin("roster.heading")}</h2>
      {toolbar}
      {fallbackRows.length === 0 ? (
        <p className="text-muted-foreground">{query ? tc("noMatch") : t("students.empty.description")}</p>
      ) : (
        <ul>
          {fallbackRows.map((student) => (
            <ManagementRow key={student.id} name={student.display_name || t("labels.noName")} {...parts(student, student.display_name || t("labels.noName"))} />
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="flex flex-col gap-6">
      {state === "ready" && classroom ? (
        <ClassroomNavigation
          classroom={{
            id: classroom.id,
            name: className,
            grade: classroom.grade ? String(classroom.grade) : undefined,
            studentCount: students.length,
          }}
        />
      ) : state === "error" ? (
        <ErrorState
          className="bg-card border"
          icon={<TriangleAlert />}
          title={tc("loadError")}
          description={tc("loadErrorHint")}
          action={
            <Button
              type="button"
              className={cn(TEACHER_ACTION, "px-6")}
              onClick={() => {
                setState("loading");
                void fetchClassroomData();
              }}
            >
              {te("retry")}
            </Button>
          }
        />
      ) : (
        <div aria-busy="true" className="flex flex-col gap-2">
          <ShimmerSkeleton className="h-5 w-40" />
          <ShimmerSkeleton className="h-8 w-56" />
        </div>
      )}

      <ClassLoginPanel
        classroomId={classroomId}
        renderStudentExtras={extras}
        rosterFilter={searchTerm}
        rosterFilterEmpty={tc("noMatch")}
        rosterToolbar={toolbar}
        rosterFallback={fallback}
        rosterVersion={rosterVersion}
      />

      {classBook ?? <ClassBookSlot classroomId={classroomId} />}
      {classQuest}

      <AlertDialog open={resetStudentId !== ""} onOpenChange={(open) => !open && setResetStudentId("")}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("resetDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("resetDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetProgress} disabled={resetLoading} className="bg-orange-700 hover:bg-orange-800">
              <RotateCcw className="mr-2 size-4" aria-hidden="true" />
              {t("actions.resetProgress")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * One student of the fallback list: the name and the management details, then the actions.
 * @param props The name, the details, and the actions.
 * @returns The list item.
 */
function ManagementRow({ name, details, actions }: { name: string; details: ReactNode; actions: ReactNode }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-2 border-t py-3 first:border-t-0">
      <div className="flex min-w-0 flex-col">
        <span className="font-medium break-words">{name}</span>
        {details}
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </li>
  );
}

/**
 * Roster management actions of one student: the progress link, a menu (CEFR level, progress
 * reset), and remove from the class. Each has a 44 px tap target and a name with the student.
 * @param props The student, the display name, the class, and the callbacks.
 * @returns The actions.
 */
function StudentActions({
  student,
  name,
  classroomId,
  classroomName,
  onRequestReset,
  onChange,
}: {
  student: StudentData;
  name: string;
  classroomId: string;
  classroomName: string;
  onRequestReset: (studentId: string) => void;
  onChange: () => void;
}) {
  const t = useTranslations("Teacher.EnhancedClassRoster");
  const tc = useTranslations("TeacherClass");
  return (
    <>
      <Link
        href={`/teacher/student-progress/${student.id}?classroomId=${classroomId}`}
        aria-label={tc("progressFor", { name })}
        className={cn(buttonVariants({ variant: "outline" }), TEACHER_ACTION, "px-3")}
      >
        <TrendingUp aria-hidden="true" />
        {tc("progress")}
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={cn(TEACHER_ACTION, "min-w-11 px-0")} aria-label={tc("moreFor", { name })}>
            <MoreVertical className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div>
            <StudentCefrLevelSetter
              studentId={student.id}
              studentName={name || t("labels.studentDefault")}
              currentCefrLevel={student.cefrLevel || "A0-"}
              onUpdate={onChange}
            />
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onRequestReset(student.id)} className="text-orange-700">
            <RotateCcw className="mr-1 size-4" aria-hidden="true" />
            {t("actions.resetProgress")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <StudentUnenrollmentButton
        student={{ id: student.id, name, email: student.email }}
        classroomId={classroomId}
        classroomName={classroomName}
        onStudentUnenrolled={onChange}
        ariaLabel={tc("removeFor", { name })}
        className={cn(TEACHER_ACTION, "min-w-11")}
      />
    </>
  );
}
