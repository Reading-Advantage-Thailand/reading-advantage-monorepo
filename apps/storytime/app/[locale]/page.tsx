import type { Metadata } from "next";
import { redirect } from "next/navigation";

/**
 * The locale root of the Storytime app. The proxy sends "/" to "/th" and leaves
 * "/<locale>" to Next. The page sends every visitor to the sign-in page of that
 * locale. The sign-in page already sends a signed-in visitor onward, so this
 * page needs no session logic and no database. The proxy stays unchanged.
 */

/**
 * Marks the page as out of the search index.
 * @returns The page metadata.
 */
export function generateMetadata(): Metadata {
  return { robots: "noindex, nofollow" };
}

/**
 * Redirects the locale root to its sign-in page.
 * @param props.params The locale of the page.
 * @returns Never returns; `redirect` throws to perform the navigation.
 */
export default async function LocaleRootPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<never> {
  const { locale } = await params;
  redirect(`/${locale}/sign-in`);
}
