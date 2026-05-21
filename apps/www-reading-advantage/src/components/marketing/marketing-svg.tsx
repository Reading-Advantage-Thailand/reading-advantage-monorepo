import fs from "fs";
import path from "path";
import type { Locale } from "@/config/locale-config";

interface MarketingSvgProps {
  baseName: string;
  locale: Locale;
  className?: string;
  alt?: string;
}

export function MarketingSvg({
  baseName,
  locale,
  className = "",
  alt = "",
}: MarketingSvgProps) {
  const publicDir = path.join(process.cwd(), "public", "marketing");
  const thVariant = `${baseName}-th.svg`;
  const hasThVariant = locale === "th" && fs.existsSync(path.join(publicDir, thVariant));
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
