import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-[60px] w-[400px]" />
      <Skeleton className="h-[20px] w-[500px]" />
      <Skeleton className="h-[300px] w-full" />
    </div>
  );
}
