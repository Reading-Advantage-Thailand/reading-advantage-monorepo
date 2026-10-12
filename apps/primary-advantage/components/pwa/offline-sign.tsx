"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

/**
 * Offline sign for every signed-in page (Story S4). It shows a gold strip under the header while
 * the browser is offline and renders nothing when the network is back. It mounts in
 * `components/shared/app-layout.tsx`, so it never shows on the sign-in page.
 * @returns The sign, or nothing when online.
 */
export function OfflineSign(): ReactNode {
  const t = useTranslations("PwaInstall");
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!window.navigator.onLine);
    update();
    window.addEventListener("offline", update);
    window.addEventListener("online", update);
    return () => {
      window.removeEventListener("offline", update);
      window.removeEventListener("online", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="flex min-h-12 items-center justify-center bg-[var(--cq-gold)] px-4 py-2 text-center text-sm font-semibold text-[var(--cq-ink)]"
    >
      {t("offlineSign")}
    </div>
  );
}
