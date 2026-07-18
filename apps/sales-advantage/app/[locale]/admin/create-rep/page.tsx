"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@reading-advantage/ui";
import { Button } from "@reading-advantage/ui";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";

const accountsProvisioningUrl = new URL(
  "/",
  "https://accounts.reading-advantage.com",
);
accountsProvisioningUrl.searchParams.set("application", "sales");
accountsProvisioningUrl.searchParams.set("role", "SALES_REP");

export default function CreateRepPage() {
  const t = useTranslations("admin");

  return (
    <div className="mx-auto max-w-md p-8">
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("backToAdmin")}
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{t("createRep")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <div className="flex gap-3 rounded-md border bg-muted/40 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="space-y-2">
                <p className="font-medium">{t("accountsHandoffTitle")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("accountsHandoffDescription")}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("accountsAuthorityBoundary")}
            </p>
            <Button asChild className="w-full">
              <a href={accountsProvisioningUrl.toString()}>
                {t("openAccounts")}
                <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
