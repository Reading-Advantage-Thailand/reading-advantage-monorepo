"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

interface CreateSchoolCardProps {
  onCreate: () => void;
}

export function CreateSchoolCard({ onCreate }: CreateSchoolCardProps) {
  const t = useTranslations("Settings.schoolProfile.createSchoolcard");
  return (
    <Card className="border-muted-foreground/25 border-2 border-dashed">
      <CardHeader className="text-center">
        <div className="bg-muted mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <Building2 className="text-muted-foreground h-8 w-8" />
        </div>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button onClick={onCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t("createSchool")}
        </Button>
      </CardContent>
    </Card>
  );
}
