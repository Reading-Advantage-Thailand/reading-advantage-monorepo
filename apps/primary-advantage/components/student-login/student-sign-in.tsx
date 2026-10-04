"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CodeSignIn } from "./code-sign-in";
import { PasswordSignIn } from "./password-sign-in";

/**
 * Student part of the sign-in page. It starts with the class code sign-in and has a link to the
 * username and password form (and back). The QR card sign-in has its own page, `/auth/card`.
 * @returns The student sign-in.
 */
export function StudentSignIn() {
  const t = useTranslations("StudentSignIn.switch");
  const [mode, setMode] = useState<"code" | "password">("code");

  return (
    <div className="flex w-full flex-col gap-4">
      {mode === "code" ? <CodeSignIn /> : <PasswordSignIn />}
      <Button
        type="button"
        variant="link"
        className="h-auto min-h-12 text-base whitespace-normal motion-reduce:transition-none"
        onClick={() => setMode(mode === "code" ? "password" : "code")}
      >
        {mode === "code" ? t("usePassword") : t("useCode")}
      </Button>
    </div>
  );
}
