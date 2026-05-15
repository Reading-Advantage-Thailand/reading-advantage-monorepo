import { getRequestConfig } from "next-intl/server";
import { resolveLocale, loadMessages } from "../lib/i18n-messages";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = resolveLocale(await requestLocale);
  const messages = await loadMessages(locale);
  return { locale, messages };
});
