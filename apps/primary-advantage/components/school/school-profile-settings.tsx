"use client";

import { Header } from "@/components/header";
import { Separator } from "@/components/ui/separator";
import { SchoolDetail } from "@/components/school/school-detail";
import { CreateSchoolCard } from "@/components/school/create-school-card";
import { SchoolForm } from "@/components/school/school-form";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import type { SchoolProfile } from "@/server/models/schoolModel";

/**
 * Interactive school profile settings. Renders the server-fetched school and
 * refreshes from the API only after user actions (edit, create, delete).
 * @param initialSchool The school fetched on the server page, or null.
 * @returns The school profile settings UI.
 */
export default function SchoolProfileSettings({
  initialSchool,
}: {
  initialSchool: SchoolProfile | null;
}) {
  const t = useTranslations("Settings.schoolProfile");
  const [school, setSchool] = useState<SchoolProfile | null>(initialSchool);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const fetchSchool = async () => {
    try {
      const response = await fetch("/api/users/me/school");
      if (response.ok) {
        const data = await response.json();
        setSchool(data.school ?? null);
      } else if (response.status === 404) {
        setSchool(null);
      } else {
        throw new Error("Failed to fetch school data");
      }
    } catch (error) {
      toast.error(t("loadError"), {
        description:
          error instanceof Error ? error.message : t("tryAgainLater"),
      });
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleEditSuccess = () => {
    setIsEditing(false);
    fetchSchool();
  };

  const handleCreate = () => {
    setIsCreating(true);
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
  };

  const handleCreateSuccess = () => {
    setIsCreating(false);
    fetchSchool();
  };

  const handleDelete = () => {
    setSchool(null);
  };

  return (
    <div>
      <Header heading={t("title")} text={t("subtitle")} />
      <Separator className="my-4" />

      <div className="space-y-6">
        {school ? (
          <>
            {isEditing ? (
              <SchoolForm
                mode="edit"
                school={school}
                onSuccess={handleEditSuccess}
                onCancel={handleCancelEdit}
              />
            ) : (
              <SchoolDetail
                school={school}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRefresh={fetchSchool}
              />
            )}
          </>
        ) : (
          <>
            {isCreating ? (
              <SchoolForm
                mode="create"
                onSuccess={handleCreateSuccess}
                onCancel={handleCancelCreate}
              />
            ) : (
              <CreateSchoolCard onCreate={handleCreate} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
