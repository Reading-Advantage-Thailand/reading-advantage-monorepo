import { Link } from "@/i18n/navigation";
import { Icons } from "@/components/icons";
import { siteConfig } from "@/configs/site-config";
import { cn } from "@/lib/utils";

/**
 * Renders the logo and the app name as a link. Both shells put it on the wooden header, so the
 * name takes the cream of `.cq-header .cq-brand` (styles/rpg.css).
 * @param props The link target and extra classes.
 * @returns The brand link.
 */
export function Brand({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("cq-brand flex items-center gap-2 rounded-md", className)}>
      <Icons.logo alt="" />
      <span className="font-logo text-lg font-bold">{siteConfig.name}</span>
    </Link>
  );
}
