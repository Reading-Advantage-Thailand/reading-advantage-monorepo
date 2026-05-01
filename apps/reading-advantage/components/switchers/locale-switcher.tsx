"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Icons } from "../icons";
import { Locale, localeConfig, localeNames } from "@/configs/locale-config";
import {
  useChangeLocale,
  useCurrentLocale,
  useScopedI18n,
} from "@/locales/client";

export function LocaleSwitcher() {
  // Uncomment to preserve the search params. Don't forget to also uncomment the Suspense in the layout
  const t = useScopedI18n("components.localeSwitcher");
  const changeLocale = useChangeLocale(/* { preserveSearchParams: true } */);

  // Get the current locale
  const currentLocale = useCurrentLocale();

  // Move the current locale to the front of the array
  const sortedLocales = [
    currentLocale,
    ...Object.keys(localeNames).filter((locale) => locale !== currentLocale),
  ];

  return (
    <div id="onborda-language">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 px-0">
            <Icons.globe className="h-5 w-5" />
            <span className="sr-only">Toggle Locale</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {sortedLocales.map((locale) => (
            <DropdownMenuItem
              key={locale}
              onClick={() => changeLocale(locale as Locale)}
            >
              <span
                className={`text-sm ${
                  locale === currentLocale
                    ? "font-semibold"
                    : "text-muted-foreground"
                }`}
              >
                {t(locale as Locale)}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
