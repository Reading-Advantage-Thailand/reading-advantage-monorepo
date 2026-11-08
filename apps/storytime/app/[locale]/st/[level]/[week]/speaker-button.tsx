"use client";

/**
 * The play button of a recorded speaker on the week page (look task 2.3g, council round 3).
 *
 * The page renders the `<audio>` element without native controls, so no "0:00 / 0:00" text shows
 * before the clip loads. This button plays the audio element that sits next to it.
 */

/** The props of the speaker button. */
interface SpeakerButtonProps {
  /** The accessible name of the button. */
  label: string;
  /** The size classes of the button. */
  className?: string;
}

/**
 * Renders a button that plays the recorded clip of the audio element beside it.
 * @param props See `SpeakerButtonProps`.
 * @returns The play button.
 */
export function SpeakerButton({ label, className }: SpeakerButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={className}
      onClick={(event) => {
        const audio = event.currentTarget.parentElement?.querySelector("audio");
        if (!audio) return;
        audio.currentTime = 0;
        void audio.play().catch(() => undefined);
      }}
    >
      <span aria-hidden="true">▶</span>
    </button>
  );
}
