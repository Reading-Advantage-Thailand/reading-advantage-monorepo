"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PICTURES, PictureIcon } from "./pictures";

/** Number of pictures in a picture password. */
export const PICTURE_PASSWORD_LENGTH = 3;

/** Props of {@link PictureGrid}. */
export interface PictureGridProps {
  /** The picture numbers tapped so far, in tap order. */
  value: readonly number[];
  /** Gets the new taps after a tap, Undo, or Start again. */
  onChange: (value: number[]) => void;
  /** Blocks all taps, for example while the sign-in runs or during a lockout. */
  disabled?: boolean;
}

/**
 * Picture grid of the student picture password (FR-3). It shows the 12 pictures of
 * {@link PICTURES} (the array index is the stored picture number), progress dots, Undo, and
 * Start again. The grid never marks which pictures were tapped, so the password stays hidden.
 * @param props The taps, the change callback, and the disabled flag.
 * @returns The grid.
 */
export function PictureGrid({ value, onChange, disabled = false }: PictureGridProps) {
  const t = useTranslations("StudentSignIn.pictures");
  const full = value.length >= PICTURE_PASSWORD_LENGTH;

  return (
    <div className="flex flex-col gap-4">
      <div role="status" className="flex items-center justify-center gap-3">
        {Array.from({ length: PICTURE_PASSWORD_LENGTH }, (_, step) => (
          <span
            key={step}
            aria-hidden="true"
            className={cn("border-primary size-5 rounded-full border-2", step < value.length && "bg-primary")}
          />
        ))}
        <span className="sr-only">{t("progress", { count: value.length })}</span>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {PICTURES.map((picture, index) => (
          <Button
            key={picture.key}
            type="button"
            variant="outline"
            className="h-auto min-h-20 bg-white p-2 motion-reduce:transition-none dark:bg-white"
            disabled={disabled || full}
            onClick={() => onChange([...value, index])}
          >
            <PictureIcon index={index} className="size-14" />
          </Button>
        ))}
      </div>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="min-h-12 flex-1 text-base motion-reduce:transition-none"
          disabled={disabled || value.length === 0}
          onClick={() => onChange(value.slice(0, -1))}
        >
          {t("undo")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-12 flex-1 text-base motion-reduce:transition-none"
          disabled={disabled || value.length === 0}
          onClick={() => onChange([])}
        >
          {t("clear")}
        </Button>
      </div>
    </div>
  );
}
