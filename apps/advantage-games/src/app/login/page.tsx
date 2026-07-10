import type { Metadata } from "next";
import { getCartridgeCatalogEntry } from "@reading-advantage/game-cartridges/catalog";
import { LoginForm } from "@/features/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in | Advantage Games",
  description: "Sign in to play Reading Advantage language games.",
};

type LoginPageProps = {
  searchParams: Promise<{ redirect?: string | string[] }>;
};

/**
 * Accepts only a localized production arcade path as a post-login destination.
 * @param value Untrusted redirect query value.
 * @returns A safe same-app arcade path.
 */
export function resolveStudentRedirect(value: string | string[] | undefined): string {
  const fallback = "/en/student/arcade/dragon-flight";
  if (typeof value !== "string") return fallback;
  const match = value.match(/^\/(en|th|zh)\/student\/arcade\/([^/?#]+)$/u);
  return match && getCartridgeCatalogEntry(match[2]) ? value : fallback;
}

/** Renders the Advantage Games student login page.
 * @param props Asynchronous login query parameters.
 * @returns The login screen with a validated post-authentication destination.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirect } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section
        aria-labelledby="login-title"
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-md sm:p-8"
      >
        <div className="mb-8 space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Student Arcade
          </p>
          <h1 className="text-3xl font-bold" id="login-title">
            Advantage Games
          </h1>
          <p className="text-sm text-muted-foreground">
            Use your Reading Advantage username and password.
          </p>
        </div>
        <LoginForm redirectTo={resolveStudentRedirect(redirect)} />
      </section>
    </main>
  );
}
