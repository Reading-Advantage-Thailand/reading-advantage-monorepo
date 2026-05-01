"use client";

import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import {
  UserPlus,
  Upload,
  FileText,
  Users,
  GraduationCap,
  Settings,
  BarChart3,
  Download,
} from "lucide-react";
import { Link } from "@/i18n/navigation";

export function AdminQuickActions() {
  const t = useTranslations("AdminDashboard");

  const actions = [
    {
      title: t("quickActions.addTeacher"),
      description: t("quickActions.addTeacherDesc"),
      href: "/admin/teachers/add",
      icon: UserPlus,
      variant: "default" as const,
    },
    {
      title: t("quickActions.addStudent"),
      description: t("quickActions.addStudentDesc"),
      href: "/admin/students/add",
      icon: GraduationCap,
      variant: "outline" as const,
    },
    {
      title: t("quickActions.createArticle"),
      description: t("quickActions.createArticleDesc"),
      href: "/admin/article-creation",
      icon: FileText,
      variant: "outline" as const,
    },
    {
      title: t("quickActions.importData"),
      description: t("quickActions.importDataDesc"),
      href: "/admin/import-data",
      icon: Upload,
      variant: "outline" as const,
    },
    {
      title: t("quickActions.viewReports"),
      description: t("quickActions.viewReportsDesc"),
      href: "/admin/dashboard/reports",
      icon: BarChart3,
      variant: "outline" as const,
    },
    {
      title: t("quickActions.manageClassrooms"),
      description: t("quickActions.manageClassroomsDesc"),
      href: "/admin/students/classrooms",
      icon: Users,
      variant: "outline" as const,
    },
  ];

  return (
    <div className="space-y-3">
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <Button
            key={index}
            variant={action.variant}
            className="h-auto w-full justify-start p-4"
            asChild
          >
            <Link href={action.href}>
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-medium">{action.title}</div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    {action.description}
                  </div>
                </div>
              </div>
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
