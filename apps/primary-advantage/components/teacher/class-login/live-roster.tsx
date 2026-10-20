"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useIntlFormatter } from "@/lib/intl-locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PictureSequence } from "@/components/student-login/pictures";
import { cardSignInUrl } from "@/lib/student-login/card-url";
import { errorKey, postStudentLogin, type ClassLoginErrorKey, type Lockout, type RosterStudent } from "./api";
import { PrintStyles } from "./print-styles";
import { QrCard } from "./qr-card";
import { RotateCardConfirm } from "./rotate-card-confirm";

/** Props of {@link LiveRoster}. */
export interface LiveRosterProps {
  /** The class shown. */
  classroomId: string;
  /** The class name, printed on a new card. */
  classroomName: string;
  /** Students from the live roster. */
  students: RosterStudent[];
  /** Locked students from the lockouts route. */
  locked: Lockout[];
  /** Time of the last roster read, in milliseconds. "Last seen" and "time left" count from it. */
  fetchedAt: number;
  /** Reads the roster again after an action. */
  onChange: () => Promise<void> | void;
  /**
   * Extra parts of a student row from the class page (Lane C): `details` under the name (level,
   * CEFR, last activity) and `actions` after the sign-in actions (progress, more, remove).
   */
  renderStudentExtras?: (student: RosterStudent) => { details?: ReactNode; actions?: ReactNode };
  /** Shows only the students whose name or username contains this text. The summary counts all. */
  filter?: string;
  /** Text when the filter matches no student. */
  filterEmpty?: ReactNode;
  /** Controls above the table, for example search and enroll. */
  toolbar?: ReactNode;
}

/**
 * Live sign-in roster for the teacher (FR-4): who is signed in and when each student was last
 * seen, who is locked and for how long, one-tap picture-password reset (FR-3), card rotate
 * (FR-5), and a new password for one student (PR review 2026-10-20). A new picture password, a
 * new card, or a new password shows once, because the server keeps only hashes.
 * The class page adds its management parts to each row, a search filter, and a toolbar, so the
 * class has one student list.
 * @param props The class, the roster data, the refresh callback, and the class page slots.
 * @returns The roster table with its dialogs.
 */
