"use client";

import { ArrowLeftIcon, PlayIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "@/i18n/navigation";
import { sendHelpEvent } from "@/lib/help/events";
import { helpVideosFor, pagePattern } from "@/lib/help/match";
import { HELP_VIDEOS, type HelpAudience, type HelpVideo } from "@/lib/help/videos";
import youtubeIds from "@/lib/help/youtube-ids.json";
import { getStorageUrl } from "@/lib/storage-config";
import { cn } from "@/lib/utils";

const YOUTUBE: Readonly<Record<string, string>> = youtubeIds;
/** Every enabled student video, for the "All videos" view. */
const studentVideos = HELP_VIDEOS.filter((video) => video.enabled && video.audience === "student");

/** The bucket URL of a help video file (`mp4`) or its poster (`jpg`), staged by scripts/help. */
const mediaUrl = (id: string, kind: "mp4" | "jpg") => getStorageUrl(`help/whats-new/${id}.${kind}`);

/** The length of a video as m:ss. */
const length = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/**
 * The help panel (track primary_in_app_help_20261023, spec FR-2 to FR-4, FR-7): the videos of the
 * current page, then the general videos, and a player. Nothing loads before a tap; a teacher plays a
 * video from YouTube when it is there (with "Play without YouTube"), and a student always plays our
 * own file. Closing the panel unmounts the player, so the video stops. Each open and each play
 * sends a help event (FR-11) unless `record` is false.
 * @param props.open Whether the panel is open.
 * @param props.onOpenChange Called with the new open state.
 * @param props.pathname The current path without the locale.
 * @param props.audience Teacher or student.
 * @param props.record False on the signed-out sign-in pages, which send no events.
 * @returns The panel.
 */
export function HelpPanel({
  open,
  onOpenChange,
  pathname,
  audience,
  record = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
  audience: HelpAudience;
  record?: boolean;
}) {
  const t = useTranslations("Help");
  const [selected, setSelected] = useState<HelpVideo | null>(null);
  // The id of the last video played, so that "Back" returns the focus to its row.
  const [last, setLast] = useState<string | null>(null);
  // The student "All videos" view (FR-9): every student video, inside the panel.
  const [all, setAll] = useState(false);
  const select = (video: HelpVideo) => {
    setLast(video.id);
    setSelected(video);
  };
  const change = (next: boolean) => {
    if (!next) {
      setSelected(null);
      setLast(null);
      setAll(false);
    }
    onOpenChange(next);
  };
  const { matched, general } = helpVideosFor(pathname, audience);
  const routePattern = pagePattern(pathname);
  useEffect(() => {
    if (open && record) sendHelpEvent({ event: "open", routePattern, matched: matched.length });
  }, [open, record, routePattern, matched.length]);
  const played = (video: HelpVideo, source: "youtube" | "file") => {
    if (record) sendHelpEvent({ event: "play", routePattern, videoId: video.id, source });
  };
  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent className={cn("max-h-[90svh] overflow-y-auto", audience === "teacher" ? "sm:max-w-3xl" : "sm:max-w-md")}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {selected ? (
          <HelpPlayer key={selected.id} video={selected} audience={audience} onPlay={played} onBack={() => setSelected(null)} />
        ) : all ? (
          <div className="flex flex-col gap-2">
            <Button variant="ghost" className="w-fit cursor-pointer" onClick={() => setAll(false)}>
              <ArrowLeftIcon aria-hidden="true" />
              {t("back")}
            </Button>
            <section aria-label={t("allVideos")} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">{t("allVideos")}</h3>
              {studentVideos.map((video) => (
                <HelpItem key={video.id} video={video} focus={video.id === last} onSelect={select} />
              ))}
            </section>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <section aria-label={t("forThisPage")} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">{t("forThisPage")}</h3>
              {matched.length ? (
                matched.map((video) => <HelpItem key={video.id} video={video} focus={video.id === last} onSelect={select} />)
              ) : (
                <p className="text-muted-foreground text-sm">
                  <span>{t("none")}</span>{" "}
                  {audience === "teacher" && (
                    <Link href="/teacher/manual" className="underline" onClick={() => change(false)}>
                      {t("manual")}
                    </Link>
                  )}
                </p>
              )}
            </section>
            {general.length > 0 && (
              <section aria-label={t("more")} className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">{t("more")}</h3>
                {general.map((video) => <HelpItem key={video.id} video={video} focus={video.id === last} onSelect={select} />)}
              </section>
            )}
            {audience === "student" ? (
              <Button variant="outline" className="min-h-11 w-fit cursor-pointer" onClick={() => setAll(true)}>
                {t("allVideos")}
              </Button>
            ) : (
              <Link href="/teacher/help" className="min-h-11 w-fit content-center text-sm underline" onClick={() => change(false)}>
                {t("allVideos")}
              </Link>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * One row of the list: the poster, the title, and the length (a 44 px or taller tap target).
 * @param props.video The video.
 * @param props.focus True to take the focus on mount (the row of the video that was played last).
 * @param props.onSelect Called with the video on a tap.
 * @returns The row.
 */
export function HelpItem({ video, focus, onSelect }: { video: HelpVideo; focus: boolean; onSelect: (video: HelpVideo) => void }) {
  const t = useTranslations("Help");
  const locale = useLocale();
  return (
    <button
      type="button"
      autoFocus={focus}
      onClick={() => onSelect(video)}
      className="hover:bg-accent flex min-h-11 cursor-pointer items-center gap-3 rounded-md border p-2 text-left"
    >
      <img src={mediaUrl(video.id, "jpg")} alt="" loading="lazy" className={cn("bg-muted shrink-0 rounded object-cover text-[0px]", video.format === "9x16" ? "h-16 w-9" : "h-12 w-20")} />
      <span className="flex flex-col">
        <span className="font-medium">{locale === "th" ? video.title.th : video.title.en}</span>
        <span className="text-muted-foreground text-xs">
          {length(video.durationSec)}
          {locale !== "th" && ` · ${t("thaiNarration")}`}
        </span>
      </span>
    </button>
  );
}

/**
 * The player: the poster and a play button first; after the tap, YouTube (teacher) or our own file.
 * When our file does not load, a short message replaces the black box.
 * @param props.video The video.
 * @param props.audience Teacher (YouTube when the video is there) or student (our file only).
 * @param props.onPlay Called with the video and the source at each play.
 * @param props.onBack Called by the back button.
 * @returns The player.
 */
export function HelpPlayer({
  video,
  audience,
  onPlay,
  onBack,
}: {
  video: HelpVideo;
  audience: HelpAudience;
  onPlay: (video: HelpVideo, source: "youtube" | "file") => void;
  onBack: () => void;
}) {
  const t = useTranslations("Help");
  const locale = useLocale();
  const [playing, setPlaying] = useState(false);
  const [ownFile, setOwnFile] = useState(false);
  const [failed, setFailed] = useState(false);
  const title = locale === "th" ? video.title.th : video.title.en;
  const youtubeId = audience === "teacher" && !ownFile ? YOUTUBE[video.id] : undefined;
  return (
    <div className="flex flex-col gap-3">
      <Button variant="ghost" className="w-fit cursor-pointer" onClick={onBack}>
        <ArrowLeftIcon aria-hidden="true" />
        {t("back")}
      </Button>
      <p className="font-medium">{title}</p>
      <div data-format={video.format} className={cn("relative overflow-hidden rounded-md bg-black", video.format === "9x16" ? "mx-auto aspect-[9/16] w-[min(100%,calc(70svh*9/16))]" : "aspect-video w-full")}>
        {!playing ? (
          <button
            type="button"
            onClick={() => {
              setPlaying(true);
              onPlay(video, youtubeId ? "youtube" : "file");
            }}
            aria-label={t("play", { title })} className="group absolute inset-0 cursor-pointer">
            <img src={mediaUrl(video.id, "jpg")} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white group-hover:bg-black/80">
              <PlayIcon aria-hidden="true" className="h-8 w-8" />
            </span>
          </button>
        ) : youtubeId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&playsinline=1`}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="h-full w-full"
          />
        ) : failed ? (
          <p role="alert" className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white">
            {t("videoError")}
          </p>
        ) : (
          <video
            src={mediaUrl(video.id, "mp4")}
            poster={mediaUrl(video.id, "jpg")}
            controls
            playsInline
            autoPlay
            onError={() => setFailed(true)}
            className="h-full w-full"
          />
        )}
      </div>
      {playing && youtubeId && (
        <Button
          variant="outline"
          className="w-fit cursor-pointer"
          onClick={() => {
            setOwnFile(true);
            onPlay(video, "file");
          }}
        >
          {t("noYouTube")}
        </Button>
      )}
    </div>
  );
}
