"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export function SessionSyncRedirect() {
  useEffect(() => {
    // With cookie-based auth, just redirect after a brief delay
    // No session update() needed — cookies are already set
    const timer = setTimeout(() => {
      window.location.href = "/student/read";
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground text-sm">Syncing your profile...</p>
    </div>
  );
}
