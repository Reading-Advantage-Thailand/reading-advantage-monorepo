"use client"

import { Skeleton } from "@/components/ui/skeleton"

export function StudentClassCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-5 w-5" />
        </div>
        <Skeleton className="h-3 w-36" />
      </div>
    </div>
  )
}
