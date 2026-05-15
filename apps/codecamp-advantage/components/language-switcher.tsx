"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Button } from "@reading-advantage/ui";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: "th" | "en") {
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Language switcher">
      <Button
        variant={locale === "en" ? "default" : "ghost"}
        size="sm"
        className="h-8 px-2 text-xs"
        onClick={() => switchLocale("en")}
        aria-label="Switch to English"
        aria-current={locale === "en" ? true : undefined}
      >
        EN
      </Button>
      <Button
        variant={locale === "th" ? "default" : "ghost"}
        size="sm"
        className="h-8 px-2 text-xs"
        onClick={() => switchLocale("th")}
        aria-label="เปลี่ยนเป็นภาษาไทย"
        aria-current={locale === "th" ? true : undefined}
      >
        ไทย
      </Button>
    </div>
  );
}
