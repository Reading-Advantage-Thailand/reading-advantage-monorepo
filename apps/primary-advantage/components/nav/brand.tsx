import { Link } from "@/i18n/navigation";
import { Icons } from "@/components/icons";
import { siteConfig } from "@/configs/site-config";
import { cn } from "@/lib/utils";

/**
 * Renders the logo and the app name as a link. The name uses the brand primary color
 * (AA contrast in light and dark), not the old cyan.
 * @param props The link target and extra classes.
 * @returns The brand link.
 */
export function Brand({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 rounded-md", className)}>
      <Icons.logo alt="" />
      <span className="font-logo text-primary text-lg font-bold">{siteConfig.name}</span>
    </Link>
  );
}
