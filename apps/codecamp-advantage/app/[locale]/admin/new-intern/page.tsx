"use client";

import { useAuth } from "@reading-advantage/auth-client";
import { Button } from "@reading-advantage/ui";
import { ArrowLeft, ExternalLink, ShieldAlert, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

/** Sends Codecamp administrators to the company-owned employee workflow. */
export default function NewInternPage() {
  const t = useTranslations("admin");
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }
  if (user?.role !== "ADMIN") {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold">{t("accessDenied")}</h1>
        <p className="mt-2 text-muted-foreground">{t("noPrivileges")}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 md:py-12">
      <Button variant="ghost" className="mb-6" asChild>
        <Link href="/admin">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("backToAdmin")}
        </Link>
      </Button>
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <UserPlus className="h-9 w-9 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">{t("createIntern")}</h1>
        <p className="mt-3 text-muted-foreground">
          {t("createInternDescription")}
        </p>
        <Button className="mt-7" asChild>
          <a href="https://accounts.reading-advantage.com/?application=codecamp&role=INTERN">
            {t("openAccounts")}
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}
