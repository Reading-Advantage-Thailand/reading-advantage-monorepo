import { TeachersTable } from "@/components/admin/teachers-table";
import { Header } from "@/components/header";
import { Separator } from "@/components/ui/separator";
import React from "react";

export default function TeachersPage() {
  return (
    <div>
      <Header
        heading="Teachers Management"
        text="Manage teachers and their access to the system"
      />
      <Separator className="my-4" />
      {/* <TeachersTable /> */}
    </div>
  );
}
