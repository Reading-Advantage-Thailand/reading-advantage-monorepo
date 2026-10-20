import { redirect } from "@/i18n/navigation";

interface AdminPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Admin landing page: sends the user to the school dashboard.
 * @param props.params The route params with the locale.
 * @returns The redirect.
 */
export default async function AdminPage({ params }: AdminPageProps) {
  const { locale } = await params;

  return redirect({ href: "/admin/dashboard", locale });
}
