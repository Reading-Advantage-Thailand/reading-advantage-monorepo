"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  User,
  Mail,
  Calendar,
  Edit,
  Users,
  Shield,
  Trash2,
  UserMinus,
  Loader2,
  Key,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "sonner";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AddAdminDialog } from "./add-admin-dialog";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
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

interface SchoolDetailProps {
  school: School;
  onEdit: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}

export function SchoolDetail({
  school,
  onEdit,
  onDelete,
  onRefresh,
}: SchoolDetailProps) {
  const currentUser = useCurrentUser();
  const [isDeleting, setIsDeleting] = useState(false);
  const [removingAdminId, setRemovingAdminId] = useState<string | null>(null);
  const { data: session, update } = useSession();
  const router = useRouter();
  const t = useTranslations("Settings.schoolProfile");
  const isOwner = currentUser?.id === school.ownerId;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch("/api/users/me/school", {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete school");
      }

      if (response.ok) {
        await update({
          ...session,
          user: { ...session?.user, role: "User" },
        });
      }

      toast.success("School deleted successfully!");
      onDelete();
    } catch (error) {
      toast.error("Failed to delete school", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      });
    } finally {
      setIsDeleting(false);
      router.refresh();
    }
  };

  const handleRemoveAdmin = async (adminId: string, adminName: string) => {
    setRemovingAdminId(adminId);
    try {
      const response = await fetch(`/api/users/me/school/admins/${adminId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to remove admin");
      }

      toast.success(`${adminName} removed as admin successfully!`);
      onRefresh();
    } catch (error) {
      toast.error("Failed to remove admin", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      });
    } finally {
      setRemovingAdminId(null);
    }
  };
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t("schoolInformation")}
            </CardTitle>
            <CardDescription>
              {t("schoolInformationDescription")}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={onEdit} variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              {t("editSchoolButton")}
            </Button>
            {isOwner && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isDeleting}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("delete")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("deleteSchool")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("deleteSchoolDescription")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? t("deleting") : t("deleteSchoolButton")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="text-muted-foreground text-sm font-medium">
                  {t("schoolName")}
                </label>
                <p className="text-lg font-semibold">{school.name}</p>
              </div>

              {school.contactName && (
                <div>
                  <label className="text-muted-foreground flex items-center gap-1 text-sm font-medium">
                    <User className="h-4 w-4" />
                    {t("contactName")}
                  </label>
                  <p className="text-base">{school.contactName}</p>
                </div>
              )}

              {school.contactEmail && (
                <div>
                  <label className="text-muted-foreground flex items-center gap-1 text-sm font-medium">
                    <Mail className="h-4 w-4" />
                    {t("contactEmail")}
                  </label>
                  <p className="text-base">{school.contactEmail}</p>
                </div>
              )}

              {school.owner && (
                <div>
                  <label className="text-muted-foreground flex items-center gap-1 text-sm font-medium">
                    <Shield className="h-4 w-4" />
                    {t("owner")}
                  </label>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-medium">{school.owner.name}</p>
                    {isOwner && (
                      <Badge variant="secondary" className="text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {school.owner.email}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-muted-foreground flex items-center gap-1 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  {t("createdAt")}
                </label>
                <p className="text-base">
                  {format(new Date(school.createdAt), "PPP")}
                </p>
              </div>

              <div>
                <label className="text-muted-foreground text-sm font-medium">
                  {t("updatedAt")}
                </label>
                <p className="text-base">
                  {format(new Date(school.updatedAt), "PPP")}
                </p>
              </div>

              {school._count && (
                <div className="space-y-2">
                  <div>
                    <label className="text-muted-foreground flex items-center gap-1 text-sm font-medium">
                      <Users className="h-4 w-4" />
                      {t("totalUsers")}
                    </label>
                    <Badge variant="secondary" className="text-base">
                      {school._count.users} users
                    </Badge>
                  </div>
                  <div>
                    <label className="text-muted-foreground flex items-center gap-1 text-sm font-medium">
                      <Shield className="h-4 w-4" />
                      {t("totalAdmins")}
                    </label>
                    <Badge variant="outline" className="text-base">
                      {school._count.admins} admins
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {t("license")}
          </CardTitle>
          <CardDescription>{t("licensedescription")}</CardDescription>
        </CardHeader>
        {school.license ? (
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="text-muted-foreground text-sm font-medium">
                    License Name
                  </label>
                  <p className="text-lg font-semibold">{school.license.name}</p>
                </div>

                {school.license.description && (
                  <div>
                    <label className="text-muted-foreground text-sm font-medium">
                      Description
                    </label>
                    <p className="text-base">{school.license.description}</p>
                  </div>
                )}

                <div>
                  <label className="text-muted-foreground text-sm font-medium">
                    License Key
                  </label>
                  <p className="bg-muted rounded px-2 py-1 font-mono text-sm">
                    {school.license.key}
                  </p>
                </div>

                <div>
                  <label className="text-muted-foreground flex items-center gap-1 text-sm font-medium">
                    <Users className="h-4 w-4" />
                    Max Users
                  </label>
                  <p className="text-base font-semibold">
                    {school.license.maxUsers} users
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-muted-foreground flex items-center gap-1 text-sm font-medium">
                    Status
                  </label>
                  <div className="flex items-center gap-2">
                    {school.license.status === "active" ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : school.license.status === "expired" ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                    <Badge
                      variant={
                        school.license.status === "active"
                          ? "default"
                          : school.license.status === "expired"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {school.license.status.charAt(0).toUpperCase() +
                        school.license.status.slice(1)}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-muted-foreground flex items-center gap-1 text-sm font-medium">
                    <Calendar className="h-4 w-4" />
                    Start Date
                  </label>
                  <p className="text-base">
                    {format(new Date(school.license.startDate), "PPP")}
                  </p>
                </div>

                {school.license.expiryDate && (
                  <div>
                    <label className="text-muted-foreground flex items-center gap-1 text-sm font-medium">
                      <Calendar className="h-4 w-4" />
                      Expiry Date
                    </label>
                    <p className="text-base">
                      {format(new Date(school.license.expiryDate), "PPP")}
                    </p>
                  </div>
                )}

                {school.license.expiryDays && (
                  <div>
                    <label className="text-muted-foreground text-sm font-medium">
                      License Duration
                    </label>
                    <p className="text-base">
                      {school.license.expiryDays} days
                    </p>
                  </div>
                )}

                {school._count && (
                  <div>
                    <label className="text-muted-foreground text-sm font-medium">
                      Current Usage
                    </label>
                    <div className="flex items-center gap-2">
                      <p className="text-base">
                        {school._count.users} / {school.license.maxUsers} users
                      </p>
                      <div className="bg-muted h-2 flex-1 rounded-full">
                        <div
                          className={`h-2 rounded-full ${
                            (school._count.users / school.license.maxUsers) *
                              100 >
                            90
                              ? "bg-red-500"
                              : (school._count.users /
                                    school.license.maxUsers) *
                                    100 >
                                  75
                                ? "bg-yellow-500"
                                : "bg-green-500"
                          }`}
                          style={{
                            width: `${Math.min(
                              (school._count.users / school.license.maxUsers) *
                                100,
                              100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        ) : (
          <CardContent>
            <p>No license found</p>
          </CardContent>
        )}
      </Card>

      {school.admins && school.admins.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t("schoolAdmin")}
              </CardTitle>
              <CardDescription>{t("schoolAdminDescription")}</CardDescription>
            </div>
            {isOwner && (
              <AddAdminDialog schoolId={school.id} onAdminAdded={onRefresh} />
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {school.admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 rounded-full p-2">
                      <User className="text-primary h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{admin.user.name}</p>
                      <p className="text-muted-foreground text-sm">
                        {admin.user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Admin</Badge>
                    {isOwner && admin.user.id === currentUser?.id && (
                      <Badge>Owner</Badge>
                    )}
                    {isOwner && admin.user.id !== currentUser?.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={removingAdminId === admin.id}
                          >
                            {removingAdminId === admin.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserMinus className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Admin</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove{" "}
                              <strong>{admin.user.name}</strong> as an admin?
                              They will lose administrative privileges for this
                              school.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleRemoveAdmin(admin.id, admin.user.name)
                              }
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove Admin
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
