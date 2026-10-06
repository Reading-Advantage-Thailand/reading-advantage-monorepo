"use client";

import * as React from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

/**
 * Renders the light/dark theme switch with a localized accessible name.
 * @returns The theme toggle button.
 */
export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const t = useTranslations("AppShell");

  const toggleTheme = React.useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  return (
    <Button
      variant="ghost"
      className="group/toggle h-8 w-8 px-0 cursor-pointer"
      onClick={toggleTheme}
    >
      <SunIcon className="hidden [html.dark_&]:block" aria-hidden="true" />
      <MoonIcon className="hidden [html.light_&]:block" aria-hidden="true" />
      <span className="sr-only">{t("toggleTheme")}</span>
    </Button>
  );
}
