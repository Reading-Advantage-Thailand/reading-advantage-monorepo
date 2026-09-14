"use client";
import React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

/**
 * Retries the flashcard dashboard load through the router.
 * @returns A button that refreshes the current route.
 */
export function DashboardRetryButton() {
  const router = useRouter();
  return (
    <Button
      onClick={() => router.refresh()}
      variant="outline"
      className="h-12 px-6"
    >
      <RefreshCw className="mr-2 h-4 w-4" />
      Try Again
    </Button>
  );
}
