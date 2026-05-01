"use client"

import { Skeleton } from "@/components/ui/skeleton"

export function ClassCardSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="space-y-3">
        <Skeleton className="h-3 w-1/3" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      <div className="mt-auto space-y-2 pt-6">
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}
