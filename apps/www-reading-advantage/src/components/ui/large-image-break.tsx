import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface LargeImageBreakProps
  extends React.HTMLAttributes<HTMLDivElement> {
  src: string;
  alt: string;
  overlayText?: React.ReactNode;
  overlayPosition?: "center" | "bottom-left" | "bottom-right";
}

const positionStyles = {
  center: "items-center justify-center text-center",
  "bottom-left": "items-end justify-start text-left pb-16 pl-8 md:pl-16",
  "bottom-right": "items-end justify-end text-right pb-16 pr-8 md:pr-16",
};

const LargeImageBreak = React.forwardRef<
  HTMLDivElement,
  LargeImageBreakProps
>(
  (
    {
      className,
      src,
      alt,
      overlayText,
      overlayPosition = "center",
      children,
      ...props
    },
    ref,
  ) => (
    <section
      ref={ref}
      className={cn(
        "relative w-full min-h-[60vh] flex overflow-hidden",
        positionStyles[overlayPosition],
        className,
      )}
      {...props}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="100vw"
        className="object-cover absolute inset-0 -z-10"
        priority={false}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/10" />
      {overlayText && (
        <div className="relative z-10 max-w-4xl px-6">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 md:p-12 border border-white/20">
            {overlayText}
          </div>
        </div>
      )}
      {children}
    </section>
  ),
);
LargeImageBreak.displayName = "LargeImageBreak";

export { LargeImageBreak };
