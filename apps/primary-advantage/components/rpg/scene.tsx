import type { ReactNode } from "react";
import { backdropFiles, type Place } from "@/lib/rpg/places";
import { cn } from "@/lib/utils";

/**
 * A place of the skin (docs/primary-rpg-skin.md rule 3): the Forge backdrop fixed behind the
 * page at the phone or desktop aspect, a vignette, and the page content over it. Night mode
 * darkens the backdrop through the stylesheet.
 * @param props.place The Forge scene.
 * @param props.dim True blurs and darkens the backdrop, for a reading page.
 * @param props.className Extra classes for the content wrapper.
 * @param props.children The page content.
 * @returns The scene.
 */
export function Scene({ place, dim, className, children }: { place: Place; dim?: boolean; className?: string; children: ReactNode }) {
  const files = backdropFiles(place);
  return (
    <div className="cq" data-place={place}>
      <div className={cn("cq-backdrop", dim && "cq-backdrop--dim")} aria-hidden="true">
        <picture>
          <source media="(min-width: 900px)" srcSet={files.desktop} type="image/webp" />
          <img src={files.phone} alt="" fetchPriority="high" decoding="async" />
        </picture>
      </div>
      <div className={cn("cq-content flex flex-col gap-5", className)}>{children}</div>
    </div>
  );
}
