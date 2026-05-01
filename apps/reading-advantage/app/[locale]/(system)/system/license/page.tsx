import { Role } from "@prisma/client";
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
import { columns } from "./columns";
import { Header } from "@/components/header";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import UnauthorizedPage from "@/components/shared/unauthorized-page";

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
  const licenses = await getAllLicenses();

  if (!user) {
    return redirect("/auth/signin");
  }

  if (user.role !== Role.SYSTEM) {
    return <UnauthorizedPage />;
  }

  return (
    <div>
      <Header heading="System" text="Create a new license for school" />
      <Separator className="my-4" />
      <div className="mx-2 flex gap-4 flex-col md:flex-row">
        <div className="w-full">
          <LicenseDataTable data={licenses} columns={columns} />
        </div>
        <Card className="md:w-[40rem] md:max-w-sm">
          <CardHeader>
            <CardTitle className="text-primary">
              Create a new license for your school
            </CardTitle>
            <CardDescription>
              License is a key to access the platform. You can create a new
              license for the school. Currently you have a total of{" "}
              <strong className="dark:text-blue-500">{licenses.length}</strong>{" "}
              license(s).
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
