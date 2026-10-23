"use client";

import { useEffect } from "react";
import { isStorytimeHost } from "@/lib/storytime/host";
import { SERVICE_WORKER_SCOPE, SERVICE_WORKER_TYPE, SERVICE_WORKER_URL } from "@/lib/pwa/constants";

/**
 * Registers the Primary Advantage service worker once for each page load. The registration starts
 * the update check, so a phone with the legacy worker gets the new worker at the first page load.
 * @returns Nothing; the component renders no element.
 */
export function ServiceWorkerRegister(): null {
  useEffect(() => {
    // The Storytime QR host is a public page, not the app: no worker, so no install prompt.
    if (!("serviceWorker" in navigator) || isStorytimeHost(window.location.host)) return;
    navigator.serviceWorker
      .register(SERVICE_WORKER_URL, { scope: SERVICE_WORKER_SCOPE, type: SERVICE_WORKER_TYPE })
      .catch(() => undefined);
  }, []);
  return null;
}
