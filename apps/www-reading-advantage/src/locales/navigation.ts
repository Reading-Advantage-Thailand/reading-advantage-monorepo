"use client";

import { useLocale } from "next-intl";
import { createNavigation } from "next-intl/navigation";
import { routing } from "@/i18n/routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

/**
 * Returns the active supported locale from the next-intl runtime.
 * @returns The active locale or the configured default locale.
 */
export function useCurrentLocale() {
  const locale = useLocale();
  if (routing.locales.includes(locale as "en" | "th" | "zh")) {
    return locale;
  }
  return routing.defaultLocale;
}

/**
 * Returns a callback that replaces the active locale for the current route.
 * @returns A locale change callback.
 */
export function useChangeLocale() {
  const router = useRouter();
  const pathname = usePathname();

  return (locale: string) => {
    router.replace(pathname, { locale });
  };
}
