"use client";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user-avatar";
import { Loader2, LogOutIcon } from "lucide-react";
import { Badge } from "../ui/badge";
import { Role } from "@/types/enum";
import { User } from "next-auth";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTranslations } from "next-intl";

interface UserAccountNavProps {
  user: User;
}

export function UserAccountNav({ user }: UserAccountNavProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const t = useTranslations("MainNav.usernav");
  const tr = useTranslations("Overall.roles");

  const roles = {
    system: { label: tr("system"), color: "bg-[#FFC107]" },
    admin: { label: tr("admin"), color: "bg-[#DC3545]" },
    teacher: { label: tr("teacher"), color: "bg-[#007BFF]" },
    student: { label: tr("student"), color: "bg-[#28A745]" },
    user: { label: tr("user"), color: "bg-[#6C757D]" },
  };

  const { label, color } = roles[(user?.role as keyof typeof roles) || "user"];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <UserAvatar
          user={{
            name: user?.name || "",
            image: user?.image || "",
          }}
          className="border-muted-foreground h-8 w-8 cursor-pointer border"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="md:w-56 lg:w-fit">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            <p className="line-clamp-1 font-medium">{user?.name}</p>
            <p className="text-muted-foreground line-clamp-1 w-[200px] truncate text-sm">
              {user?.email}
            </p>
            {/* Check if the user's email is verified */}
            {/* {!user.email_verified && (
                <Link href="/settings/user-profile">
                  <button className="w-[200px] text-start truncate text-sm text-red-500 flex items-center">
                    <ShieldX className="inline-block mr-1 w-4 h-4" />
                    Not verified email
                  </button>
                </Link>
              )} */}

            <div className="inline-flex gap-1">
              <Badge className={`${color} w-max capitalize`} variant="outline">
                {label}
              </Badge>
              {/* {daysLeft > 0 ? ( // Check if the user has a free trial
                <Badge className="bg-green-700 w-max" variant="outline">
                  {t("daysLeft", { daysLeft })}
                </Badge>
              ) : (
                <Badge className="bg-red-700 w-max" variant="outline">
                  {t("expires")}
                </Badge>
              )} */}
            </div>
          </div>
        </div>
        <DropdownMenuSeparator />
        {/* Role-based menu items */}
        <div className="text-muted-foreground px-2 py-1.5 text-sm font-semibold">
          {t("navigation")}
        </div>
        <DropdownMenuItem asChild>
          <Link href="/student/read" className="flex items-center">
            <span>{t("studentDashboard")}</span>
          </Link>
        </DropdownMenuItem>
        {/* {user?.cefrLevel !== "" ? (
          <DropdownMenuItem asChild>
            <Link href="/student/read" className="flex items-center">
              <span>Student Dashboard</span>
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <Link href="/level" className="flex items-center">
              <span>Take Level Test</span>
            </Link>
          </DropdownMenuItem>
        )} */}
        {(user?.role === Role.teacher ||
          user?.role === Role.admin ||
          user?.role === Role.system) && (
          <DropdownMenuItem asChild>
            <Link href="/teacher/my-classes" className="flex items-center">
              <span>{t("teacherDashboard")}</span>
            </Link>
          </DropdownMenuItem>
        )}
        {(user?.role === Role.admin || user?.role === Role.system) && (
          <DropdownMenuItem asChild>
            <Link href="/admin" className="flex items-center">
              <span>{t("adminDashboard")}</span>
            </Link>
          </DropdownMenuItem>
        )}
        {user?.role === Role.system && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/system/dashboard" className="flex items-center">
                <span>{t("systemDashboard")}</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <div className="text-muted-foreground px-2 py-1.5 text-sm font-semibold">
          {t("account")}
        </div>
        <DropdownMenuItem asChild>
          <Link
            target="_blank"
            href="https://docs.google.com/forms/d/e/1FAIpQLSe_Ew100kef6j4O4IuiHm4ZeGhOj5FN6JRyJ7-0gvZV9eFgjQ/viewform?usp=sf_link"
            className="flex items-center"
          >
            <span>{t("contactUs")}</span>
          </Link>
        </DropdownMenuItem>
        {user?.role !== Role.student && (
          <DropdownMenuItem asChild>
            <Link href="/settings/user-profile" className="flex items-center">
              <span>{t("settings")}</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600"
          onClick={async (event) => {
            event.preventDefault();
            setIsLoading(true);
            await signOut({ callbackUrl: `/` });
            setIsLoading(false);
          }}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {!isLoading && <LogOutIcon className="h-4 w-4" color="red" />}
          {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
