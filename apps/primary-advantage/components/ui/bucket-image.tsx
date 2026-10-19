"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/**
 * A bucket picture through the Next.js resizer, with the original file as the fallback. The resizer
 * stops its fetch of the source after 7 s, so a slow link to the bucket gave a broken picture
 * (manual test run 2, C1); the fallback loads the original file in the browser.
 * @param props The `next/image` props.
 * @returns The picture.
 */
export function BucketImage(props: ImageProps) {
  const [original, setOriginal] = useState(false);
  return (
    <Image
      {...props}
      alt={props.alt}
      unoptimized={original || props.unoptimized}
      onError={(event) => {
        setOriginal(true);
        props.onError?.(event);
      }}
    />
  );
}
