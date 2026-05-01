import { LocalizedLink } from "@/components/common/localized-link";

interface BlogBreadcrumbsProps {
  postTitle: string;
}

export function BlogBreadcrumbs({ postTitle }: BlogBreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-4">
      <ol className="flex items-center gap-2">
        <li>
          <LocalizedLink href="/" className="hover:text-foreground transition-colors">
            Home
          </LocalizedLink>
        </li>
        <li aria-hidden="true">›</li>
        <li>
          <LocalizedLink href="/blog" className="hover:text-foreground transition-colors">
            Blog
          </LocalizedLink>
        </li>
        <li aria-hidden="true">›</li>
        <li className="text-foreground font-medium truncate max-w-xs" aria-current="page">
          {postTitle}
        </li>
      </ol>
    </nav>
  );
}
