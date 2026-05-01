export interface BlogPost {
  slug: string;
  content: string;
  rawContent: string;
  title: string;
  date: string;
  excerpt: string;
  author: string;
  tags: string[];
  readingTime: number;
  coverImage?: string;
  product?: string;
}

// Instead of using Omit, explicitly define the interface
export interface BlogListItem {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  author: string;
  tags: string[];
  readingTime: number;
  coverImage?: string;
  product?: string;
}

export interface BlogHeaderProps {
  title: string;
  date: string;
  author: string;
  readingTime: number;
}

export interface BlogTagsProps {
  tags: string[];
}
