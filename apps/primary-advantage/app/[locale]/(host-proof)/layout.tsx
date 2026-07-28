import { ReactNode } from "react";

/**
 * Minimal layout for host-proof testing surfaces.
 * Keeps the page outside the main app shell so the cartridge client can render
 * without pulling in locale-heavy navigation widgets.
 */
export default function HostProofLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
