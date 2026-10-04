"use client";

import { useEffect, useRef } from "react";

import type { StoryGameOptions } from "../host/story-game.js";
import { startStoryGame } from "../host/story-game.js";

/** Props of the React wrapper: the controller options without the container. */
export type StoryGameHostProps = Omit<StoryGameOptions, "container"> & { className?: string };

/**
 * Plays one story game inside a div: the briefing, the 3D or 2D game, and the results. The game
 * restarts when the cartridge or the input changes; callbacks may change without a restart.
 */
export function StoryGameHost(props: StoryGameHostProps) {
  const ref = useRef<HTMLDivElement>(null);
  const callbacks = useRef(props);
  callbacks.current = props;
  const { cartridge, input } = props;

  useEffect(() => {
    const container = ref.current;
    if (!container) return undefined;
    const { className: _className, ...rest } = callbacks.current;
    void _className;
    const session = startStoryGame({
      ...rest,
      container,
      cartridge,
      input,
      onComplete: (...args) => callbacks.current.onComplete(...args),
      onExit: () => callbacks.current.onExit(),
      onDiagnostic: (event) => callbacks.current.onDiagnostic?.(event),
    });
    return () => {
      void session.destroy();
    };
  }, [cartridge, input]);

  return <div ref={ref} className={props.className ?? "h-full min-h-[480px] w-full"} />;
}
