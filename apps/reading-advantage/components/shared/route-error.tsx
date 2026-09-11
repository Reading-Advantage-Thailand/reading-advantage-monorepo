"use client";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { env } from "@/lib/env";

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function RouteError({ error, reset }: RouteErrorProps) {
  return (
    <div className="mt-20 flex flex-col items-center justify-center space-y-4">
      <Image
        src={"/man-mage-light.svg"}
        alt="man-mage"
        width={92 * 2}
        height={115 * 2}
      />
      <h2 className="text-2xl font-bold text-center text-red-600 dark:text-red-400">
        Something went wrong
      </h2>
      {env.NODE_ENV === "development" && error.digest ? (
        <p className="text-center text-red-500 dark:text-red-300">
          {error.message}
          <br />
          <small>{error.stack}</small>
        </p>
      ) : null}
      <Button onClick={reset} variant={"destructive"}>
        Try again
      </Button>
    </div>
  );
}
