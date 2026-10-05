import { Header } from "@/components/header";
import { Separator } from "@reading-advantage/ui";
import { CreateSchoolDialog } from "@/components/system/create-school-dialog";
import React from "react";

export default function SchoolsPage() {
  return (
    <div>
      <Header heading="Schools" text="Manage schools in the system">
        <CreateSchoolDialog />
      </Header>
      <Separator className="my-4" />
    </div>
  );
}
