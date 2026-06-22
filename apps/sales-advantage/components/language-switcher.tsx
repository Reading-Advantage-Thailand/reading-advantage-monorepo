"use client";

import { Languages } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { Button } from "@reading-advantage/ui";

export function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();

  function toggle() {
    const next = locale === "th" ? "en" : "th";
    router.replace(pathname, { locale: next });
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggle} className="gap-1 text-xs">
      <Languages className="h-4 w-4" />
      {locale === "th" ? "EN" : "TH"}
    </Button>
  );
}