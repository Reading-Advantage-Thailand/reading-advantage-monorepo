"use client";

import Link from "next/link";
import { ComponentProps } from "react";
import { useCurrentLocale } from "@/locales/client";
import { localeConfig } from "@/config/locale-config";

type LocalizedLinkProps = ComponentProps<typeof Link>;

export function LocalizedLink({ href, children, ...props }: LocalizedLinkProps) {
  const locale = useCurrentLocale();
  const hrefString = typeof href === "string" ? href : href.pathname || "";

  // Helper to determine if a path should be localized
  const getLocalizedHref = (path: string) => {
    // Don't localize absolute URLs
    if (path.startsWith("http") || path.startsWith("//") || path.startsWith("mailto:") || path.startsWith("tel:")) {
      return path;
    }

    // Don't localize if it already starts with a supported locale
    const hasLocalePrefix = localeConfig.locales.some(
      (l) => path === `/${l}` || path.startsWith(`/${l}/`)
    );

    if (hasLocalePrefix) {
      return path;
    }

    // Special case for root
    if (path === "/") {
      return `/${locale}`;
    }

    // Prefix with current locale
    return `/${locale}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  const localizedHref = getLocalizedHref(hrefString);

  return (
    <Link href={localizedHref} {...props}>
      {children}
    </Link>
  );
}
