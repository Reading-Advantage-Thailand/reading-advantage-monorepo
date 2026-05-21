"use client";

import { usePathname } from "next/navigation";
import type { Locale } from "@/config/locale-config";

const TH_VARIANTS = new Set([
  "ma-marketing-adaptive-path",
  "ma-marketing-progress",
  "ma-marketing-spaced-repetition",
  "ra-marketing-codecamp-advantage",
  "ra-marketing-math-advantage",
  "ra-marketing-primary-advantage",
  "ra-marketing-reading-advantage",
  "ra-marketing-science-advantage",
  "ra-marketing-stem-advantage",
  "ra-marketing-storytime-advantage",
  "ra-marketing-tutor-advantage",
  "ra-marketing-zhongwen-advantage",
]);

interface MarketingSvgClientProps {
  baseName: string;
  className?: string;
  alt?: string;
}

export function MarketingSvgClient({
  baseName,
  className = "",
  alt = "",
}: MarketingSvgClientProps) {
  const pathname = usePathname();
  const locale = pathname.split("/")[1] as Locale;
  const hasThVariant = locale === "th" && TH_VARIANTS.has(baseName);
  const suffix = hasThVariant ? "-th" : "";
  const src = `/marketing/${baseName}${suffix}.svg`;

  return (
    <object
      data={src}
      type="image/svg+xml"
      className={className}
      aria-label={alt}
      role="img"
    />
  );
}
