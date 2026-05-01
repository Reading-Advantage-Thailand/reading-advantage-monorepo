'use client'

import { ReactNode } from 'react'

interface BlogLayoutProps {
  children: ReactNode
}

export function BlogLayout({ children }: BlogLayoutProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {children}
    </div>
  )
}
