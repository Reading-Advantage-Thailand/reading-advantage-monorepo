import { Role } from "@/lib/enums";
import React from "react";
import { headers } from "next/headers";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BadgeCheck } from "lucide-react";
import { LicenseDataTable } from "./license-data-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateLicenseForm } from "./create-license-form";
import { licenseService } from "@/client/services/firestore-client-services";
import { LicenseDataTableWithColumns } from "./columns";
import { Header } from "@/components/header";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import UnauthorizedPage from "@/components/shared/unauthorized-page";
import { getScopedI18n } from "@/locales/server";

async function getAllLicenses() {
  const requestHeaders = await headers();
  const response = await licenseService.licenses.fetchAllDocs(
    {
      select: [
        "id",
        "schoolName",
        "maxUsers",
        "usedLicenses",
        "expiresAt",
        "licenseType",
        "key",
      ],
    },
    requestHeaders
  );
  return response.data;
}

export default async function LicensePage() {
  const user = await getCurrentUser();

  if (!user) {
    return redirect("/auth/signin");
  }

  if (user.role !== Role.SYSTEM) {
    return <UnauthorizedPage />;
  }

  const licenses = await getAllLicenses();
  const t = await getScopedI18n("pages.systemLicense");

  return (
    <div>
      <Header heading={t("heading")} text={t("headerText")} />
      <Separator className="my-4" />
      <div className="mx-2 flex gap-4 flex-col md:flex-row">
        <div className="w-full">
          <LicenseDataTableWithColumns data={licenses} />
        </div>
        <Card className="md:w-[40rem] md:max-w-sm">
          <CardHeader>
            <CardTitle className="text-primary">
              {t("cardTitle")}
            </CardTitle>
            <CardDescription>
              {t("cardDescription", { count: licenses.length })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateLicenseForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DisplaySettingInfo({
  title,
  desc,
  data,
  badge,
  activated,
}: {
  title: string;
  desc?: string;
  data: string;
  badge?: string;
  activated?: boolean;
}) {
  return (
    <>
      <div className="text-sm font-medium mt-3">
        {title}
        {badge && (
          <Badge className="ml-2" variant="secondary">
            {badge}
          </Badge>
        )}
      </div>
      {desc && (
        <p className="text-[0.8rem] text-muted-foreground mt-2">{desc}</p>
      )}
      <div className="flex justify-between items-center text-[0.8rem] text-muted-foreground rounded-lg border bg-card shadow px-3 py-2 my-2">
        <p>{data}</p>
        {activated && (
          <span className="text-green-800 dark:text-green-300 flex items-center gap-1">
            <BadgeCheck size={16} />
            Activated
          </span>
        )}
      </div>
    </>
  );
}
