import { Inter, Noto_Sans_Thai } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai"],
  weight: ["400", "700"],
});

/**
 * Returns the CSS class string for the body element based on locale.
 * Thai font is always included because Thai content (navigation labels,
 * curriculum text) can appear on any locale page via next-intl translations.
 * @param locale The current locale code ("en" or "th").
 * @returns Space-separated CSS class names for the body element.
 */
export function getBodyFontClass(_locale: string): string {
  return `${inter.className} ${notoSansThai.className}`;
}
