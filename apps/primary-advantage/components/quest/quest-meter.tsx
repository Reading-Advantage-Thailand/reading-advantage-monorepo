import { cn } from "@/lib/utils";

/**
 * The boss meter: the committed damage toward the target, with an optional lighter pending segment.
 * @param props.committed The committed damage.
 * @param props.pending The preview damage from the heartbeats.
 * @param props.target The boss target.
 * @param props.label The accessible name of the meter.
 * @param props.className Extra classes.
 * @returns The meter.
 */
export function QuestMeter({ committed, pending = 0, target, label, className }: { committed: number; pending?: number; target: number; label: string; className?: string }) {
  const safeTarget = Math.max(1, target);
  const done = Math.min(100, (committed / safeTarget) * 100);
  const preview = Math.min(100 - done, (pending / safeTarget) * 100);
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={safeTarget} aria-valuenow={Math.min(committed, safeTarget)} className={cn("bg-muted flex h-4 w-full overflow-hidden rounded-full", className)}>
      <div className="bg-primary h-full" style={{ width: `${done}%` }} />
      {preview > 0 ? <div className="bg-primary/40 h-full" style={{ width: `${preview}%` }} /> : null}
    </div>
  );
}
