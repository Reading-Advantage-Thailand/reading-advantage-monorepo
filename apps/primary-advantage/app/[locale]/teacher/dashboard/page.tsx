import { redirect } from "@/i18n/navigation";

/**
 * Forwards the legacy teacher dashboard route to the classroom list.
 * @param params Route parameters carrying the locale.
 * @returns A redirect to the teacher classroom list.
 */
export default async function TeacherDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/teacher/my-classes", locale });
}
