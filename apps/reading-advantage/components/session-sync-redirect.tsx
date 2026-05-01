"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";

export function SessionSyncRedirect() {
  const { update } = useSession();

  useEffect(() => {
    const syncAndRedirect = async () => {
      // Force update the session with latest data from server
      await update();
      // Hard redirect to ensure fresh state and prevent Next.js router loops
      // Using window.location.href instead of router.push to guarantee a full reload/redirect
      window.location.href = "/student/read";
    };

    syncAndRedirect();
  }, [update]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground text-sm">Syncing your profile...</p>
    </div>
  );
}
