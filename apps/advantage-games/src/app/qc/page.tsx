import type { Metadata } from "next";

import { APKQCLab } from "@/features/apk-qc/APKQCLab";

export const metadata: Metadata = {
  title: "APK QC Lab | Advantage Games",
  description: "Local Phaser cartridge and audience-edition proving ground.",
};

/**
 * Renders the unauthenticated local APK quality-control workshop.
 * @returns The APK QC lab page.
 */
export default function APKQCPage() {
  return <APKQCLab />;
}
