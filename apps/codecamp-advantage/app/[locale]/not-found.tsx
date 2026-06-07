import Link from "next/link";

/**
 * Locale-segment 404 page for CodeCamp Advantage.
 * Renders a styled not-found page with a back-to-home CTA
 * when a route under /[locale] is not matched.
 */
export default function LocaleNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-2xl font-bold">Page not found</h2>
      <p className="text-muted-foreground">The page you are looking for does not exist.</p>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
      >
        Back to home
      </Link>
    </div>
  );
}
