"use client";

import React from "react";
import { useScopedI18n } from "@/locales/client";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface License {
  id: string;
  schoolName: string;
  maxUsers: number;
  expiresAt: Date;
  _count?: {
    licenseUsers: number;
  };
}

interface LicenseSelectorProps {
  licenses: License[];
  selectedLicenseId: string;
  onLicenseChange: (licenseId: string) => void;
}

export default function LicenseSelector({
  licenses,
  selectedLicenseId,
  onLicenseChange,
}: LicenseSelectorProps) {
  const t = useScopedI18n("pages.admin.dashboard.licenseSelector") as any;
  const selectedLicense = licenses.find((l) => l.id === selectedLicenseId);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Select value={selectedLicenseId} onValueChange={onLicenseChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("placeholder")}>
              {selectedLicense ? selectedLicense.schoolName : t("placeholder")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>{t("availableLabel")}</SelectLabel>
              {licenses.map((license) => (
                <SelectItem key={license.id} value={license.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{license.schoolName}</span>
                    <span className="text-xs text-muted-foreground">
                      {t("users", {
                        used: license._count?.licenseUsers || 0,
                        max: license.maxUsers,
                      })}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
