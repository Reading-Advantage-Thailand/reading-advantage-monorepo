"use client";
import React from "react";
import { Button } from "./ui/button";
import { BadgeCheck } from "lucide-react";
import { Icons } from "./icons";
import { useRouter } from "next/navigation";

export default function GoogleClassroomButtonLink({
  status,
}: {
  status: boolean;
}) {
  const router = useRouter();
  const handleLinkGoogleClassroom = async () => {
    const res = await fetch("/api/v1/classroom/oauth2/link", {
      method: "GET",
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Error linking Google Classroom:", data);
      return;
    }
    if (data.authUrl) {
      window.location.href = data.authUrl;
    }
    // router.push(data.authUrl);
    // router.push("/settings/user-profile");
  };
  const handleUnlinkGoogleClassroom = async () => {
    const res = await fetch("/api/v1/classroom/oauth2/unlink", {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) {
      const error = await res.json();
      console.error("Error unlinking Google Classroom:", error);
      return;
    }
    router.refresh();
  };
  return (
    <>
      {status ? (
        <Button
          variant="secondary"
          className="rounded-lg border shadow px-3 py-2 my-2"
          onClick={() => handleUnlinkGoogleClassroom()}
        >
          <span className="text-red-800 dark:text-red-300 flex items-center gap-1">
            <Icons.unVerified size={16} />
            Unlink
          </span>
        </Button>
      ) : (
        <Button
          variant="secondary"
          className="rounded-lg border shadow px-3 py-2 my-2"
          onClick={() => handleLinkGoogleClassroom()}
        >
          <span className="text-green-800 dark:text-green-300 flex items-center gap-1">
            <BadgeCheck size={16} />
            Link
          </span>
        </Button>
      )}
    </>
  );
}
