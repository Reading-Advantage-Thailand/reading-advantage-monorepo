"use client";

import { Volume2Icon, VolumeXIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useSound } from "@/hooks/use-sound";

/**
 * Mute switch for the app sounds (FR-9). The setting is stored per student. The button plays a
 * short sound when the student turns sound on, so the choice is heard at once.
 * @returns The sound toggle button.
 */
export function SoundToggle() {
  const t = useTranslations("AppShell");
  const { muted, setMuted, play } = useSound();
  const toggle = () => {
    setMuted(!muted);
    if (muted) play("select");
  };
  return (
    <Button variant="ghost" className="h-8 w-8 cursor-pointer px-0" aria-pressed={muted} onClick={toggle}>
      {muted ? <VolumeXIcon aria-hidden="true" /> : <Volume2Icon aria-hidden="true" />}
      <span className="sr-only">{muted ? t("soundOn") : t("soundOff")}</span>
    </Button>
  );
}
