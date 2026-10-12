import type { MetadataRoute } from "next";

/**
 * Web app manifest for the installable Primary Advantage app.
 * @returns The manifest with the legacy app identity and the skin colours.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Primary Advantage",
    short_name: "Primary Advantage",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: "#5c391a",
    background_color: "#0f1420",
    icons: [
      {
        src: "/icons/primary-advantage-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/primary-advantage-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/primary-advantage-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
