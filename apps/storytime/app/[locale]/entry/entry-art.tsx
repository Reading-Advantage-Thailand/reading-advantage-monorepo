import portraitAsset from "../../look/places/path-p.webp";
import landscapeAsset from "../../look/places/path-d.webp";

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
 * The URL of the phone picture, the same cast in a wide strip.
 */
const landscapeSrc = assetUrl(landscapeAsset);

/**
 * Shows the one decorative entry picture of the sign-in page.
 *
 * Both sources are static assets under `app/look/`, so they need no session. The wide picture is
 * the strip on a phone, and the tall picture is the desktop column from 980 px.
 * @returns The picture with its two sources.
 */
export function EntryArt() {
  return (
    <picture data-entry-art>
      <source media="(min-width: 980px)" srcSet={portraitSrc} />
      <img src={landscapeSrc} alt="" width={1920} height={1080} />
    </picture>
  );
}
