import { Header } from "@/components/header";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { CreateLicenseForm } from "./create-license-form";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import React from "react";

export default function CreateLicensesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <Header
            heading="Create License"
            text="Create a new license for school"
          />
        </div>
        <Link href="/system/licenses">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Licenses
          </Button>
        </Link>
      </div>
      <Separator />
      <div className="mx-auto max-w-2xl">
        <CreateLicenseForm />
      </div>
    </div>
  );
}
