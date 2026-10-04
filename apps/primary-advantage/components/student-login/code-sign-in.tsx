"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClassLoginApiError, postStudentLogin } from "@/components/teacher/class-login/api";
import { cn } from "@/lib/utils";
import { StudentErrorMessage, waitMinutes, type StudentError } from "./errors";
import { PICTURE_PASSWORD_LENGTH, PictureGrid } from "./picture-grid";
import { useEnterAfterSignIn } from "./use-student-home";

/** Number of characters in a class code. */
const CODE_LENGTH = 6;

/** One row of the name list: an opaque handle, a first name, and an avatar key. No other data. */
interface ClassName {
  studentId: string;
  displayName: string;
  avatar: string;
}

/** Result of the code route. */
interface NameList {
  picturePasswordRequired: boolean;
  students: ClassName[];
}

// Background of the avatar placeholder, by the color word of the server avatar key ("red-circle").
const AVATAR_COLORS: Record<string, string> = {
  red: "bg-red-600",
  blue: "bg-blue-600",
  green: "bg-green-700",
  yellow: "bg-yellow-700",
  purple: "bg-purple-600",
  orange: "bg-orange-600",
  pink: "bg-pink-600",
  teal: "bg-teal-700",
  brown: "bg-amber-800",
  gray: "bg-gray-600",
  lime: "bg-lime-700",
  navy: "bg-blue-900",
};

