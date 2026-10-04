"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  Users,
  UserPlus,
  BarChart3,
  Settings,
  ArrowLeft,
  GraduationCap,
} from "lucide-react";
import { Card } from "@/components/ui/card";

interface ClassroomNavigationProps {
  classroom: {
    id: string;
    name: string;
    grade?: string;
    studentCount: number;
  };
  showBackButton?: boolean;
}

export default function ClassroomNavigation({
  classroom,
  showBackButton = true,
}: ClassroomNavigationProps) {
  const router = useRouter();
  const t = useTranslations("Teacher.ClassroomNavigation");
  const tComponents = useTranslations("Components");

  const navigationItems = [
    {
      label: t("nav.classRoster"),
      icon: Users,
      href: `/teacher/class-roster/${classroom.id}`,
      current: true,
    },
    // {
    //   label: "Enrollment",
    //   icon: UserPlus,
    //   href: `/teacher/class-roster/${classroom.id}/enrollment`,
    // },
    {
      label: t("nav.reports"),
      icon: BarChart3,
      href: `/teacher/reports?classroomId=${classroom.id}`,
    },
    {
      label: t("nav.settings"),
      icon: Settings,
      href: `/teacher/my-classes?edit=${classroom.id}`,
    },
  ];

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  const handleBackToClassrooms = () => {
    router.push("/teacher/class-roster");
  };

  return (
    <Card className="border-b">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        {/* Left side - Classroom info */}
        <div className="flex items-center gap-4">
          {showBackButton && (
            <Button
              onClick={handleBackToClassrooms}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 sm:hidden"
              aria-label={t("actions.backToClassrooms")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <GraduationCap className="h-5 w-5 text-blue-600" />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold sm:text-xl">
                {classroom.name}
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>
                  {t("info.students", { count: classroom.studentCount })}
                </span>
                {classroom.grade && (
                  <>
                    <span>•</span>
                    <span>{t("info.grade", { grade: classroom.grade })}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Navigation menu */}
        <div className="flex items-center gap-2">
          {/* Desktop navigation */}
          <div className="hidden space-x-1 sm:flex">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.href}
                  onClick={() => handleNavigation(item.href)}
                  variant={item.current ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                  aria-label={item.label}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden lg:block">{item.label}</span>
                </Button>
              );
            })}
          </div>

          {/* Mobile dropdown menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 sm:hidden"
                aria-label={tComponents("openActionsMenu")}
              >
                <Users className="h-4 w-4" />
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {navigationItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <React.Fragment key={item.href}>
                    <DropdownMenuItem
                      onClick={() => handleNavigation(item.href)}
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </DropdownMenuItem>
                    {index === 1 && <DropdownMenuSeparator />}
                  </React.Fragment>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleBackToClassrooms}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("actions.backToClassrooms")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Desktop back button */}
          {showBackButton && (
            <Button
              onClick={handleBackToClassrooms}
              variant="outline"
              size="sm"
              className="hidden gap-2 sm:flex"
              aria-label={t("actions.back")}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden lg:block">{t("actions.back")}</span>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
