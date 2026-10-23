"use client";

import { ArrowLeftIcon, BookOpenIcon, LibraryIcon, MusicIcon, Volume2Icon, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Panel, rpgButton, Sign } from "@/components/rpg/chrome";
import { Scene } from "@/components/rpg/scene";
import { LocaleSwitcher } from "@/components/switchers/locale-switcher";
import { StorytimeBook } from "@/components/storytime/storytime-book";
import { StorytimeSong } from "@/components/storytime/storytime-song";
import { SPEECH_LANG, speak } from "@/lib/storytime/speak";
import { storytimePart, type StorytimePart, type StorytimeWeek } from "@/lib/storytime/week";
import { cn } from "@/lib/utils";

/** A press this long on a tile reads its label and does not open the part. */
const LONG_PRESS_MS = 500;

/**
 * The public Storytime page of one week (qr-page-spec sections 3 and 7): three large tiles (the
 * read-along book, the decodable book, the song), then the home card. A tap on a tile opens the
 * part; the speaker icon or a long press reads the label. `?part=` opens a part at once, and the
 * back button of the phone returns to the tiles.
 * @param props.week The published week with public media URLs.
 * @param props.part The part to open first, from `?part=`.
 * @returns The page.
 */
export function StorytimeWeekView({ week, part }: { week: StorytimeWeek; part: StorytimePart | null }) {
  const t = useTranslations("Storytime");
  const locale = useLocale();
  const [open, setOpen] = useState<StorytimePart | null>(part);
  const lang = SPEECH_LANG[locale] ?? "en-US";

  // The phone back button closes a part that a tile opened.
  useEffect(() => {
    const onPop = () => setOpen(storytimePart(new URLSearchParams(window.location.search).get("part") ?? undefined));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const openPart = (next: StorytimePart) => {
    const url = new URL(window.location.href);
    url.searchParams.set("part", next);
    window.history.pushState(null, "", url);
    setOpen(next);
    window.scrollTo({ top: 0 });
  };
  const close = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("part");
    window.history.replaceState(null, "", url);
    setOpen(null);
  };

  const tiles: { part: StorytimePart; label: string; picture: string | null; icon: LucideIcon }[] = [
    { part: "book", label: t("tileBook"), picture: week.readalong.pages[0]?.picture ?? null, icon: BookOpenIcon },
    { part: "decodable", label: t("tileDecodable"), picture: week.decodable.pages[0]?.picture ?? null, icon: LibraryIcon },
    ...(week.song ? [{ part: "song" as const, label: t("tileSong"), picture: week.song.posterPhone ?? week.song.poster, icon: MusicIcon }] : []),
  ];

  return (
    <Scene place="clearing" className="min-h-screen px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <span className="cq-on-scene text-lg font-bold">{t("brand")}</span>
        <div className="cq-on-scene">
          <LocaleSwitcher triggerClassName="size-12" />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <div className="flex flex-col items-center gap-1 text-center">
          <Sign small>{t("levelWeek", { level: week.level, week: week.week })}</Sign>
          <h1 className="cq-on-scene text-3xl font-bold">{week.title}</h1>
        </div>
        {open ? (
          <>
            <button type="button" onClick={close} className={cn(rpgButton("wood"), "min-h-16 self-start px-4 text-lg")}>
              <ArrowLeftIcon aria-hidden="true" className="size-6" />
              {t("back")}
            </button>
            <Panel className="p-3">
              {open === "book" && <StorytimeBook book={week.readalong} element={week.element} mediaBase={week.mediaBase} />}
              {open === "decodable" && <StorytimeBook book={week.decodable} element={week.element} mediaBase={week.mediaBase} />}
              {open === "song" && week.song && <StorytimeSong song={week.song} />}
            </Panel>
          </>
        ) : (
          <>
            <p className="cq-on-scene text-center text-lg">{t("parentHow")}</p>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {tiles.map((tile) => (
                <li key={tile.part}>
                  <Tile {...tile} lang={lang} onOpen={() => openPart(tile.part)} speakerLabel={t("sayLabel", { label: tile.label })} />
                </li>
              ))}
            </ul>
            {week.home && <HomeCard week={week} home={week.home} locale={locale} />}
          </>
        )}
      </div>
    </Scene>
  );
}

/**
 * One large tile: a picture, the label, and a speaker button. A long press reads the label.
 * @param props The label, the picture, the icon for no picture, the speech language, and the open handler.
 * @returns The tile.
 */
function Tile({
  label,
  picture,
  icon: Icon,
  lang,
  speakerLabel,
  onOpen,
}: {
  label: string;
  picture: string | null;
  icon: LucideIcon;
  lang: string;
  speakerLabel: string;
  onOpen: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const longPressed = useRef(false);
  const startPress = () => {
    longPressed.current = false;
    timer.current = setTimeout(() => {
      longPressed.current = true;
      speak(label, lang);
    }, LONG_PRESS_MS);
  };
  const endPress = () => clearTimeout(timer.current);
  return (
    <div className="cq-panel relative flex flex-col overflow-hidden p-0">
      <button
        type="button"
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        onPointerCancel={endPress}
        onContextMenu={(event) => event.preventDefault()}
        onClick={() => {
          if (longPressed.current) longPressed.current = false;
          else onOpen();
        }}
        className="flex min-h-40 w-full flex-col items-stretch text-left select-none [-webkit-touch-callout:none]"
      >
        {picture ? (
          <img src={picture} alt="" className="aspect-video w-full object-cover" />
        ) : (
          <span className="bg-muted flex aspect-video w-full items-center justify-center" aria-hidden="true">
            <Icon className="size-14 opacity-60" />
          </span>
        )}
        <span className="min-h-16 px-3 py-2 pr-20 text-xl font-bold">{label}</span>
      </button>
      <button
        type="button"
        aria-label={speakerLabel}
        onClick={() => speak(label, lang)}
        className={cn(rpgButton("gold"), "absolute right-2 bottom-2 size-16 p-0")}
      >
        <Volume2Icon aria-hidden="true" className="size-7" />
      </button>
    </div>
  );
}

/**
 * The home card (qr-page-spec section 7): the parent line, the three words with speaker buttons,
 * the sentence frame, and the 5-minute activity. Thai shows the Thai text; other languages show
 * the English text.
 * @param props.week The week, for the frame.
 * @param props.home The home card data.
 * @param props.locale The page locale.
 * @returns The card.
 */
function HomeCard({ week, home, locale }: { week: StorytimeWeek; home: NonNullable<StorytimeWeek["home"]>; locale: string }) {
  const t = useTranslations("Storytime");
  const pick = (text: { en: string; th: string }) => (locale === "th" && text.th ? text.th : text.en);
  return (
    <Panel className="gap-3 p-4" data-home-card>
      <h2 className="text-xl font-bold">{t("homeTitle")}</h2>
      <p className="text-base">{pick(home.line)}</p>
      <ul className="flex flex-wrap gap-2">
        {home.words.map((word) => (
          <li key={word}>
            <button type="button" onClick={() => speak(word, "en-US")} className={cn(rpgButton("wood"), "min-h-16 px-4 text-xl")}>
              <Volume2Icon aria-hidden="true" className="size-6" />
              {word}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => speak(week.frame.replace(/_+/g, ""), "en-US")} className={cn(rpgButton("wood"), "min-h-16 self-start px-4 text-lg")}>
        <Volume2Icon aria-hidden="true" className="size-6" />
        {week.frame}
      </button>
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-bold">{t("activityTitle")}</h3>
        <p className="text-base">{pick(home.activity)}</p>
      </div>
    </Panel>
  );
}
