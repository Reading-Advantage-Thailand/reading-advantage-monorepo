import { Link } from "@/locales/navigation";

interface BlogBreadcrumbsProps {
  postTitle: string;
}

export function BlogBreadcrumbs({ postTitle }: BlogBreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-4">
      <ol className="flex items-center gap-2">
        <li>
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
        </li>
        <li aria-hidden="true">›</li>
        <li>
          <Link href="/blog" className="hover:text-foreground transition-colors">
            Blog
          </Link>
        </li>
        <li aria-hidden="true">›</li>
        <li className="text-foreground font-medium truncate max-w-xs" aria-current="page">
          {postTitle}
        </li>
      </ol>
    </nav>
  );
}
