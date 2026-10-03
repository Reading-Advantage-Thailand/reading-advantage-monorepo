"use client";

import Image from "next/image";
import { useState } from "react";
import { ExternalLink, Play } from "lucide-react";

const DEMO_URL = "/experience/index.html";
const POSTER_URL = "/experience/stories/mias-balloon-animals/img-1.webp";

interface ExperienceDemoProps {
  text: {
    play: string;
    fullscreen: string;
    hint: string;
    frameTitle: string;
    posterAlt: string;
  };
}

/**
 * The Primary Advantage game demo in the page. The demo is about 30 MB, so the frame loads only
 * after the visitor presses the play button.
 */
export function ExperienceDemo({ text }: ExperienceDemoProps) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="w-full">
      <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-3xl border border-site-border bg-slate-900 shadow-xl sm:aspect-[4/3] sm:max-w-4xl">
        {playing ? (
          <iframe
            src={DEMO_URL}
            title={text.frameTitle}
            className="absolute inset-0 h-full w-full border-0"
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={text.play}
            className="group absolute inset-0 flex items-center justify-center"
          >
            <Image src={POSTER_URL} alt={text.posterAlt} fill unoptimized sizes="(max-width: 768px) 100vw, 56rem" className="object-cover" />
            <span className="absolute inset-0 bg-slate-900/30 transition-colors group-hover:bg-slate-900/20" />
            <span className="relative inline-flex items-center gap-3 rounded-2xl bg-white px-8 py-4 text-lg font-bold text-cyan-800 shadow-xl transition-transform group-hover:-translate-y-1">
              <Play className="h-6 w-6" aria-hidden="true" />
              {text.play}
            </span>
          </button>
        )}
      </div>
      <div className="mx-auto mt-4 flex max-w-4xl flex-col items-center justify-between gap-2 text-sm text-slate-600 sm:flex-row">
        <span>{text.hint}</span>
        <a
          href={DEMO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 font-semibold text-cyan-700 hover:text-cyan-900"
        >
          {text.fullscreen}
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
