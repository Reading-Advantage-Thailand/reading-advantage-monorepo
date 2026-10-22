"use client";

import { CircleHelpIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePathname } from "@/i18n/navigation";
import type { HelpAudience } from "@/lib/help/videos";
import { HelpPanel } from "./help-panel";

/**
 * The help button of the app header (track primary_in_app_help_20261023, spec FR-1). It opens the
 * help panel with the videos of the current page.
 * @param props.audience Teacher or student.
 * @returns The button and its panel.
 */
export function HelpButton({ audience }: { audience: HelpAudience }) {
  const t = useTranslations("Help");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" className="h-8 w-8 cursor-pointer px-0" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <CircleHelpIcon aria-hidden="true" />
        <span className="sr-only">{t("open")}</span>
      </Button>
      <HelpPanel open={open} onOpenChange={setOpen} pathname={pathname} audience={audience} />
    </>
  );
}
