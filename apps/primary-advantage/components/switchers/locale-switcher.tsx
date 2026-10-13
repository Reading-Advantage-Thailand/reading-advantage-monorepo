"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Globe } from "lucide-react";
import { useLocale, useTranslations, Locale } from "next-intl";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { useTransition } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";

/**
 * Renders the language menu with a localized accessible name.
 * @param props.triggerClassName Extra classes for the icon button, for example `size-12` for a 48 px target.
 * @returns The locale switcher.
 */
export function LocaleSwitcher({ triggerClassName }: { triggerClassName?: string } = {}) {
  const locale = useLocale();
  const t = useTranslations("LocaleSwitcher");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();

  const onSelectChange = (locale: Locale) => {
    startTransition(() => {
      router.replace(pathname, { locale });
    });
  };

  const sortedLocales = [
    ...routing.locales.filter((l) => l === locale),
    ...routing.locales.filter((l) => l !== locale),
  ];

  return (
    <div id="onborda-language">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className={cn("cursor-pointer", triggerClassName)} variant="ghost" size="icon">
            <Globe aria-hidden="true" />
            <span className="sr-only">{t("label")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {sortedLocales.map((locales) => (
            <DropdownMenuItem
              key={locales}
              className="cursor-pointer"
              onClick={() => onSelectChange(locales)}
            >
              <span
                className={`text-sm ${
                  locales === locale ? "font-semibold" : "text-muted-foreground"
                }`}
              >
                {t("locale", { locale: locales })}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
