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
import { useTransition } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useParams } from "next/navigation";

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("LocaleSwitcher");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const params = useParams();

  const onSelectChange = (locale: Locale) => {
    startTransition(() => {
      router.replace(
        // @ts-expect-error -- TypeScript will validate that only known `params`
        // are used in combination with a given `pathname`. Since the two will
        // always match for the current route, we can skip runtime checks.
        { pathname, params },
        { locale: locale }
      );
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
          <Button className="cursor-pointer" variant="ghost" size="icon">
            <Globe />
            <span className="sr-only">Toggle Locale</span>
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
