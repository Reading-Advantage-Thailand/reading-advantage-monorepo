"use client";
import { useEffect } from "react";
import Link from "next/link";
import { User } from "next-auth";
import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user-avatar";
import { useScopedI18n } from "@/locales/client";
import { Icons } from "./icons";
import { Badge } from "./ui/badge";
import { useState } from "react";
import { Role } from "@prisma/client";

interface UserAccountNavProps {
  user: User;
}

export function UserAccountNav({ user }: UserAccountNavProps) {
  const t = useScopedI18n("components.userAccountNav");
  const td = useScopedI18n("components.userAccountNav.users");
  const [isLoading, setIsLoading] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number>(0);
  const currentDate = new Date();
  const expirationDate = new Date(user.expired_date);

  useEffect(() => {
    const calculateDaysBetween = () => {
      const timeDifference = expirationDate.getTime() - currentDate.getTime();
      const daysDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24)); // Convert milliseconds to days
      setDaysLeft(daysDifference);
    };

    calculateDaysBetween();
  }, [currentDate, expirationDate]);

  const roles = {
    system: { label: "system", color: "bg-[#FFC107]" },
    admin: { label: "admin", color: "bg-[#DC3545]" },
    teacher: { label: "teacher", color: "bg-[#007BFF]" },
    student: { label: "student", color: "bg-[#28A745]" },
    user: { label: "user", color: "bg-[#6C757D]" },
  };

  const userRoleLowerCase = user.role.toLowerCase() as keyof typeof roles;
  const { label, color } = roles[userRoleLowerCase];

  return (
    <div id="onborda-usermanu">
      <DropdownMenu>
        <DropdownMenuTrigger>
          <UserAvatar
            user={{
              name: user.display_name || null,
              image: user.picture || null,
            }}
            className="h-8 w-8 border-2 border-border rounded-full cursor-pointer"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="md:w-56 lg:w-fit">
          <div className="flex items-center justify-start gap-2 p-2">
            <div className="flex flex-col space-y-1 leading-none">
              <p className="font-medium line-clamp-1">{user.display_name}</p>
              <p className="w-[200px] truncate text-sm text-muted-foreground line-clamp-1">
                {user.email}
              </p>
              {/* Check if the user's email is verified */}
              {!user.email_verified && (
                <Link href="/settings/user-profile">
                  <button className="w-[200px] text-start truncate text-sm text-red-500 flex items-center">
                    <Icons.unVerified className="inline-block mr-1 w-4 h-4" />
                    Not verified email
                  </button>
                </Link>
              )}

              <div className="inline-flex gap-1">
                <Badge className={`${color} w-max`} variant="outline">
                  {td(userRoleLowerCase)}
                </Badge>
                {daysLeft > 0 ? ( // Check if the user has a free trial
                  <Badge className="bg-green-700 w-max" variant="outline">
                    {t("daysLeft", { daysLeft })}
                  </Badge>
                ) : (
                  <Badge className="bg-red-700 w-max" variant="outline">
                    {t("expires")}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <DropdownMenuSeparator />
          {/* Role-based menu items */}
          {
            // Check if the user is a student, teacher, admin, or system
            user.cefr_level !== "" ? (
              <DropdownMenuItem asChild>
                <Link href="/student/read">{t("learningpage")}</Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem asChild>
                <Link href="/level">{t("leveltest")}</Link>
              </DropdownMenuItem>
            )
          }
          {
            // Check if the user is a teacher, admin, or system
            (user.role === Role.TEACHER ||
              user.role === Role.ADMIN ||
              user.role === Role.SYSTEM) && (
              <DropdownMenuItem asChild>
                <Link href="/teacher/my-classes">{t("teacherpage")}</Link>
              </DropdownMenuItem>
            )
          }
          {
            // Check if the user is an admin or system
            (user.role === Role.ADMIN || user.role === Role.SYSTEM) && (
              <DropdownMenuItem asChild>
                <Link href="/admin/dashboard">{t("adminpage")}</Link>
              </DropdownMenuItem>
            )
          }
          {user.role === Role.SYSTEM && (
            <DropdownMenuItem asChild>
              <Link href="/system/dashboard">{t("systempage")}</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link
              target="_blank"
              href="https://docs.google.com/forms/d/e/1FAIpQLSe_Ew100kef6j4O4IuiHm4ZeGhOj5FN6JRyJ7-0gvZV9eFgjQ/viewform?usp=sf_link"
            >
              {t("contactUs")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings/user-profile">{t("settings")}</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={async (event) => {
              event.preventDefault();
              setIsLoading(true);
              await signOut({ callbackUrl: `/` });
              setIsLoading(false);
            }}
          >
            {isLoading && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t("signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
