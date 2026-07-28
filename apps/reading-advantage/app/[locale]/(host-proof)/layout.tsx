import { ReactNode } from "react";

/**
 * Minimal layout for host-proof testing surfaces.
 * Keeps the page outside the (student) sidebar/i18n-heavy layout so the
 * cartridge client can render without pulling in app-wide navigation
 * widgets that require full locale message configuration.
 */
export default function HostProofLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