export function LiveRoster({
  classroomId,
  classroomName,
  students,
  locked,
  fetchedAt,
  onChange,
  renderStudentExtras,
  filter = "",
  filterEmpty,
  toolbar,
}: LiveRosterProps) {
  const t = useTranslations("ClassLogin");
  const format = useIntlFormatter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ClassLoginErrorKey | null>(null);
  const [newPictures, setNewPictures] = useState<{ name: string; pictures: number[] }[]>([]);
  const [rotateTarget, setRotateTarget] = useState<RosterStudent | null>(null);
  const [newCard, setNewCard] = useState<{ name: string; url: string } | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<RosterStudent | null>(null);
  const [newPassword, setNewPassword] = useState<{ name: string; username: string; password: string; signInUrl: string } | null>(null);

  const lockedUntil = new Map(locked.map((lock) => [lock.userId, new Date(lock.lockedUntil).getTime()]));
  const nameOf = (userId: string, fallback: string | null) =>
    students.find((s) => s.userId === userId)?.name ?? fallback ?? "";
  const missing = students.filter((s) => !s.hasPicturePassword).length;
  const query = filter.trim().toLowerCase();
  const shown = query
    ? students.filter((s) => s.name.toLowerCase().includes(query) || s.username.toLowerCase().includes(query))
    : students;

  async function send<T>(path: string, body: unknown, done: (result: T) => void) {
    setBusy(true);
    setError(null);
    try {
      done(await postStudentLogin<T>(path, body));
      await onChange();
    } catch (caught) {
      setError(errorKey(caught));
    } finally {
      setBusy(false);
    }
  }

  const resetPictures = (student: RosterStudent) =>
    send<{ pictures: number[] }>("picture-password/reset", { classroomId, studentUserId: student.userId }, (result) =>
      setNewPictures([{ name: student.name, pictures: result.pictures }]),
    );
  const assignMissing = () =>
    send<{ userId: string; name: string | null; pictures: number[] }[]>("picture-password/assign", { classroomId }, (result) =>
      setNewPictures(result.map((entry) => ({ name: nameOf(entry.userId, entry.name), pictures: entry.pictures }))),
    );
  const rotateCard = (student: RosterStudent) =>
    send<{ token: string }>("card-token/rotate", { classroomId, studentUserId: student.userId }, (result) =>
      setNewCard({ name: student.name, url: cardSignInUrl(window.location.origin, result.token) }),
    );
  const resetPassword = (student: RosterStudent) =>
    send<{ name: string; username: string; password: string }>("student-password/reset", { classroomId, studentUserId: student.userId }, (result) =>
      setNewPassword({ name: result.name, username: result.username, password: result.password, signInUrl: `${window.location.origin}/auth/signin` }),
    );

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t("roster.heading")}</h2>
        <p className="text-muted-foreground text-sm">
          {t("roster.summary", { signedIn: students.filter((s) => s.signedIn).length, total: students.length })}
        </p>
      </div>
      {toolbar}
      {missing > 0 && (
        <Button variant="outline" className="min-h-12" disabled={busy} onClick={assignMissing}>
          {t("roster.assignMissing", { count: missing })}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {t(`errors.${error}`)}
        </p>
      )}
      {students.length === 0 ? (
        <p className="text-muted-foreground">{t("roster.empty")}</p>
      ) : shown.length === 0 ? (
        <p className="text-muted-foreground">{filterEmpty}</p>
      ) : (
        // A wide table scrolls inside this box on a phone, so no part is cut.
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="text-muted-foreground text-left">
                <th scope="col" className="py-2 pr-2 font-medium">{t("roster.student")}</th>
                <th scope="col" className="py-2 pr-2 font-medium">{t("roster.status")}</th>
                <th scope="col" className="py-2 font-medium">
                  <span className="sr-only">{t("roster.actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((student) => {
                const until = lockedUntil.get(student.userId);
                const extras = renderStudentExtras?.(student);
                const minutes = until && until > fetchedAt ? Math.ceil((until - fetchedAt) / 60_000) : 0;
                return (
                  <tr key={student.userId} className="border-t align-top">
                    <th scope="row" className="min-w-[9rem] py-2 pr-2 text-left font-medium">
                      <span className="block break-words">{student.name}</span>
                      <span className="text-muted-foreground block text-xs font-normal">{student.username}</span>
                      {extras?.details}
                    </th>
                    <td className="space-y-1 py-2 pr-2">
                      <span className="block">{student.signedIn ? t("roster.signedIn") : t("roster.notSignedIn")}</span>
                      {student.lastSeenAt && (
                        <span className="text-muted-foreground block text-xs">
                          {t(student.signedIn ? "roster.seen" : "roster.lastSeen", {
                            time: format.relativeTime(new Date(student.lastSeenAt), fetchedAt),
                          })}
                        </span>
                      )}
                      {minutes > 0 && <Badge variant="destructive">{t("roster.locked", { minutes })}</Badge>}
                      {!student.hasPicturePassword && (
                        <span className="text-muted-foreground block text-xs">{t("roster.noPicture")}</span>
                      )}
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          variant={minutes > 0 ? "default" : "outline"}
                          className="min-h-12"
                          disabled={busy}
                          aria-label={t(student.hasPicturePassword ? "roster.resetPictureFor" : "roster.setPictureFor", { name: student.name })}
                          onClick={() => resetPictures(student)}
                        >
                          {t(student.hasPicturePassword ? "roster.resetPicture" : "roster.setPicture")}
                        </Button>
                        <Button
                          variant="outline"
                          className="min-h-12"
                          disabled={busy}
                          aria-label={t("roster.newCardFor", { name: student.name })}
                          onClick={() => setRotateTarget(student)}
                        >
                          {t("roster.newCard")}
                        </Button>
                        <Button
                          variant="outline"
                          className="min-h-12"
                          disabled={busy}
                          aria-label={t("roster.newPasswordFor", { name: student.name })}
                          onClick={() => setPasswordTarget(student)}
                        >
                          {t("roster.newPassword")}
                        </Button>
                        {extras?.actions}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={newPictures.length > 0} onOpenChange={(open) => !open && setNewPictures([])}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("pictures.title")}</DialogTitle>
            <DialogDescription>{t("pictures.description")}</DialogDescription>
          </DialogHeader>
          <PrintStyles />
          <div data-print-area className="space-y-4">
            {newPictures.map((entry, i) => (
              <div key={i} className="space-y-2 break-inside-avoid">
                <p className="font-semibold">{entry.name}</p>
                <PictureSequence pictures={entry.pictures} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPictures([])}>{t("pictures.close")}</Button>
            <Button onClick={() => window.print()}>{t("pictures.print")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RotateCardConfirm
        name={rotateTarget?.name ?? null}
        onCancel={() => setRotateTarget(null)}
        onConfirm={() => {
          if (rotateTarget) void rotateCard(rotateTarget);
          setRotateTarget(null);
        }}
      />

      <AlertDialog open={passwordTarget !== null} onOpenChange={(open) => !open && setPasswordTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("password.title", { name: passwordTarget?.name ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("password.description", { name: passwordTarget?.name ?? "" })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("password.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (passwordTarget) void resetPassword(passwordTarget);
                setPasswordTarget(null);
              }}
            >
              {t("password.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={newPassword !== null} onOpenChange={(open) => !open && setNewPassword(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("password.resultTitle")}</DialogTitle>
            <DialogDescription>{t("password.resultHelp")}</DialogDescription>
          </DialogHeader>
          <PrintStyles />
          {newPassword && (
            <div data-print-area className="space-y-2 rounded-md border p-4">
              <p className="text-lg font-semibold">{newPassword.name}</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <dt>{t("sheet.username")}</dt>
                <dd className="font-mono">{newPassword.username}</dd>
                <dt>{t("sheet.password")}</dt>
                <dd className="font-mono">{newPassword.password}</dd>
              </dl>
              <p className="text-sm">
                {t("sheet.signInAt")} <span className="font-mono break-all">{newPassword.signInUrl}</span>
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPassword(null)}>{t("password.close")}</Button>
            <Button onClick={() => window.print()}>{t("password.print")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newCard !== null} onOpenChange={(open) => !open && setNewCard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cards.title")}</DialogTitle>
            <DialogDescription>{t("cards.description")}</DialogDescription>
          </DialogHeader>
          <PrintStyles />
          {newCard && (
            <div data-print-area className="mx-auto w-full max-w-[93mm]">
              <QrCard name={newCard.name} classroomName={classroomName} url={newCard.url} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCard(null)}>{t("cards.close")}</Button>
            <Button onClick={() => window.print()}>{t("cards.print")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
