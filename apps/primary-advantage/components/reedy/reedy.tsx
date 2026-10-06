"use client";

import type { AvatarProfile } from "@reading-advantage/game-contracts";
import { AvatarPortrait } from "@/components/avatar/portrait-canvas";
import { cn } from "@/lib/utils";

/** The eight states of the coach (FR-10). */
export const REEDY_STATES = ["idle", "connecting", "listening", "thinking", "speaking", "muted", "celebrating", "reassuring"] as const;
export type ReedyState = (typeof REEDY_STATES)[number];

/** The bubble of each state in English and Thai, and the look. */
export const REEDY_POSES: Readonly<Record<ReedyState, { en: string; th: string; portrait: string; halo: boolean; dots: boolean }>> = {
  idle: { en: "Hi! Ready to talk?", th: "สวัสดี! พร้อมคุยไหม?", portrait: "motion-safe:animate-[reedy-bob_3s_ease-in-out_infinite]", halo: false, dots: false },
  connecting: { en: "One moment…", th: "รอสักครู่…", portrait: "opacity-80", halo: false, dots: true },
  listening: { en: "I'm listening.", th: "ฟังอยู่นะ", portrait: "motion-safe:scale-105", halo: true, dots: false },
  thinking: { en: "Hmm, let me think.", th: "ขอคิดก่อนนะ", portrait: "motion-safe:-rotate-3", halo: false, dots: true },
  speaking: { en: "Here is what I think.", th: "ฉันคิดว่า…", portrait: "motion-safe:animate-[reedy-bob_1.2s_ease-in-out_infinite]", halo: true, dots: false },
  muted: { en: "Your mic is off.", th: "ไมค์ปิดอยู่", portrait: "grayscale opacity-70", halo: false, dots: false },
  celebrating: { en: "Great job!", th: "เก่งมาก!", portrait: "motion-safe:animate-bounce", halo: true, dots: false },
  reassuring: { en: "That's okay. Try again.", th: "ไม่เป็นไร ลองใหม่นะ", portrait: "motion-safe:rotate-3", halo: false, dots: false },
};

/**
 * Reedy, the coach played by the student's own avatar: the portrait still with a CSS treatment
 * per state, a bilingual bubble, a halo that follows the voice level, and dots while connecting
 * or thinking. Every movement is behind `motion-safe`, so a reduced-motion setting shows a still.
 * @param props.profile The student's avatar.
 * @param props.state One of the eight states.
 * @param props.level The voice level, 0 to 1 (drives the halo in the listening and speaking states).
 * @param props.className Extra classes for the figure.
 * @returns The figure.
 */
export function Reedy({ profile, state, level = 0, className }: { profile: Pick<AvatarProfile, "classId" | "tints">; state: ReedyState; level?: number; className?: string }) {
  const pose = REEDY_POSES[state];
  const halo = pose.halo ? 0.35 + Math.min(1, Math.max(0, level)) * 0.65 : 0;
  return (
    <figure data-state={state} className={cn("flex flex-col items-center gap-3", className)}>
      <div className="relative size-48 md:size-64">
        <div
          aria-hidden="true"
          data-testid="reedy-halo"
          className="bg-brand-300/60 absolute inset-0 rounded-full blur-xl transition-transform duration-150 motion-reduce:transition-none"
          style={{ transform: `scale(${halo})`, opacity: pose.halo ? 1 : 0 }}
        />
        <AvatarPortrait classId={profile.classId} tints={profile.tints} alt="" className={cn("relative transition-transform duration-300 motion-reduce:transition-none", pose.portrait)} />
        {pose.dots ? (
          <div aria-hidden="true" data-testid="reedy-dots" className="absolute right-2 bottom-2 flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="bg-brand-500 size-2 rounded-full motion-safe:animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
            ))}
          </div>
        ) : null}
      </div>
      <figcaption role="status" aria-live="polite" className="bg-card text-card-foreground flex max-w-xs flex-col items-center rounded-2xl border px-4 py-2 text-center shadow-sm">
        <span lang="en" className="text-base font-semibold">
          {pose.en}
        </span>
        <span lang="th" className="text-muted-foreground text-sm">
          {pose.th}
        </span>
      </figcaption>
    </figure>
  );
}
