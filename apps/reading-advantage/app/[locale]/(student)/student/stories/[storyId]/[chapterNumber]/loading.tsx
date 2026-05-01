import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function Loading() {
  return (
    <div className="md:flex md:flex-row md:gap-3 md:mb-5">
      <div className="mt-4 md:basis-3/5">
        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-14 w-full mt-2" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[500px] w-full" />
            <Skeleton className="h-8 w-full mt-2" />
            <Skeleton className="h-14 w-full mt-2" />
            <Skeleton className="h-10 w-full mt-2" />
          </CardContent>
        </Card>
      </div>
      <div className="flex flex-col mb-40 md:mb-0 md:basis-2/5 mt-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-[100px] w-full" />
          </CardHeader>
        </Card>
        <Card className="mt-3">
          <CardHeader>
            <Skeleton className="h-[398px] w-full" />
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
