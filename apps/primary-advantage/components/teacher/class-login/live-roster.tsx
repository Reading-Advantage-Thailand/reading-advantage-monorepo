"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
}

/**
 * Live sign-in roster for the teacher (FR-4): who is signed in and when each student was last
 * seen, who is locked and for how long, one-tap picture-password reset (FR-3), and card rotate
 * (FR-5). A new picture password or a new card shows once, because the server keeps only hashes.
 * @param props The class, the roster data, and the refresh callback.
 * @returns The roster table with its dialogs.
 */
export function LiveRoster({ classroomId, classroomName, students, locked, fetchedAt, onChange }: LiveRosterProps) {
  const t = useTranslations("ClassLogin");
  const format = useFormatter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ClassLoginErrorKey | null>(null);
  const [newPictures, setNewPictures] = useState<{ name: string; pictures: number[] }[]>([]);
  const [rotateTarget, setRotateTarget] = useState<RosterStudent | null>(null);
  const [newCard, setNewCard] = useState<{ name: string; url: string } | null>(null);

  const lockedUntil = new Map(locked.map((lock) => [lock.userId, new Date(lock.lockedUntil).getTime()]));
  const nameOf = (userId: string, fallback: string | null) =>
    students.find((s) => s.userId === userId)?.name ?? fallback ?? "";
  const missing = students.filter((s) => !s.hasPicturePassword).length;

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

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">{t("roster.heading")}</h3>
        <p className="text-muted-foreground text-sm">
          {t("roster.summary", { signedIn: students.filter((s) => s.signedIn).length, total: students.length })}
        </p>
      </div>
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
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
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
              {students.map((student) => {
                const until = lockedUntil.get(student.userId);
                const minutes = until && until > fetchedAt ? Math.ceil((until - fetchedAt) / 60_000) : 0;
                return (
                  <tr key={student.userId} className="border-t align-top">
                    <th scope="row" className="py-2 pr-2 text-left font-medium">
                      <span className="block">{student.name}</span>
                      <span className="text-muted-foreground block text-xs font-normal">{student.username}</span>
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

      <AlertDialog open={rotateTarget !== null} onOpenChange={(open) => !open && setRotateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("rotate.title", { name: rotateTarget?.name ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("rotate.description", { name: rotateTarget?.name ?? "" })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("rotate.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (rotateTarget) void rotateCard(rotateTarget);
                setRotateTarget(null);
              }}
            >
              {t("rotate.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
