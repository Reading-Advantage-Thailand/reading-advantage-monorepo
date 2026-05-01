import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-[60px] w-[400px]" />
      <Skeleton className="h-[30px] w-full" />
      <div className="grid grid-cols-2">
        <div>
          <Skeleton className="h-6 w-1/2 mb-2" />
          <Skeleton className="h-4 w-1/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-2" />
          <Skeleton className="h-4 w-1/4 mb-4" />
          <Skeleton className="h-4 w-1/2 mb-4" />
          <Skeleton className="h-4 w-1/4 mb-4" />
          <Skeleton className="h-6 w-5/6 mb-2" />
          <div className="grid grid-cols-7 w-4/6">
            {Array.from({ length: 21 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-[40px] mb-2" />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    </div>
  );
}
