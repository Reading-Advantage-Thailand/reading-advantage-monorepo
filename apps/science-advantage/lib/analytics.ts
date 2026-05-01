type AnalyticsPayload = Record<string, unknown>;

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: AnalyticsPayload) => void;
    };
  }
}

export function track(event: string, data?: AnalyticsPayload) {
  if (typeof window !== "undefined" && typeof window.umami?.track === "function") {
    window.umami.track(event, data);
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(`[analytics] ${event}`, data ?? {});
  }
}
