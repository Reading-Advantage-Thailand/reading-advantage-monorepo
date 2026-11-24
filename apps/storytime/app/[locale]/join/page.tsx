import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JOIN_COPY, JOIN_PIECES, joinCopy } from "../../../lib/join-copy";
import { JoinArt } from "../entry/entry-art";
import { EntryIcon, type EntryIconName } from "../entry/entry-icons";
import { EntryLogo } from "../entry/entry-logo";

/**
 * The tile order of the join page (PM design decision 3).
 */
const TILE_ORDER: EntryIconName[] = [
  "daily-lessons",
  "letters-phonics",
  "sight-words",
  "songs-readers",
  "home-app",
];

/**
 * The "How to join" page of the Storytime app (design section 2, AC-4.5).
 *
 * The page is public: a visitor without a session sees it, and it writes no cookie. It holds no
 * week content and no raw URL text. The short lines come from the pieces of the approved C3 copy,
 * so the page adds no new claim.
 */

/**
 * Gives the title of the browser tab.
 * @param props.params The locale of the page.
 * @returns The page metadata.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: joinCopy(locale).title, robots: "noindex, nofollow" };
}

/**
 * Escapes one approved line for static markup. The apostrophe stays literal so the rendered line
 * keeps the PM copy byte for byte; every character with markup meaning is escaped.
 * @param text The approved line.
 * @returns The line as static markup text.
 */
function approvedLineHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Renders the "How to join" page.
 * @param props.params The locale of the page.
 * @returns The page.
 */
export default async function JoinPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const copy = joinCopy(locale);
  const pieces = JOIN_PIECES[locale === "th" ? "th" : "en"];
  const translate = await getTranslations({ locale });
  const t = (key: string) => translate(key);
  const lang = locale === "th" ? "th" : "en";

  return (
    <main data-entry-shell>
      <div data-entry-brand>
        <EntryLogo />
        {JOIN_COPY.status === "draft" ? (
          <p data-draft="true">{t("joinDraftMarker")}</p>
        ) : null}
        <h1 lang={lang}>{copy.heading}</h1>
        <p data-entry-hero lang={lang}>
          {pieces.hero}
        </p>
        <div data-join-art>
          <JoinArt />
        </div>
      </div>
      <section data-entry-card data-join-content>
        <div data-join-tiles>
          {TILE_ORDER.map((name) => {
            const tile = pieces.tiles[name];
            return (
              <div key={name} data-join-tile={name} lang={lang}>
                <EntryIcon name={name} />
                <span data-join-tile-title>{tile.title}</span>
                <span data-join-tile-sentence>{tile.sentence}</span>
              </div>
            );
          })}
        </div>
        <h2>{t("joinHowToTitle")}</h2>
        <ol data-join-steps lang={lang}>
          {pieces.steps.map((step, index) => (
            <li
              key={step}
              data-join-step={String(index + 1)}
              dangerouslySetInnerHTML={{ __html: approvedLineHtml(step) }}
            />
          ))}
        </ol>
        <p data-entry-hint lang={lang}>
          {pieces.contactLead}
        </p>
        <div data-entry-contacts>
          <a data-contact="line" href="https://line.me/ti/p/Pf7_EF98Pv">
            {pieces.buttons.line}
          </a>
          <a data-contact="phone" href="tel:+66990058038">
            {pieces.buttons.phone}
          </a>
          <a data-contact="email" href="mailto:support@reading-advantage.com">
            {pieces.buttons.email}
          </a>
        </div>
        <a data-contact-site href="https://www.reading-advantage.com/contact">
          {pieces.buttons.site}
        </a>
        <a data-join-signin href={`/${locale}/sign-in`}>
          {copy.signInLink}
        </a>
      </section>
    </main>
  );
}
