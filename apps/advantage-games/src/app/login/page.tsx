import type { Metadata } from "next";
import { getCartridgeCatalogEntry } from "@reading-advantage/game-cartridges";
import { LoginForm } from "@/features/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in | Advantage Games",
  description: "Sign in to play Reading Advantage language games.",
};

type LoginPageProps = {
  searchParams: Promise<{ redirect?: string | string[] }>;
};

const FALLBACK_REDIRECT = "/";
const STUDENT_GAMES_PATH = /^\/(en|th|zh)\/student\/games$/u;
const STUDENT_APK_PATH = /^\/(en|th|zh)\/student\/games\/apk\/([^/?#]+)$/u;
const STUDENT_ARCADE_PATH = /^\/(en|th|zh)\/student\/arcade\/([^/?#]+)$/u;

/**
 * Accepts only a same-origin student games or arcade path as a post-login destination.
 * @param value Untrusted redirect query value.
 * @returns A safe same-app student path, or the application root.
 */
export function resolveStudentRedirect(value: string | string[] | undefined): string {
  if (typeof value !== "string") return FALLBACK_REDIRECT;
  if (STUDENT_GAMES_PATH.test(value)) return value;

  const apkMatch = value.match(STUDENT_APK_PATH);
  if (apkMatch && getCartridgeCatalogEntry(apkMatch[2])) return value;

  const arcadeMatch = value.match(STUDENT_ARCADE_PATH);
  if (arcadeMatch && getCartridgeCatalogEntry(arcadeMatch[2])) return value;

  return FALLBACK_REDIRECT;
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
