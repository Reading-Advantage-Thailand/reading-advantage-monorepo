import React from "react";
import { siteConfig } from "@/configs/site-config";
import { Link } from "@/i18n/navigation";
import { Icons } from "@/components/icons";
import { LocaleSwitcher } from "@/components/switchers/locale-switcher";
import { Scene } from "@/components/rpg/scene";

/**
 * Layout of the sign-in screens: the gatehouse behind, the brand, the language menu, and the
 * form on parchment (docs/primary-rpg-skin.md §4).
 * @param props.children The sign-in page.
 * @returns The layout.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Scene place="gatehouse" className="min-h-screen px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <Link href="/" className="cq-on-scene flex items-center gap-2">
          <Icons.logo />
          <span className="text-lg font-bold">{siteConfig.name}</span>
        </Link>
        {/* The language menu on the sign-in screens (FR-8; audit C12: there was none). */}
        <LocaleSwitcher />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="cq-panel w-full max-w-md">{children}</div>
      </div>
      <p className="cq-on-scene text-center text-sm">{siteConfig.description}</p>
    </Scene>
  );
}
