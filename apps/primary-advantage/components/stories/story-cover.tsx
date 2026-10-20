"use client";
import { useState } from "react";
import { BookOpenIcon } from "lucide-react";

/**
 * A book cover from the bucket. A book icon replaces the picture when it fails to load.
 * @param props.src The cover URL.
 * @returns The cover fill.
 */
export function StoryCover({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <>
      <BookOpenIcon className="size-10 text-[#f3e6c4]" aria-hidden="true" />
      {failed ? null : (
        // A plain img: onError swaps in the book icon when the cover is missing.
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover" />
      )}
    </>
  );
}
