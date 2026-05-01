"use client";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UserCircle, GraduationCap, School, Ghost } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import React, { useState } from "react";
import { Role } from "@/types/enum";

type Props = {
  userId: string;
  userRole: Role;
  className?: string;
};

export default function ChangeRole({ userId, userRole, className }: Props) {
  const roles = [
    {
      title: "Student",
      description:
        "The Student role is designed for users who are enrolled in courses and participating in learning activities.",
      icon: <UserCircle size={32} />,
      value: Role.student,
      color: "blue",
    },
    {
      title: "Teacher",
      description:
        "The Teacher role is intended for users who are responsible for delivering course content and evaluating student performance.",
      icon: <GraduationCap size={32} />,
      value: Role.teacher,
      color: "blue",
    },
  ];

  if (process.env.NODE_ENV === "development") {
    roles.push(
      {
        title: "Admin",
        description: "Display only in development mode. (School Admin)",
        icon: <School size={32} />,
        value: Role.admin,
        color: "red",
      },
      {
        title: "System",
        description: "Display only in development mode. (System Admin)",
        icon: <Ghost size={32} />,
        value: Role.system,
        color: "red",
      },
    );
  }
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>(userRole);
  const { update } = useSession();
  const router = useRouter();

  async function handleRoleChange() {
    try {
      setIsLoading(true);
      // Update the user's role
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!response.ok) {
        throw new Error("Failed to update role.");
      }

      // update user session token
      //   await update({ user: { role: selectedRole } })
      //     .then(() => {
      //       console.log("Role updated in session.");
      //     })
      //     .catch((error) => {
      //       console.error("Failed to update role in session.", error);
      //     });

      //   // refresh the page
      //   router.refresh();
      await update({
        user: { role: selectedRole },
      });

      toast("Role updated.", {
        description: `Changed role to ${selectedRole}.`,
      });
    } catch (error) {
      toast("An error occurred.", {
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-primary">Roles</CardTitle>
        <CardDescription>
          Each role in our system has specific permissions and responsibilities
          associated with it. And your current role is{" "}
          <strong className="dark:text-blue-500">{userRole}</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        {roles.map((role, index) => (
          <RoleSelectionItem
            onClick={() =>
              setSelectedRole((prevRole) =>
                prevRole === role.value ? userRole : role.value,
              )
            }
            key={index}
            {...role}
            isSelected={selectedRole === role.value}
          />
        ))}
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground mt-3 text-[0.8rem]">
          Changing your role will affect the permissions and access you have on
          the platform.
        </p>
        <Button
          variant="secondary"
          size="sm"
          disabled={isLoading || userRole === selectedRole}
          onClick={handleRoleChange}
        >
          {isLoading && (
            <span className="mr-2">
              <Icons.spinner className="h-4 w-4 animate-spin" />
            </span>
          )}
          Update role to {selectedRole}
        </Button>
      </CardFooter>
    </Card>
  );
}

const RoleSelectionItem = ({
  title,
  description,
  icon,
  isSelected,
  onClick,
  color,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  isSelected: boolean;
  onClick: () => void;
  color: string;
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        `shadow-2x hover:shadow-3x relative cursor-pointer overflow-hidden rounded-lg border hover:dark:bg-${color}-900`,
        isSelected && `dark:bg-${color}-900 hover:dark:bg-${color}-800`,
      )}
    >
      <div className="flex flex-col justify-between rounded-md p-3">
        {icon}
        <div className="mt-3 space-y-1">
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="text-muted-foreground text-[0.8rem]">{description}</p>
        </div>
      </div>
    </div>
  );
};
