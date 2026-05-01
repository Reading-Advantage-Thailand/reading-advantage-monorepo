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
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { UserCircle, GraduationCap, School, Ghost } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

// Define Role locally to avoid importing @prisma/client in client component
enum Role {
  USER = "USER",
  STUDENT = "STUDENT",
  TEACHER = "TEACHER",
  ADMIN = "ADMIN",
  SYSTEM = "SYSTEM",
}

type Props = {
  userId: string;
  userRole: string; // Changed from Role to string for broader compatibility
  className?: string;
};

export default function ChangeRole({ userId, userRole, className }: Props) {
  const roles: Array<{
    title: string;
    description: string;
    icon: React.ReactNode;
    value: Role;
    color: string;
  }> = [
    {
      title: "Student",
      description:
        "The Student role is designed for users who are enrolled in courses and participating in learning activities.",
      icon: <UserCircle size={32} />,
      value: Role.STUDENT,
      color: "blue",
    },
    {
      title: "Teacher",
      description:
        "The Teacher role is intended for users who are responsible for delivering course content and evaluating student performance.",
      icon: <GraduationCap size={32} />,
      value: Role.TEACHER,
      color: "blue",
    },
  ];

  if (process.env.NODE_ENV === "development") {
    roles.push(
      {
        title: "Admin",
        description: "Display only in development mode. (School Admin)",
        icon: <School size={32} />,
        value: Role.ADMIN,
        color: "red",
      },
      {
        title: "God",
        description: "Display only in development mode. (System Admin)",
        icon: <Ghost size={32} />,
        value: Role.SYSTEM,
        color: "red",
      },
    );
  }
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>(userRole);
  const { update } = useSession();
  const router = useRouter();

  async function handleRoleChange() {
    try {
      setIsLoading(true);
      // Update the user's role
      const response = await fetch(`/api/v1/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!response.ok) {
        throw new Error("Failed to update role.");
      }

      // update user session token
      await update({ user: { role: selectedRole } })
        .then(() => {
          console.log("Role updated in session.");
        })
        .catch((error) => {
          console.error("Failed to update role in session.", error);
        });

      toast({
        title: "Role updated.",
        description: `Changed role to ${selectedRole}.`,
      });

      // Redirect to appropriate page based on role
      if (selectedRole === Role.STUDENT) {
        router.push("/level");
      } else if (selectedRole === Role.TEACHER) {
        router.push("/teacher/my-classes");
      } else if (selectedRole === Role.ADMIN) {
        router.push("/admin/dashboard");
      } else if (selectedRole === Role.SYSTEM) {
        router.push("/system/dashboard");
      } else {
        router.refresh();
      }
    } catch (error) {
      toast({
        title: "An error occurred.",
        description: "Please try again later.",
        variant: "destructive",
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
        <p className="text-muted-foreground text-[0.8rem] mt-3">
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
        `relative overflow-hidden rounded-lg border shadow-2x hover:shadow-3x cursor-pointer hover:dark:bg-${color}-900`,
        isSelected && `dark:bg-${color}-900 hover:dark:bg-${color}-800`,
      )}
    >
      <div className="flex flex-col justify-between rounded-md p-3">
        {icon}
        <div className="space-y-1 mt-3">
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="text-[0.8rem] text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
};
