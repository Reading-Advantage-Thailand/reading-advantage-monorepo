import React from 'react'
import { Skeleton } from '@/components/ui/skeleton';

function loading() {
  return (
    <>
    <Skeleton className={"h-10 w-1/2 mt-2"} />
      <div className="p-4 grid grid-cols-3 gap-4 auto-rows-auto">
       <Skeleton className={"h-80 w-full mt-2"} />
       <Skeleton className={"h-80 w-full mt-2"} />
       <Skeleton className={"h-80 w-full mt-2"} />
       <Skeleton className={"h-32 w-full mt-2 col-span-3"} />
       <Skeleton className={"h-80 w-full mt-2 col-span-2"} />
       <Skeleton className={"h-80 w-full mt-2"} />
       <Skeleton className={"h-80 w-full mt-2 col-span-2"} />
       <Skeleton className={"h-80 w-full mt-2 col-span-2"} />
      </div>
    </>
  )
}

export default loading
