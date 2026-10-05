"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeftIcon, TriangleAlertIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { errorKey, postStudentLogin, type ClassLoginErrorKey } from "./api";
import { PrintStyles } from "./print-styles";
import { TEACHER_BACK_LINK, TEACHER_CARD, TeacherPageHeader } from "../teacher-shell";

/** Result of the class password reset route. */
interface ClassSheetResult {
  classroomName: string;
  students: { userId: string; name: string; username: string; password: string }[];
  failed: { userId: string; name: string }[];
}

/** Props of {@link ClassSheet}. */
export interface ClassSheetProps {
  /** The class to make the sheet for. */
  classroomId: string;
}

/**
 * Class sheet print page (FR-6). After a confirmation it sets new initial passwords for the whole
 * class (the server keeps only hashes, so an old password cannot be shown again) and shows a
 * printable sheet with each student's name, username, and new password. The page changes
 * nothing on load.
 * @param props The class.
 * @returns The class sheet page body.
 */
export function ClassSheet({ classroomId }: ClassSheetProps) {
  const t = useTranslations("ClassLogin");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ClassLoginErrorKey | null>(null);
  const [sheet, setSheet] = useState<(ClassSheetResult & { signInUrl: string }) | null>(null);

  async function makeSheet() {
    setBusy(true);
    setError(null);
    try {
      const result = await postStudentLogin<ClassSheetResult>("class-passwords/reset", { classroomId });
      setSheet({ ...result, signInUrl: `${window.location.origin}/auth/signin` });
    } catch (caught) {
      setError(errorKey(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <TeacherPageHeader
        back={
          <Link href={`/teacher/class-roster/${classroomId}`} className={TEACHER_BACK_LINK}>
            <ArrowLeftIcon aria-hidden="true" />
            {t("backToClass")}
          </Link>
        }
        title={t("sheet.title")}
        description={t("sheet.intro")}
      />
      <div className={TEACHER_CARD}>
        <p className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <TriangleAlertIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          {t("sheet.warning")}
        </p>
        <div className="flex flex-wrap gap-2">
          {/* Danger style: the action resets the password of every student in the class. */}
          <Button variant="destructive" className="min-h-12" disabled={busy} onClick={() => setConfirming(true)}>
            {t("sheet.make")}
          </Button>
          {sheet && (
            <Button variant="outline" className="min-h-12" onClick={() => window.print()}>
              {t("sheet.print")}
            </Button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {t(`errors.${error}`)}
        </p>
      )}
      {sheet && sheet.failed.length > 0 && (
        <p role="alert" className="text-destructive text-sm">
          {t("sheet.failed", { names: sheet.failed.map((s) => s.name).join(", ") })}
        </p>
      )}
      {sheet && (
        <>
          <p className="text-muted-foreground text-sm">{t("sheet.once")}</p>
          <PrintStyles />
          <div data-print-area className="space-y-3 bg-white text-black">
            <h2 className="text-xl font-semibold">{sheet.classroomName}</h2>
            <p>
              {t("sheet.signInAt")} <span className="font-mono">{sheet.signInUrl}</span>
            </p>
            <table className="w-full border-collapse text-base">
              <thead>
                <tr className="border-b-2 text-left">
                  <th scope="col" className="py-2 pr-4">{t("sheet.name")}</th>
                  <th scope="col" className="py-2 pr-4">{t("sheet.username")}</th>
                  <th scope="col" className="py-2">{t("sheet.password")}</th>
                </tr>
              </thead>
              <tbody>
                {sheet.students.map((student) => (
                  <tr key={student.userId} className="break-inside-avoid border-b border-dashed">
                    <td className="py-3 pr-4">{student.name}</td>
                    <td className="py-3 pr-4 font-mono">{student.username}</td>
                    <td className="py-3 font-mono">{student.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sheet.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("sheet.warning")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("sheet.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void makeSheet()}>{t("sheet.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
