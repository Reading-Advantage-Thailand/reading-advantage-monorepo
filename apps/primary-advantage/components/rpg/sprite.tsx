import { cn } from "@/lib/utils";

/**
 * An animated Forge sprite strip: `frames` square frames side by side, played in a loop.
 * @param props.src The strip image.
 * @param props.size The frame size in CSS pixels (the strip is scaled to it).
 * @param props.frames The frame count.
 * @param props.label The accessible name, or empty for decoration.
 * @returns The sprite box.
 */
export function Sprite({ src, size, frames = 8, label = "", className }: { src: string; size: number; frames?: number; label?: string; className?: string }) {
  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      className={cn("cq-sprite", className)}
      style={{ width: size, height: size, backgroundImage: `url("${src}")`, backgroundSize: `${size * frames}px ${size}px`, "--frames": frames, "--strip-w": `${size * frames}px` } as React.CSSProperties}
    />
  );
}
