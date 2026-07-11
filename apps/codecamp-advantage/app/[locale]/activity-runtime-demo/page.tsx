import { ActivityRuntimeDemo } from "./runtime-demo";

/**
 * Renders the browser-verifiable interactive activity pilot host.
 * @param props Route parameters containing the active locale.
 * @returns Codecamp's shared activity runtime demonstration page.
 */
export default async function ActivityRuntimeDemoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <ActivityRuntimeDemo locale={locale} />;
}
