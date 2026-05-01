import React from "react";
import { getTranslations } from "next-intl/server";

type Props = {};

export default async function AboutPage({}: Props) {
  const t = await getTranslations("AboutPage");

  return (
    <section className="space-y-6 pt-6 pb-8 md:pt-10 md:pb-12 lg:py-32">
      <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl lg:text-6xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-lg sm:text-xl">
          {t("description")}
        </p>
      </div>
    </section>
  );
}
