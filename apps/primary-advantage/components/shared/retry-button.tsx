"use client";

import { startTransition } from "react";
import { RotateCcwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Retry button for a failed load (48 px tap target). It reloads the server data of the page;
 * inside an error boundary it also calls the boundary reset, so the failed part renders again.
 * @param props.onRetry The error boundary reset, when there is one.
 * @param props.className Extra classes.
 * @returns The button.
 */
export function RetryButton({ onRetry, className }: { onRetry?: () => void; className?: string }) {
  const t = useTranslations("Error");
  const router = useRouter();
  return (
    <Button
      type="button"
      className={cn("min-h-12 px-6", className)}
      onClick={() =>
        startTransition(() => {
          router.refresh();
          onRetry?.();
        })
      }
    >
      <RotateCcwIcon aria-hidden="true" />
      {t("retry")}
    </Button>
  );
}
