import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ContactLinks } from "@/components/index/contact-links";
import { Panel } from "@/components/rpg/chrome";
import { Scene } from "@/components/rpg/scene";

/**
 * Localizes the Contact page metadata; the title is complete, so the site template is not added.
 * @param props.params Route parameters carrying the locale.
 * @returns Title and description metadata.
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PublicContact" });
  return { title: { absolute: t("meta.title") }, description: t("meta.description") };
}

/**
 * The Contact page at the inn (spec PP-3, PP-7): the channels as links, with no form.
 * @returns The page.
 */
export default async function ContactPage() {
  const t = await getTranslations("PublicContact");

  return (
    <Scene place="inn" className="container gap-6 py-8 md:py-12">
      <h1 className="cq-on-scene text-4xl font-bold md:text-5xl">{t("title")}</h1>
      <Panel className="max-w-3xl gap-4 md:p-8">
        <p className="text-lg">{t("intro")}</p>
        <ContactLinks
          labels={{ line: t("line"), lineQrAlt: t("lineQrAlt"), facebook: t("facebook"), phone: t("phone"), email: t("email") }}
        />
      </Panel>
    </Scene>
  );
}
