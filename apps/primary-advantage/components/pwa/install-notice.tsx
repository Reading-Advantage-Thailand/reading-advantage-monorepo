"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Panel, RpgButton } from "@/components/rpg/chrome";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

/**
 * Pinned install notice for the student home (Story S3). iOS Safari shows the Share steps;
 * Chrome shows an Install button once `beforeinstallprompt` fires. Standalone mode or a stored
 * dismissal renders nothing. It mounts only on the student home, never in a lesson or a reading.
 * @returns The notice, or nothing when hidden.
 */
export function InstallNotice(): ReactNode {
  const t = useTranslations("PwaInstall");
  const { state, promptInstall, dismiss } = useInstallPrompt();

  if (state === "hidden") return null;

  return (
    <Panel pinned aria-labelledby="pwa-install-title">
      <div className="grid grid-cols-[64px_1fr] items-center gap-3">
        <img src="/icons/primary-advantage-192.png" alt="" className="w-16" />
        <div className="flex flex-col gap-2">
          <h2 id="pwa-install-title" className="text-lg font-semibold">
            {t("title")}
          </h2>
          {state === "ios-steps" ? (
            <ol className="cq-muted list-decimal space-y-1 pl-5 text-sm">
              <li>{t("iosShare")}</li>
              <li>{t("iosAdd")}</li>
              <li>{t("iosConfirm")}</li>
            </ol>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {state === "install-button" ? (
              <RpgButton tone="gold" onClick={() => void promptInstall()}>
                {t("install")}
              </RpgButton>
            ) : null}
            <RpgButton tone="iron" onClick={dismiss}>
              {t("dismiss")}
            </RpgButton>
          </div>
        </div>
      </div>
    </Panel>
  );
}
