import { env } from "@/lib/env";

const basePath = env.NEXT_PUBLIC_BASE_PATH ?? ''

export const withBasePath = (path: string) => {
  if (!path.startsWith('/')) {
    return `${basePath}/${path}`
  }
  return `${basePath}${path}`
}
