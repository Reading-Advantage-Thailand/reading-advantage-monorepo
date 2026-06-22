"use client";

import { trpc } from "@/lib/trpc";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@reading-advantage/ui";
import { ArrowLeft } from "lucide-react";
import { use } from "react";

export default function RepDetailPage({ params }: { params: Promise<{ repId: string }> }) {
  const { repId } = use(params);
  const t = useTranslations("admin");
  // For v1, reuse cohort overview filtered client-side
  const { data: cohort } = trpc.sales.admin.cohortOverview.useQuery();
  const rows = (cohort ?? []) as unknown as Array<Record<string, unknown> & { userId: string; username?: string }>;
  const rep = rows.find((r) => r.userId === repId);

  return (
    <div className="mx-auto max-w-4xl p-8">
      <Link href="/admin" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Admin
      </Link>
      <h1 className="mb-6 text-3xl font-bold">{t("repDetail")}: {rep?.username ?? repId}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
        </CardHeader>
        <CardContent>
          {rep ? (
            <pre className="text-xs">{JSON.stringify(rep, null, 2)}</pre>
          ) : (
            <p className="text-sm text-muted-foreground">Rep not found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}