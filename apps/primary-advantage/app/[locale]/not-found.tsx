"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("NotFound");
  const router = useRouter();

  const handleGoBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      router.back();
    } else {
      // Fallback to home page if no history
      router.push("/");
    }
  };

  return (
    <div className="flex min-h-screen items-center px-4 py-12 sm:px-6 md:px-8 lg:px-12 xl:px-16">
      <div className="w-full space-y-6 text-center">
        <div className="space-y-3">
          <h1 className="animate-bounce text-4xl font-bold tracking-tighter sm:text-5xl">
            404
          </h1>
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">
            {t("title")}
          </h1>
          <p className="text-gray-500">{t("description")}</p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <button
            onClick={handleGoBack}
            className="inline-flex h-10 items-center rounded-md bg-gray-900 px-8 text-sm font-medium text-gray-50 shadow transition-colors hover:bg-gray-900/90 focus-visible:ring-1 focus-visible:ring-gray-950 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/90 dark:focus-visible:ring-gray-300"
          >
            {t("goBack")}
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-md border border-gray-300 bg-white px-8 text-sm font-medium text-gray-900 shadow-sm transition-colors hover:bg-gray-50 focus-visible:ring-1 focus-visible:ring-gray-950 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-50 dark:hover:bg-gray-700"
            prefetch={false}
          >
            {t("returnToWebsite")}
          </Link>
        </div>
      </div>
    </div>
  );
}
