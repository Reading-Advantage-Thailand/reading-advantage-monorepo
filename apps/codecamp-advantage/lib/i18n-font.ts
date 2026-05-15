import { Inter, Noto_Sans_Thai } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai"],
  weight: ["400", "700"],
});

export function getBodyFontClass(locale: string): string {
  return locale === "th" ? `${inter.className} ${notoSansThai.className}` : inter.className;
}
