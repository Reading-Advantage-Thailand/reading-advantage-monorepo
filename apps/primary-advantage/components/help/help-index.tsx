"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TEACHER_CARD } from "@/components/teacher/teacher-shell";
import { teacherHelpIndex } from "@/lib/help/areas";
import { sendHelpEvent } from "@/lib/help/events";
import { HELP_VIDEOS, type HelpVideo } from "@/lib/help/videos";
import { HelpItem, HelpPlayer } from "./help-panel";

/**
 * The teacher help index (track primary_in_app_help_20261023, FR-9): every enabled teacher video
 * by area. A tap opens the player in a dialog. The manual links here with `?play=<id>` (FR-10).
 * @param props.initial The id of a video to open at once, from the `play` search parameter.
 * @returns The areas and the player dialog.
 */
export function HelpIndex({ initial }: { initial?: string }) {
  const t = useTranslations("Help");
  const [selected, setSelected] = useState<HelpVideo | null>(
    () => HELP_VIDEOS.find((video) => video.id === initial && video.enabled && video.audience !== "student") ?? null,
  );
  return (
    <>
      {teacherHelpIndex().map(({ area, videos }) => (
        <section key={area} aria-labelledby={`help-area-${area}`} className={TEACHER_CARD}>
          <h2 id={`help-area-${area}`} className="text-lg font-semibold">
            {t(`areas.${area}`)}
          </h2>
          <div className="grid gap-2 md:grid-cols-2">
            {videos.map((video) => (
              <HelpItem key={video.id} video={video} focus={false} onSelect={setSelected} />
            ))}
          </div>
        </section>
      ))}
      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription className="sr-only">{t("indexIntro")}</DialogDescription>
          </DialogHeader>
          {selected && (
            <HelpPlayer
              key={selected.id}
              video={selected}
              audience="teacher"
              onPlay={(video, source) => sendHelpEvent({ event: "play", routePattern: "/teacher/help", videoId: video.id, source })}
              onBack={() => setSelected(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
