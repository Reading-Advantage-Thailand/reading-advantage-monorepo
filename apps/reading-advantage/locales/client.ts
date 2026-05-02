import { useTranslations, useLocale } from "next-intl";
import { useChangeLocale } from "./navigation";

export function useI18n() {
  return useTranslations();
}

export function useScopedI18n(namespace: string) {
  return useTranslations(namespace);
}

export function useCurrentLocale() {
  return useLocale();
}

export { useChangeLocale };
