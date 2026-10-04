import { redirect } from "@/i18n/navigation";

/**
 * Sends every visitor to the sign-in page. Public sign-up is closed: the school creates accounts.
 * @param params Route parameters carrying the locale.
 * @returns A redirect to the sign-in page.
 */
export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/auth/signin", locale });
}
