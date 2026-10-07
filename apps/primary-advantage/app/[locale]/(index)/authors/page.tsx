import { getLocale } from "next-intl/server";
import { permanentRedirect } from "@/i18n/navigation";

/**
 * The old Authors page is now Our books (owner decision 2026-10-07): a permanent redirect.
 * @returns Nothing; the redirect ends the request.
 */
export default async function AuthorsPage() {
  permanentRedirect({ href: "/books", locale: await getLocale() });
}
