import portraitAsset from "../../look/places/path-p.webp";
// @ts-ignore Static WebP asset; ambient webp types exist only after next build.
import portrait720Asset from "../../look/places/path-p-720.webp";
// @ts-ignore Static WebP asset; ambient webp types exist only after next build.
import portrait960Asset from "../../look/places/path-p-960.webp";
import landscapeAsset from "../../look/places/path-d.webp";
// @ts-ignore Static WebP asset; ambient webp types exist only after next build.
import landscape720Asset from "../../look/places/path-d-720.webp";
// @ts-ignore Static WebP asset; ambient webp types exist only after next build.
import landscape1280Asset from "../../look/places/path-d-1280.webp";

/**
 * Gives the URL of one static place picture in a test or in a build.
 * @param asset The imported picture.
 * @returns The URL of the picture.
 */
function assetUrl(asset: unknown): string {
  return typeof asset === "string"
    ? asset
    : (asset as { src: string }).src;
}

/**
 * The URL of the desktop picture, the cast on the stone path.
 */
const portraitSrc = assetUrl(portraitAsset);

/**
 * The URL of the 720w desktop picture.
 */
const portrait720Src = assetUrl(portrait720Asset);

/**
 * The URL of the 960w desktop picture.
 */
const portrait960Src = assetUrl(portrait960Asset);

/**
 * The URL of the phone picture, the same cast in a wide strip.
 */
const landscapeSrc = assetUrl(landscapeAsset);

/**
 * The URL of the 720w phone picture.
 */
const landscape720Src = assetUrl(landscape720Asset);

/**
 * The URL of the 1280w phone picture.
 */
const landscape1280Src = assetUrl(landscape1280Asset);

/**
 * Shows the one decorative entry picture of the sign-in page.
 *
 * Both sources are static assets under `app/look/`, so they need no session. The wide picture is
 * the strip on a phone, and the tall picture is the desktop column from 980 px. Each source names
 * a small candidate for the device ratio and keeps the original as the last candidate. The
 * picture keeps the one decorative hook and the crop rules of `entry.css`.
 * @returns The picture with its two sources.
 */
export function EntryArt() {
  return (
    <picture data-entry-art>
      <source
        media="(min-width: 980px)"
        srcSet={`${portrait720Src} 720w, ${portrait960Src} 960w, ${portraitSrc} 1080w`}
        sizes="480px"
      />
      <img
        src={landscapeSrc}
        srcSet={`${landscape720Src} 720w, ${landscape1280Src} 1280w, ${landscapeSrc} 1920w`}
        sizes="calc(100vw - 40px)"
        alt=""
        fetchPriority="high"
        loading="eager"
        width={1920}
        height={1080}
      />
    </picture>
  );
}

/**
 * Shows the tall path picture in the left column of the join page on a desktop.
 *
 * The join page wraps this image in a hook that hides it on a phone. A plain image keeps the
 * join markup short; the sign-in page keeps the two-source picture.
 * @returns One decorative image of the approved place art.
 */
export function JoinArt() {
  return (
    <img
      data-join-art-img
      src={portraitSrc}
      alt=""
      loading="lazy"
      width={1080}
      height={1920}
    />
  );
}
