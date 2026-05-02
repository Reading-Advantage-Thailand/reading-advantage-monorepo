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
  usePathname,
  useRouter,
  useCurrentLocale,
  useScopedI18n,
} from "@/locales/client";

export function LocaleSwitcher() {
  const t = useScopedI18n("components.localeSwitcher");
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useCurrentLocale();

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
              onClick={() => router.replace(pathname, { locale: locale as Locale })}
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
