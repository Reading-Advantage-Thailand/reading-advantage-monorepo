import { ShimmerSkeleton } from "@reading-advantage/ui";
import { Scene } from "@/components/rpg/scene";

/**
 * Loading state of the school dashboard: the observatory scene of the page with the same blocks as
 * shimmer placeholders.
 * @returns The skeleton.
 */
export default function AdminDashboardLoading() {
  return (
    <Scene place="observatory" contained className="px-1 py-4 sm:px-3">
      <div aria-busy="true" className="flex flex-col gap-5">
        <ShimmerSkeleton className="h-9 w-56" />
        <ShimmerSkeleton className="h-12 w-72 max-w-full" />
        <ShimmerSkeleton className="h-56 rounded-2xl" />
        <ShimmerSkeleton className="h-24 rounded-2xl" />
        <ShimmerSkeleton className="h-64 rounded-2xl" />
        <ShimmerSkeleton className="h-48 rounded-2xl" />
      </div>
    </Scene>
  );
}
