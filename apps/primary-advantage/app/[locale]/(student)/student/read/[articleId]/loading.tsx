import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function ArticleLoading() {
  return (
    <div className="md:mb-5 md:flex md:flex-row md:gap-3">
      <div className="mt-4 md:basis-3/5">
        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className="mt-2 h-14 w-full" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[500px] w-full" />
            <Skeleton className="mt-2 h-8 w-full" />
            <Skeleton className="mt-2 h-14 w-full" />
            <Skeleton className="mt-2 h-10 w-full" />
          </CardContent>
        </Card>
      </div>
      <div className="mt-4 mb-40 flex flex-col md:mb-0 md:basis-2/5">
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
