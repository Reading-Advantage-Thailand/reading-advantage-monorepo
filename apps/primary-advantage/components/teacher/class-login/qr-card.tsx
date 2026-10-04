"use client";

import { useTranslations } from "next-intl";
import { QrCode } from "./qr-code";

/** Props of {@link QrCard}. */
export interface QrCardProps {
  /** The student's display name. */
  name: string;
  /** The class name, printed small at the bottom. */
  classroomName: string;
  /** The sign-in URL with the card token. */
  url: string;
}

/**
 * One printable QR login card (FR-5): the student's name, an avatar placeholder (the first letter
 * of the name), and the QR code of the sign-in URL. Eight cards fit on one A4 page.
 * @param props The name, the class name, and the sign-in URL.
 * @returns The card.
 */
export function QrCard({ name, classroomName, url }: QrCardProps) {
  const t = useTranslations("ClassLogin.cards");
  return (
    <div className="flex h-[64mm] break-inside-avoid flex-col items-center justify-between rounded-lg border-2 border-dashed border-gray-400 bg-white p-3 text-black">
      <div className="flex w-full items-center gap-2">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-200 text-lg font-bold">
          {Array.from(name)[0]?.toUpperCase()}
        </span>
        <span className="truncate text-xl font-bold">{name}</span>
      </div>
      <QrCode value={url} label={t("qrLabel", { name })} className="size-[40mm]" />
      <p className="text-xs">{classroomName ? `${classroomName} · ${t("scanHint")}` : t("scanHint")}</p>
    </div>
  );
}
