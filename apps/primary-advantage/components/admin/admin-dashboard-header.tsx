"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";
import {
  Plus,
  Settings,
  Bell,
  Download,
  Upload,
  Users,
  MoreVertical,
} from "lucide-react";
import { Link } from "@/i18n/navigation";

export function AdminDashboardHeader() {
  const t = useTranslations("AdminDashboard");

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Desktop Actions */}
      <div className="hidden items-center gap-2 md:flex">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/import-data">
            <Upload className="mr-2 h-4 w-4" />
            {t("actions.importData")}
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/dashboard/reports">
            <Download className="mr-2 h-4 w-4" />
            Reports
          </Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/admin/teachers/add">
            <Plus className="mr-2 h-4 w-4" />
            {t("actions.addTeacher")}
          </Link>
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
          >
            3
          </Badge>
        </Button>
      </div>

      {/* Mobile Actions */}
      <div className="flex items-center gap-2 md:hidden">
        <Button size="sm" asChild>
          <Link href="/admin/teachers/add">
            <Plus className="mr-2 h-4 w-4" />
            Add Teacher
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/students/add">
                <Users className="mr-2 h-4 w-4" />
                Add Student
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/import-data">
                <Upload className="mr-2 h-4 w-4" />
                Import Data
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/dashboard/reports">
                <Download className="mr-2 h-4 w-4" />
                Reports
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mobile Notifications */}
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
          >
            3
          </Badge>
        </Button>
      </div>
    </div>
  );
}
