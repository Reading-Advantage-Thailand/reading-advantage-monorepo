import { getTranslations, getLocale } from "next-intl/server";

export async function getI18n() {
  return getTranslations();
}

export async function getScopedI18n(namespace: string) {
  return getTranslations(namespace);
}

export async function getCurrentLocale() {
  return getLocale();
}

export { setRequestLocale as setStaticParamsLocale } from "next-intl/server";
