import { getTranslations } from "next-intl/server";
import { CardSignIn } from "@/components/student-login/card-sign-in";

/**
 * Localizes the QR card sign-in page metadata.
 * @param params Route parameters carrying the locale.
 * @returns Title metadata.
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "StudentSignIn.card" });
  return { title: t("title") };
}

/**
 * QR card sign-in page. A printed QR login card opens this page with the card token in the URL
 * fragment; the client component signs the student in.
 * @returns The page.
 */
export default function CardSignInPage() {
  return <CardSignIn />;
}
