import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";
import { localeConfig } from "@/configs/locale-config";

export const routing = defineRouting({
  locales: localeConfig.locales as [string, ...string[]],
  defaultLocale: localeConfig.defaultLocale,
  localePrefix: "always",
});

export const { Link, redirect, usePathname, useRouter, useLocale } =
  createNavigation(routing);
