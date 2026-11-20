import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  SIGN_IN_USERNAME_COOKIE,
  getCurrentUser,
  mayOpenPath,
  type StorytimeUser,
} from "../../../lib/auth";
import * as content from "../../../lib/content";
import { safeReturnPath } from "../../../lib/auth/return-path";
import { teacherRoutesEnabled } from "../../../lib/teacher";
import { EntryArt } from "../entry/entry-art";
import { EntryLogo } from "../entry/entry-logo";
import { PasswordField } from "../entry/password-field";

/**
 * The sign-in page of the Storytime app (design section 2, AC-4.1 and AC-4.3).
 *
 * The page takes a username and a password and posts them to the sign-in handler. A visitor with
 * a session that may open the scanned page goes straight to that page; every other visitor sees
 * the form. The page now presents that form as a welcome screen: the logo, one path picture, and
 * a greeting in the first column, the card in the second. The redirect logic, the flash username,
 * the `next` check, the sign-out form, and the form action stay as they are.
 */

/**
 * Marks the page as out of the search index.
 * @returns The page metadata.
 */
export function generateMetadata(): Metadata {
  return { robots: "noindex, nofollow" };
}

/**
 * Builds the teacher landing of a signed-in visit (plan task 6.2, round 7, PM point 1).
 *
 * A teacher with the switch on and no usable `next` — the form fills the fallback
 * `/<locale>/st` — goes to the teacher week page of the first open week. Every other visitor
 * keeps the plain redirect. The path is computed before any `redirect` call, so a `redirect`
 * never runs inside the try block, and a thrown redirect is never caught. The optional call
 * keeps the page safe against a mock of `../lib/content` that holds no `firstOpenWeek`.
 * @param user The signed-in user.
 * @param locale The locale of the page.
 * @param next The checked return path.
 * @returns The teacher landing path, or `null` for the plain redirect.
 */
async function teacherLanding(
  user: StorytimeUser,
  locale: string,
  next: string,
): Promise<string | null> {
  if (next !== `/${locale}/st` || user.role !== "teacher" || !teacherRoutesEnabled()) {
    return null;
  }
  try {
    const first = await content.firstOpenWeek?.();
    if (!first) return null;
    return `/${locale}/teacher/${first.level}/${first.week}`;
  } catch {
    return null;
  }
}

/**
 * Renders the sign-in page.
 * @param props.params The locale of the page.
 * @param props.searchParams The query of the request, with `next` and `error`.
 * @returns The welcome screen, or the redirect to the scanned page.
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
  const landing = user === null ? null : await teacherLanding(user, locale, next);
  if (landing !== null) redirect(landing);
  if (user && mayOpenPath(user, next)) redirect(next);

  // The handler sets the flash cookie after a wrong sign-in, and the proxy clears it on this GET.
  // React escapes the value, so the field shows it as text and never as markup.
  const flashUsername = (await cookies()).get(SIGN_IN_USERNAME_COOKIE)?.value ?? "";

  const translate = await getTranslations({ locale });
  const t = (key: string) => translate(key);
  const error = query.error === "locked" ? "locked" : query.error === "invalid" ? "invalid" : null;

  return (
    <main data-entry-shell>
      <header data-entry-welcome>
        <EntryLogo />
        <p data-entry-greeting>{t("signInGreeting")}</p>
      </header>
      <div data-entry-art-column>
        <EntryArt />
      </div>
      <section data-entry-card-area>
        <div data-entry-card>
          <h1>{t("signInHeading")}</h1>
          <form method="post" action="/api/auth/sign-in">
            {error ? (
              <p role="alert" data-entry-error>
                {error === "locked" ? t("signInLocked") : t("signInInvalid")}
              </p>
            ) : null}
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="next" value={next} />
            <div>
              <label data-entry-label htmlFor="username">
                {t("signInUsername")}
              </label>
              <input
                data-entry-field
                id="username"
                name="username"
                type="text"
                defaultValue={flashUsername}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
              />
            </div>
            <PasswordField
              label={t("signInPassword")}
              showLabel={t("signInShowPassword")}
              hideLabel={t("signInHidePassword")}
            />
            <button type="submit" data-entry-primary>
              {t("signInSubmit")}
            </button>
          </form>
          {user ? (
            <form method="post" action="/api/auth/sign-out">
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" data-entry-signout>
                {t("signOut")}
              </button>
            </form>
          ) : null}
        </div>
        <p data-entry-nologin>
          <Link href={`/${locale}/join`}>{t("signInNoLogin")}</Link>
        </p>
      </section>
    </main>
  );
}
