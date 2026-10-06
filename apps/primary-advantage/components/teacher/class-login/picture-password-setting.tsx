"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Checkbox, Label } from "@reading-advantage/ui";
import { errorKey, postStudentLogin, type ClassLoginErrorKey } from "./api";

/** Props of {@link PicturePasswordSetting}. */
export interface PicturePasswordSettingProps {
  /** The class whose setting changes. */
  classroomId: string;
  /** The stored setting from the live roster. */
  enabled: boolean;
  /** Reads the roster again after a change. */
  onChange: () => Promise<void> | void;
}

/**
 * Class setting for the picture password (FR-7, default on). When it is off, a student signs in
 * with the class code and the name only, and the session is `code_only`. A failed save keeps
 * the old value and shows the error.
 * @param props The class, the stored setting, and the refresh callback.
 * @returns The setting control.
 */
export function PicturePasswordSetting({ classroomId, enabled, onChange }: PicturePasswordSettingProps) {
  const t = useTranslations("ClassLogin");
  const id = useId();
  const [pending, setPending] = useState<boolean | null>(null);
  const [error, setError] = useState<ClassLoginErrorKey | null>(null);
  const value = pending ?? enabled;

  async function save(next: boolean) {
    setPending(next);
    setError(null);
    try {
      await postStudentLogin("picture-password/setting", { classroomId, enabled: next });
      await onChange();
    } catch (caught) {
      setError(errorKey(caught));
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="space-y-1">
      <div className="flex min-h-12 items-center gap-3">
        <Checkbox
          id={id}
          checked={value}
          disabled={pending !== null}
          className="size-6"
          onCheckedChange={(checked) => void save(checked === true)}
        />
        <Label htmlFor={id} className="text-base">
          {t("setting.label")}
        </Label>
      </div>
      <p className="text-muted-foreground text-sm">{value ? t("setting.on") : t("setting.off")}</p>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {t(`errors.${error}`)}
        </p>
      )}
    </section>
  );
}
