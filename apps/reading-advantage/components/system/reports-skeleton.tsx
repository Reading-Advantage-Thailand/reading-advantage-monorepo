import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SystemReportsSkeleton() {
  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-center space-x-2 mb-6">
        <Skeleton className="h-8 w-48" />
      </div>
      
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart Card */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <Skeleton className="h-6 w-48" />
            {/* Date filter controls */}
            <div className="flex flex-col space-y-2 md:flex-row md:items-center md:space-y-0 md:space-x-2">
              <div className="flex space-x-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-16" />
                ))}
              </div>
              <div className="flex space-x-2">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-32" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="w-full">
              {/* Chart skeleton */}
              <div className="flex items-end justify-center space-x-2 h-80">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center space-y-2">
                    <Skeleton 
                      className="w-12 bg-gray-200" 
                      style={{ height: `${Math.random() * 200 + 50}px` }}
                    />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
              <div className="flex justify-center mt-4">
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card className="mt-6">
        <CardHeader>
          <Skeleton className="h-6 w-36" />
        </CardHeader>
        <CardContent>
          {/* Search input */}
          <div className="flex items-center py-4">
            <Skeleton className="h-9 w-64" />
          </div>
          
          {/* Table */}
          <div className="rounded-md border">
            <div className="p-4">
              {/* Table header */}
              <div className="grid grid-cols-8 gap-4 mb-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
              
              {/* Table rows */}
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-8 gap-4 mb-3">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
              ))}
            </div>
          </div>
          
          {/* Pagination */}
          <div className="flex items-center justify-end space-x-2 py-4">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-16" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
