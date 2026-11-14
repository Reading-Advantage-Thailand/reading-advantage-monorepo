"use client";
/**
 * The Primary skin of the shared read-along player (task 7.2). The file name holds no
 *
 * The shared package holds no app design and no translation, so the host passes its own chrome
 * and its own labels through the `chrome` and `labels` props of `ReadAlongPlayer`. This hook file is
 * builds both from the RPG chrome and the `Components` messages, so every Primary caller renders
 * the same player the Primary copy rendered.
 */
import { useTranslations } from "next-intl";
import { Panel, rpgButton, Sign } from "@/components/rpg/chrome";
import type {
  ReadAlongPlayerChrome,
  ReadAlongPlayerLabels,
} from "@reading-advantage/read-along/components/read-along/read-along-player";

/**
 * Builds the translated labels and the RPG chrome of the shared player.
 * @returns The `labels` and `chrome` props of `ReadAlongPlayer`.
 */
export function useReadAlongPlayerSkin(): {
  labels: ReadAlongPlayerLabels;
  chrome: ReadAlongPlayerChrome;
} {
  const t = useTranslations("Components");
  return {
    labels: {
      previous: t("previousSentence"),
      replay: t("replaySentence"),
      next: t("nextSentence"),
      play: t("playAudio"),
      stop: t("stopAudio"),
      speed: (speed: number) => t("changeSpeed", { speed: String(speed) }),
    },
    chrome: { Panel, Sign, buttonClassName: rpgButton },
  };
}
