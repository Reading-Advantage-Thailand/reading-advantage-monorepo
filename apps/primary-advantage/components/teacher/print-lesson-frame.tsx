"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, PrinterIcon } from "lucide-react";
import { Bubble, Panel, RpgButton, RpgLink } from "@/components/rpg/chrome";
import { Sprite } from "@/components/rpg/sprite";

const HOST = "/rpg/kit/npc/quest-giver-idle-strip.png";
/** The width of an A4 page at 96 dpi, in CSS pixels. */
const PAGE_WIDTH = 794;
/** The height of the preview frame as a share of the screen height. */
const FRAME_VH = 70;

export interface PrintLessonFrameLabels {
  frameTitle: string;
  printNow: string;
  loading: string;
  bubbleWait: string;
  bubbleReady: string;
  hint: string;
  back: string;
}

/**
 * The print panel of one lesson: the quest-giver, a sandboxed preview of the A4 pages, the hint,
 * a Print button that stays disabled until the frame and its pictures load, and the back link.
 * The frame has no same-origin token, so the page prints through the `workbook:print` message.
 * @param props.html The full HTML document of the lesson.
 * @param props.labels The visible texts.
 * @param props.backHref The link back to the lesson page.
 * @returns The panel.
 */
export function PrintLessonFrame({ html, labels, backHref }: { html: string; labels: PrintLessonFrameLabels; backHref: string }) {
  const [ready, setReady] = useState(false);
  const [scale, setScale] = useState(1);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const matRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mat = matRef.current;
    if (!mat || typeof ResizeObserver === "undefined") return;
    const fit = () => setScale(Math.min(1, Math.max(0.2, (mat.clientWidth - 24) / PAGE_WIDTH)));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(mat);
    return () => observer.disconnect();
  }, []);

  return (
    <Panel className="w-full" data-print-page>
      <div className="flex items-center gap-3">
        <Sprite src={HOST} size={72} className="shrink-0" />
        <Bubble>{ready ? labels.bubbleReady : labels.bubbleWait}</Bubble>
      </div>
      <div ref={matRef} data-print-frame className="overflow-hidden rounded-lg bg-neutral-800 p-3" style={{ height: `${FRAME_VH}vh` }}>
        <iframe
          ref={frameRef}
          title={labels.frameTitle}
          srcDoc={html}
          sandbox="allow-scripts allow-modals"
          onLoad={() => setReady(true)}
          className="block border-0 bg-white"
          style={{ width: PAGE_WIDTH, height: `${FRAME_VH / scale}vh`, marginInline: scale === 1 ? "auto" : 0, transform: `scale(${scale})`, transformOrigin: "top left" }}
        />
      </div>
      <p className="text-sm">{labels.hint}</p>
      <div className="flex flex-wrap items-center gap-3">
        {ready ? (
          <RpgButton tone="gold" onClick={() => frameRef.current?.contentWindow?.postMessage("workbook:print", "*")}>
            <PrinterIcon aria-hidden="true" className="size-5" />
            {labels.printNow}
          </RpgButton>
        ) : (
          <RpgButton tone="gold" disabled aria-disabled="true">
            {labels.loading}
          </RpgButton>
        )}
        <RpgLink tone="iron" href={backHref}>
          <ArrowLeftIcon aria-hidden="true" className="size-5" />
          {labels.back}
        </RpgLink>
      </div>
    </Panel>
  );
}
