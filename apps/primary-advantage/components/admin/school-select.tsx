"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "@reading-advantage/auth-client";
import { Label } from "@reading-advantage/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Shows a school picker to a SYSTEM user only; renders nothing for any other user.
 * @param props.value The selected school id, or an empty string.
 * @param props.onChange Called with the school id when the user picks a school.
 * @returns The school select, or null when the signed-in user is not SYSTEM.
 */
export function SchoolSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (schoolId: string) => void;
}) {
  const t = useTranslations("Admin.SchoolSelect");
  const { user } = useSession();
  const isSystem = user?.role === "SYSTEM";
  const [schools, setSchools] = useState<Array<{ id: string; name: string }>>(
    [],
  );

  useEffect(() => {
    if (!isSystem) return;
    let active = true;
    fetch("/api/schools")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error())))
      .then((rows: Array<{ id: string; name: string }>) => {
        if (active) setSchools(rows.map(({ id, name }) => ({ id, name })));
      })
      .catch(() => {
        if (active) setSchools([]);
      });
    return () => {
      active = false;
    };
  }, [isSystem]);

  if (!isSystem) return null;

  return (
    <div className="space-y-2">
      <Label>{t("label")}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11" aria-label={t("label")}>
          <SelectValue placeholder={t("placeholder")} />
        </SelectTrigger>
        <SelectContent>
          {schools.map((school) => (
            <SelectItem key={school.id} value={school.id}>
              {school.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
