import { Header } from "@/components/header";
import { Separator } from "@/components/ui/separator";
import React from "react";

export default function RolesManagement() {
  return (
    <div>
      <Header heading="Roles Management" text="Manage roles for users" />
      <Separator className="my-4" />
    </div>
  );
}
