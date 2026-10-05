"use client";

import { useEffect } from "react";
import { TriangleAlertIcon } from "lucide-react";
import { ErrorState } from "@reading-advantage/ui";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RetryButton } from "./retry-button";

/** Props for RouteError. */
export interface RouteErrorProps {
  /** The thrown error (logged once). */
  error: Error & { digest?: string };
  /** The error boundary reset. */
  reset: () => void;
  /** The main message (the page heading). */
  title: string;
  /** A hint under the message. */
  description?: string;
  /** Where the second action goes. */
  backHref: string;
  /** Label of the second action. */
  backLabel: string;
}

/**
 * Error page body for a route error boundary: an alert with the message as the page heading,
 * a retry (48 px) that reloads the failed part, and a link to a safe page.
 * @param props The error, the reset, the copy, and the back link.
 * @returns The error state.
 */
export function RouteError({ error, reset, title, description, backHref, backLabel }: RouteErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      className="bg-card mx-auto my-8 w-full max-w-xl border"
      titleAs="h1"
      icon={<TriangleAlertIcon />}
      title={title}
      description={description}
      action={
        <>
          <RetryButton onRetry={reset} />
          <Link href={backHref} className={cn(buttonVariants({ variant: "outline" }), "min-h-12 px-6")}>
            {backLabel}
          </Link>
        </>
      }
    />
  );
}
