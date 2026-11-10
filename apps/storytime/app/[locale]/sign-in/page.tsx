import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SIGN_IN_USERNAME_COOKIE, getCurrentUser, mayOpenPath } from "../../../lib/auth";
import { safeReturnPath } from "../../../lib/auth/return-path";

/**
 * The sign-in page of the Storytime app (design section 2, AC-4.1 and AC-4.3).
 *
 * The page takes a username and a password and posts them to the sign-in handler. A visitor with
 * a session that may open the scanned page goes straight to that page; every other visitor sees
 * the form. The page shows one message for a wrong sign-in, so the answer of the server never
 * tells a stranger whether an account exists.
 */

/**
 * Marks the page as out of the search index.
 * @returns The page metadata.
 */
export function generateMetadata(): Metadata {
  return { robots: "noindex, nofollow" };
}

/**
 * Renders the sign-in page.
 * @param props.params The locale of the page.
 * @param props.searchParams The query of the request, with `next` and `error`.
 * @returns The form, or the redirect to the scanned page.
 */
export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const next = safeReturnPath(query.next, `/${locale}/st`);
  const user = await getCurrentUser();
  if (user && mayOpenPath(user, next)) redirect(next);

  // The handler sets the flash cookie after a wrong sign-in, and the proxy clears it on this GET.
  // React escapes the value, so the field shows it as text and never as markup.
  const flashUsername = (await cookies()).get(SIGN_IN_USERNAME_COOKIE)?.value ?? "";

  const translate = await getTranslations({ locale });
  const t = (key: string) => translate(key);
  const error = query.error === "locked" ? "locked" : query.error === "invalid" ? "invalid" : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">{t("signInHeading")}</h1>
      {error ? (
        <p role="alert" className="rounded-xl border border-red-500 p-3">
          {error === "locked" ? t("signInLocked") : t("signInInvalid")}
        </p>
      ) : null}
      <form method="post" action="/api/auth/sign-in" className="flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="next" value={next} />
        <div className="flex flex-col gap-1">
          <label htmlFor="username" className="font-semibold">
            {t("signInUsername")}
          </label>
          <input
            id="username"
            name="username"
            type="text"
            defaultValue={flashUsername}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            className="min-h-16 rounded-xl border border-neutral-300 px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="font-semibold">
            {t("signInPassword")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="min-h-16 rounded-xl border border-neutral-300 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="min-h-16 w-fit rounded-2xl border border-[#92400e] bg-[#92400e] px-6 py-2 font-semibold text-white"
        >
          {t("signInSubmit")}
        </button>
      </form>
      {user ? (
        <form method="post" action="/api/auth/sign-out" className="w-fit">
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="min-h-16 rounded-2xl border border-[#92400e] bg-[#92400e] px-4 py-2 text-white"
          >
            {t("signOut")}
          </button>
        </form>
      ) : null}
      <Link href={`/${locale}/join`} className="w-fit underline">
        {t("signInHowToJoin")}
      </Link>
    </main>
  );
}
