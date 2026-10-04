"use client";

import { useTranslations } from "next-intl";
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

/** Props of {@link RotateCardConfirm}. */
export interface RotateCardConfirmProps {
  /** The student who gets a new card, or null when the dialog is closed. */
  name: string | null;
  /** Closes the dialog without a change. */
  onCancel: () => void;
  /** Makes the new card. */
  onConfirm: () => void;
}

/**
 * Asks the teacher to confirm a new QR card: the old card stops working at once and the student
 * is signed out (FR-5).
 * @param props The student name and the two callbacks.
 * @returns The confirmation dialog.
 */
export function RotateCardConfirm({ name, onCancel, onConfirm }: RotateCardConfirmProps) {
  const t = useTranslations("ClassLogin.rotate");
  return (
    <AlertDialog open={name !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { name: name ?? "" })}</AlertDialogTitle>
          <AlertDialogDescription>{t("description", { name: name ?? "" })}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{t("confirm")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
