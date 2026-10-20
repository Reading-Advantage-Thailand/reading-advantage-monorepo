"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

type UserAuthFormProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * The forgot-password page. The app sends no e-mail: the old form said "The email has been sent!"
 * and sent nothing (PR review 2026-10-20, defect 1). A school admin sets a new teacher password on
 * the Teachers page, and Primary Advantage support helps a school admin.
 * @param props.className Extra classes.
 * @returns The page body.
 */
export function UserResetPassForm({ className, ...props }: UserAuthFormProps) {
  const t = useTranslations("AuthPage.forgot");
  return (
    <div className={cn("flex flex-col items-center gap-4 text-center", className)} {...props}>
      <KeyRound className="h-12 w-12" aria-hidden="true" />
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground text-sm text-balance">{t("help")}</p>
      <Link href="/auth/signin" className="text-sm underline underline-offset-4">
        {t("back")}
      </Link>
    </div>
  );
}
