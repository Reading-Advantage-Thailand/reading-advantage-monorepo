import { Header } from "@/components/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default async function Loading() {
  return (
    <>
      <Header heading="Article Selection" />
      <Card className="my-2">
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-[18px] w-2/3" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-[14px] w-1/3" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 grid-flow-row gap-4">
            <Skeleton className="h-[20rem] w-full" />
            <Skeleton className="h-[20rem] w-full" />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