/** Avatar placeholder: the first letter of the name on a color. Decorative, so screen readers skip it. */
function Avatar({ name, avatar }: { name: string; avatar: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white",
        AVATAR_COLORS[avatar.split("-")[0] ?? ""] ?? "bg-slate-600",
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

/** Maps a failed student-login call to the message for the student. */
function errorFor(caught: unknown): StudentError {
  if (!(caught instanceof ClassLoginApiError)) return { key: "generic" };
  if (caught.status === 429) return { key: "rateLimited", minutes: waitMinutes(caught.retryAfterSeconds) };
  if (caught.status === 423) return { key: "locked", minutes: waitMinutes(caught.retryAfterSeconds) };
  if (caught.status === 400 || caught.code === "invalid_code") return { key: "codeInvalid" };
  if (caught.code === "invalid_credentials") return { key: "wrongPictures" };
  return { key: "generic" };
}

/**
 * Student sign-in with the class code (FR-2, FR-3, FR-7). Step 1: the student types the code
 * that the teacher shows. Step 2: the student taps a first name in the class name list. Step 3:
 * the student taps the 3 pictures in order. When the class turned the picture password off, the
 * name tap signs in at once (`code_only`). A code that ends during the steps returns to step 1.
 * After the sign-in the student home opens.
 * @returns The sign-in steps.
 */
export function CodeSignIn() {
  const t = useTranslations("StudentSignIn");
  const enter = useEnterAfterSignIn();
  const inputId = useId();
  const [input, setInput] = useState("");
  const [code, setCode] = useState("");
  const [list, setList] = useState<NameList | null>(null);
  const [student, setStudent] = useState<ClassName | null>(null);
  const [pictures, setPictures] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<StudentError | null>(null);
  const [lockedUntil, setLockedUntil] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const firstStep = useRef(true);
  const step = !list ? "code" : !student ? "names" : "pictures";

  // Move focus to the heading of a new step, so keyboard and screen reader users start at its top.
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);

  // Open the pictures again when the lockout ends.
  useEffect(() => {
    if (!lockedUntil) return;
    const timer = setTimeout(() => {
      setLockedUntil(0);
      setError(null);
    }, Math.max(0, lockedUntil - Date.now()));
    return () => clearTimeout(timer);
  }, [lockedUntil]);

  function fail(caught: unknown) {
    const next = errorFor(caught);
    if (next.key === "codeInvalid") {
      setList(null);
      setStudent(null);
    }
    if (caught instanceof ClassLoginApiError && caught.status === 423) {
      setLockedUntil(Date.now() + (caught.retryAfterSeconds ?? 60) * 1000);
    }
    setPictures([]);
    setError(next);
    setBusy(false);
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = input.replace(/\s+/g, "").toUpperCase();
    if (value.length !== CODE_LENGTH) {
      setError({ key: "codeFormat" });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const names = await postStudentLogin<NameList>("code", { code: value });
      setCode(value);
      setList(names);
      setBusy(false);
    } catch (caught) {
      fail(caught);
    }
  }

  async function chooseName(next: ClassName) {
    setError(null);
    if (!list || list.picturePasswordRequired) {
      setStudent(next);
      return;
    }
    setBusy(true);
    try {
      await postStudentLogin("code-only", { code, studentId: next.studentId });
      await enter();
    } catch (caught) {
      if (caught instanceof ClassLoginApiError && caught.status === 403) {
        // The teacher turned the picture password on after the list loaded.
        setList({ ...list, picturePasswordRequired: true });
        setStudent(next);
        setBusy(false);
        return;
      }
      fail(caught);
    }
  }

  async function tapPictures(next: number[]) {
    setPictures(next);
    setError(null);
    if (!student || next.length < PICTURE_PASSWORD_LENGTH) return;
    setBusy(true);
    try {
      await postStudentLogin("picture", { code, studentId: student.studentId, pictures: next });
      await enter();
    } catch (caught) {
      fail(caught);
    }
  }

  function backToNames() {
    setStudent(null);
    setPictures([]);
    setLockedUntil(0);
    setError(null);
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {step === "code" && (
        <form onSubmit={submitCode} noValidate className="flex flex-col gap-4">
          <div className="text-center">
            <h1 ref={heading} tabIndex={-1} className="text-2xl font-bold">
              {t("code.title")}
            </h1>
            <p className="text-muted-foreground text-base">{t("code.help")}</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={inputId} className="text-base">
              {t("code.label")}
            </Label>
            <Input
              id={inputId}
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                setError(null);
              }}
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              maxLength={12}
              disabled={busy}
              aria-invalid={error?.key === "codeFormat" || error?.key === "codeInvalid"}
              className="h-14 text-center font-mono text-2xl tracking-widest uppercase"
            />
          </div>
          <StudentErrorMessage error={error} />
          <Button type="submit" size="lg" className="min-h-12 w-full text-lg motion-reduce:transition-none" disabled={busy}>
            {busy ? t("code.checking") : t("code.next")}
          </Button>
        </form>
      )}

      {step === "names" && list && (
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <h1 ref={heading} tabIndex={-1} className="text-2xl font-bold">
              {t("names.title")}
            </h1>
            <p className="text-muted-foreground text-base">{t("names.help")}</p>
          </div>
          {list.students.length === 0 ? (
            <p className="text-center">{t("names.empty")}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 p-1 sm:grid-cols-3 md:max-h-96 md:overflow-y-auto">
              {list.students.map((row) => (
                <li key={row.studentId}>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto min-h-14 w-full justify-start gap-3 px-3 py-2 text-lg motion-reduce:transition-none"
                    disabled={busy}
                    onClick={() => chooseName(row)}
                  >
                    <Avatar name={row.displayName} avatar={row.avatar} />
                    <span className="truncate">{row.displayName}</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <StudentErrorMessage error={error} />
          <Button
            type="button"
            variant="ghost"
            className="min-h-12 text-base motion-reduce:transition-none"
            disabled={busy}
            onClick={() => {
              setList(null);
              setError(null);
            }}
          >
            {t("names.back")}
          </Button>
        </div>
      )}

      {step === "pictures" && student && (
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <h1 ref={heading} tabIndex={-1} className="text-2xl font-bold">
              {t("pictures.title", { name: student.displayName })}
            </h1>
            <p className="text-muted-foreground text-base">{t("pictures.help")}</p>
          </div>
          <PictureGrid value={pictures} onChange={tapPictures} disabled={busy || lockedUntil > 0} />
          {busy && <p className="text-center">{t("pictures.signingIn")}</p>}
          <StudentErrorMessage error={error} />
          <Button
            type="button"
            variant="ghost"
            className="min-h-12 text-base motion-reduce:transition-none"
            disabled={busy}
            onClick={backToNames}
          >
            {t("pictures.back")}
          </Button>
        </div>
      )}
    </div>
  );
}
