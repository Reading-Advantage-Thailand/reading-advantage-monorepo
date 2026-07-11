import { APKUnitLesson } from "./apk-unit-lesson";

/** Renders one published gradual-release stage from the APK curriculum unit. */
export default async function APKUnitStagePage({
  params,
}: {
  params: Promise<{ locale: string; stage: string }>;
}) {
  const { locale, stage } = await params;
  return <APKUnitLesson locale={locale} stage={Number(stage)} />;
}
