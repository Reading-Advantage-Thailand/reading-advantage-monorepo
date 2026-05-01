import React from "react";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/header";
import LicenseTable from "@/components/system/license-table";

export default async function LicensePage() {
  return (
    <div>
      <Header heading="Licenses" text="Create a new license for school" />
      <Separator className="my-4" />
      <LicenseTable />
    </div>
  );
}
