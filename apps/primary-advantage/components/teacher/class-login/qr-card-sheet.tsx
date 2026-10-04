"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cardSignInUrl } from "@/lib/student-login/card-url";
import { errorKey, postStudentLogin, type ClassLoginErrorKey, type ClassRoster, type RosterStudent } from "./api";
import { PrintStyles } from "./print-styles";
import { QrCard } from "./qr-card";
import { RotateCardConfirm } from "./rotate-card-confirm";

/** Cards on one printed A4 page (FR-5). */
export const CARDS_PER_PAGE = 8;

/** Props of {@link QrCardSheet}. */
export interface QrCardSheetProps {
  /** The class to print cards for. */
  classroomId: string;
}

/**
 * QR card print page (FR-5). It reads the roster on load and changes nothing until the teacher
 * asks. "Make cards" issues tokens for the students without a card; "New card" rotates one card
 * that was made before. The server keeps only token hashes, so a card shows only on the visit
 * that made it. Cards print 8 to an A4 page.
 * @param props The class.
 * @returns The QR card page body.
 */
export function QrCardSheet({ classroomId }: QrCardSheetProps) {
  const t = useTranslations("ClassLogin");
  const [roster, setRoster] = useState<ClassRoster | null>(null);
  const [cards, setCards] = useState<{ userId: string; name: string; url: string }[]>([]);
  const [rotateTarget, setRotateTarget] = useState<RosterStudent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ClassLoginErrorKey | null>(null);

  const loadRoster = useCallback(async () => {
    try {
      setRoster(await postStudentLogin<ClassRoster>("roster", { classroomId }));
    } catch (caught) {
      setError(errorKey(caught));
    }
  }, [classroomId]);

  useEffect(() => {
    void loadRoster();
  }, [loadRoster]);

  const addCards = (issued: { userId: string; name: string | null; token: string }[]) => {
    const fresh = issued.map((card) => ({
      userId: card.userId,
      name: roster?.students.find((s) => s.userId === card.userId)?.name ?? card.name ?? "",
      url: cardSignInUrl(window.location.origin, card.token),
    }));
    setCards((prev) => [...prev.filter((c) => !fresh.some((f) => f.userId === c.userId)), ...fresh]);
  };

  async function send<T>(path: string, body: unknown, done: (result: T) => void) {
    setBusy(true);
    setError(null);
    try {
      done(await postStudentLogin<T>(path, body));
      await loadRoster();
    } catch (caught) {
      setError(errorKey(caught));
    } finally {
      setBusy(false);
    }
  }

  const printed = new Set(cards.map((c) => c.userId));
  const withoutCard = roster?.students.filter((s) => !s.hasCardToken && !printed.has(s.userId)) ?? [];
  const madeBefore = roster?.students.filter((s) => s.hasCardToken && !printed.has(s.userId)) ?? [];
  const pages = Array.from({ length: Math.ceil(cards.length / CARDS_PER_PAGE) }, (_, i) =>
    cards.slice(i * CARDS_PER_PAGE, (i + 1) * CARDS_PER_PAGE),
  );

  return (
    <div className="space-y-6">
      <Link href={`/teacher/class-roster/${classroomId}`} className="text-sm underline">
        {t("backToClass")}
      </Link>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{t("qrPage.title")}</h1>
        <p>{t("qrPage.intro")}</p>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {t(`errors.${error}`)}
        </p>
      )}
      {roster && (
        <div className="flex flex-wrap items-center gap-2">
          {withoutCard.length > 0 ? (
            <Button
              className="min-h-12"
              disabled={busy}
              onClick={() => send<{ cards: { userId: string; name: string | null; token: string }[] }>("card-token/issue", { classroomId }, (r) => addCards(r.cards))}
            >
              {t("qrPage.issue", { count: withoutCard.length })}
            </Button>
          ) : (
            <p>{t("qrPage.allHaveCards")}</p>
          )}
          <Button variant="outline" className="min-h-12" disabled={cards.length === 0} onClick={() => window.print()}>
            {t("qrPage.print")}
          </Button>
          {cards.length > 0 && <span className="text-muted-foreground text-sm">{t("qrPage.toPrint", { count: cards.length })}</span>}
        </div>
      )}

      {cards.length > 0 && (
        <>
          <PrintStyles />
          <div data-print-area className="space-y-6">
            {pages.map((page, i) => (
              <div key={i} data-card-page className="grid grid-cols-2 gap-[4mm] break-after-page last:break-after-auto">
                {page.map((card) => (
                  <QrCard key={card.userId} name={card.name} classroomName={roster?.classroomName ?? ""} url={card.url} />
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {madeBefore.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{t("qrPage.madeBefore")}</h2>
          <p className="text-muted-foreground text-sm">{t("qrPage.madeBeforeHelp")}</p>
          <ul className="divide-y">
            {madeBefore.map((student) => (
              <li key={student.userId} className="flex items-center justify-between gap-2 py-2">
                <span>{student.name}</span>
                <Button
                  variant="outline"
                  className="min-h-12"
                  disabled={busy}
                  aria-label={t("roster.newCardFor", { name: student.name })}
                  onClick={() => setRotateTarget(student)}
                >
                  {t("roster.newCard")}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <RotateCardConfirm
        name={rotateTarget?.name ?? null}
        onCancel={() => setRotateTarget(null)}
        onConfirm={() => {
          const student = rotateTarget;
          setRotateTarget(null);
          if (student) {
            void send<{ token: string }>("card-token/rotate", { classroomId, studentUserId: student.userId }, (r) =>
              addCards([{ userId: student.userId, name: student.name, token: r.token }]),
            );
          }
        }}
      />
    </div>
  );
}
