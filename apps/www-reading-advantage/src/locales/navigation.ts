"use client";

import { createNavigation } from "next-intl/navigation";
import { routing } from "@/i18n/routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

export function useCurrentLocale() {
  // next-intl doesn't have a direct useCurrentLocale hook
  // We can derive it from usePathname
  const pathname = usePathname();
  const locale = pathname.split("/")[1];
  if (routing.locales.includes(locale as "en" | "th" | "zh")) {
    return locale;
  }
  return routing.defaultLocale;
}

export function useChangeLocale() {
  const router = useRouter();
  const pathname = usePathname();

  return (locale: string) => {
    router.replace(pathname, { locale });
  };
}
