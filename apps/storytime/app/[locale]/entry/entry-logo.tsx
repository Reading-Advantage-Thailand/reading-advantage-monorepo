import logoAsset from "../../look/logo/storytime-advantage.svg";

/**
 * The URL of the logo file. Vite gives a string in a test, and the Next image loader gives an
 * object with `src` in a build.
 */
const logoSrc =
  typeof logoAsset === "string" ? logoAsset : (logoAsset as { src: string }).src;

/**
 * Shows the Storytime Advantage logo of the entry pages.
 * @returns The logo image with its text alternative.
 */
export function EntryLogo() {
  return (
    <img
      data-entry-logo
      src={logoSrc}
      alt="Storytime Advantage"
      loading="lazy"
      width={156}
      height={64}
    />
  );
}
