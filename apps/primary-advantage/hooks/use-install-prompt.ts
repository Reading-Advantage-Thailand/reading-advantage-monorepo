"use client";

import { useCallback, useEffect, useState } from "react";

/** Local storage key for the dismissal of the install notice. It stays on the device. */
export const INSTALL_DISMISS_KEY = "pwa-install-dismissed";

/** Visible state of the install notice: the iOS steps, the Chrome button, or nothing. */
export type InstallPromptState = "ios-steps" | "install-button" | "hidden";

/** The browser install event. Chrome fires it when the install criteria are met. */
export interface BeforeInstallPromptEvent extends Event {
  /** Opens the browser install dialog. */
  prompt: () => Promise<void>;
  /** Settles with the choice from the install dialog. */
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Checks standalone mode: the app already runs from the home screen.
 * @returns True in standalone display mode or with the iOS standalone flag.
 */
export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches) ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Checks iOS Safari: it never fires `beforeinstallprompt`, so the notice shows manual steps.
 * @returns True on an iPhone, iPad, or iPod outside standalone mode.
 */
export function isIosInstall(): boolean {
  if (typeof window === "undefined") return false;
  const navigatorWithFlag = window.navigator as Navigator & { standalone?: boolean };
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && navigatorWithFlag.standalone !== true;
}

/**
 * State of the PWA install notice for the student home. iOS Safari gets the manual steps;
 * Chrome gets an Install button once `beforeinstallprompt` fires. Standalone mode or a stored
 * dismissal hides the notice.
 * @returns The notice state, the install opener, and the dismissal setter.
 */
export function useInstallPrompt(): {
  state: InstallPromptState;
  promptInstall: () => Promise<void>;
  dismiss: () => void;
} {
  const [state, setState] = useState<InstallPromptState>("hidden");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandaloneDisplay() || localStorage.getItem(INSTALL_DISMISS_KEY) === "1") return;
    if (isIosInstall()) {
      setState("ios-steps");
      return;
    }
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setState("install-button");
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    try {
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setState("hidden");
      }
    } catch {
      return;
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    localStorage.setItem(INSTALL_DISMISS_KEY, "1");
    setDeferredPrompt(null);
    setState("hidden");
  }, []);

  return { state, promptInstall, dismiss };
}
