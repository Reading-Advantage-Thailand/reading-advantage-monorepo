"use client";

import { Header } from "@/components/header";
import { Separator } from "@/components/ui/separator";
import { SchoolDetail } from "@/components/school/school-detail";
import { EditSchoolForm } from "@/components/school/edit-school-form";
import { CreateSchoolCard } from "@/components/school/create-school-card";
import { SchoolProfileForm } from "@/components/school/school-profile-form";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Icons } from "@/components/icons";
import { useTranslations } from "next-intl";

interface SchoolAdmin {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface License {
  id: string;
  key: string;
  name: string;
  description?: string;
  maxUsers: number;
  startDate: Date;
  expiryDate?: Date;
  expiryDays?: number;
  status: string;
}

interface School {
  id: string;
  name: string;
  contactName?: string;
  contactEmail?: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId?: string;
  _count?: {
    users: number;
    admins: number;
  };
  admins?: SchoolAdmin[];
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  license?: License;
}

export default function SchoolProfileSettingsPage() {
  const t = useTranslations("Settings.schoolProfile");
  const [school, setSchool] = useState<School | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const fetchSchool = async () => {
    try {
      const response = await fetch("/api/users/me/school");
      if (response.ok) {
        const data = await response.json();
        setSchool(data.school);
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchool();
  }, []);

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

  if (isLoading) {
    return (
      <div>
        <Header heading={t("title")} text={t("subtitle")} />
        <Separator className="my-4" />
        <div className="flex items-center justify-center py-12">
          <Icons.spinner className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header heading={t("title")} text={t("subtitle")} />
      <Separator className="my-4" />

      <div className="space-y-6">
        {school ? (
          <>
            {isEditing ? (
              <EditSchoolForm
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
              <SchoolProfileForm
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
