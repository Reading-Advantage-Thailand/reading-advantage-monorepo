import Link from 'next/link'

interface BlogTagsProps {
  tags: string[]
  className?: string
}

export function BlogTags({ tags, className = '' }: BlogTagsProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => (
        <Link
          key={tag}
          href={`/blog/tag/${tag.toLowerCase()}`}
          className="inline-flex items-center rounded-full border bg-muted px-2.5 py-0.5 text-xs font-semibold transition-colors hover:bg-muted/80"
        >
          {tag}
        </Link>
      ))}
    </div>
  )
}
