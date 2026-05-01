declare module 'gray-matter' {
  interface GrayMatterFile<T extends Record<string, unknown>> {
    data: T
    content: string
    excerpt?: string
    orig: Buffer | string
    language?: string
    matter?: string
    stringify?: () => string
  }

  interface Options {
    excerpt?: boolean | ((input: string) => string)
    excerpt_separator?: string
    engines?: Record<string, unknown>
    language?: string
    delimiters?: string | [string, string]
  }

  function matter(
    input: string | Buffer,
    options?: Options
  ): GrayMatterFile<Record<string, unknown>>

  export = matter
}
