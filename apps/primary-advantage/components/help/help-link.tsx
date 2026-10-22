"use client";

import { CircleHelpIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { HelpAudience } from "@/lib/help/videos";
import { HelpPanel } from "./help-panel";

/**
 * The "How do I sign in?" link of the sign-in pages (track primary_in_app_help_20261023, plan 3.3).
 * These pages have no app header, so the link opens the help panel for the page and the audience.
 * @param props.pathname The page path without the locale, for example `/auth/signin`.
 * @param props.audience The audience of the tab: student or teacher.
 * @returns The link and its panel.
 */
export function HelpLink({ pathname, audience }: { pathname: string; audience: HelpAudience }) {
  const t = useTranslations("Help");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="mx-auto mt-4 flex min-h-12 cursor-pointer items-center gap-2 text-sm underline">
        <CircleHelpIcon aria-hidden="true" className="h-4 w-4" />
        {t("signInHelp")}
      </button>
      <HelpPanel open={open} onOpenChange={setOpen} pathname={pathname} audience={audience} />
    </>
  );
}
