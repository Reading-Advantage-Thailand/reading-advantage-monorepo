import {
  authenticateSalesRequest,
  type ResolvedSalesRequestPrincipal,
} from "@/lib/company-oidc";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Restricts every Sales administration screen to an active Sales administrator.
 * @param children Nested administration route content.
 * @param params Localized route parameters supplied by Next.js.
 * @returns The protected administration route content.
 */
export default async function AdminLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const [requestHeaders, { locale }] = await Promise.all([headers(), params]);
  const result = await authenticateSalesRequest(
    new Request("http://sales.internal/admin", { headers: requestHeaders }),
  );
  const principal =
    result && "user" in result
      ? (result as unknown as ResolvedSalesRequestPrincipal)
      : result?.kind === "authenticated"
        ? result.principal
        : null;

  if (principal?.user.role !== "SALES_ADMIN") {
    redirect(`/${locale}`);
  }

  return children;
}
