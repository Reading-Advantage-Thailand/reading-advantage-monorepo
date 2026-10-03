"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import {
  DOMAINS,
  DOMAIN_META,
  graphData,
  type Domain,
  type GraphData,
} from "./mastery-advantage-graph-data";

export interface MasteryGraphLabels {
  idle: string;
  forgetting: string;
  reviewing: string;
  reviewed: string;
  reviewedTag: string;
  ready: string;
  readyTag: string;
  learning: string;
  unlocked: string;
  expandedOne: string;
  expandedMany: string;
  pathUpdated: string;
  svgLabel: string;
  example: string;
  planned: string;
  tabsLabel: string;
  controlsLabel: string;
  play: string;
  pause: string;
  previous: string;
  next: string;
  stepOf: string;
  whatsNext: string;
  nextTitle: string;
  nextHere: string;
  nextReady: string;
  nextNone: string;
  states: { mastered: string; here: string; ready: string; locked: string };
}

export const DEFAULT_GRAPH_LABELS: MasteryGraphLabels = {
  idle: "Mastery Advantage ®",
  forgetting: "About to forget — reviewing before it fades",
  reviewing: "Reviewing…",
  reviewed: "Reviewed! Memory secured.",
  reviewedTag: "Reviewed! ✓",
  ready: "Ready to learn — prerequisites mastered",
  readyTag: "Ready to learn!",
  learning: "Learning…",
  unlocked: "Skill unlocked! Recalculating your path…",
  expandedOne: "{n} new skill unlocked — your path just expanded",
  expandedMany: "{n} new skills unlocked — your path just expanded",
  pathUpdated: "Your path has been updated",
  svgLabel: "Mastery Advantage knowledge graph",
  example: "Illustrative example, not real student data.",
  planned: "Planned, no date",
  tabsLabel: "Choose a subject",
  controlsLabel: "Graph controls",
  play: "Play",
  pause: "Pause",
  previous: "Previous step",
  next: "Next step",
  stepOf: "Step {current} of {total}",
  whatsNext: "What is next",
  nextTitle: "What is next for this student",
  nextHere: "You are here: {cluster}",
  nextReady: "{cluster}: {n} ready",
  nextNone: "No skills are ready yet.",
  states: {
    mastered: "Mastered",
    here: "You are here",
    ready: "Ready",
    locked: "Locked",
  },
};

/** Domains whose Advantage product is a planned book line with no date. */
const PLANNED: ReadonlySet<Domain> = new Set([
  "storytime",
  "math",
  "science",
  "stem",
  "zhongwen",
]);

type NodeState = "mastered" | "ready" | "current" | "locked" | "forgetting" | "refreshed";

interface Step {
  caption: string;
  color: string;
  overrides: Record<number, NodeState>;
  cursor?: { x: number; y: number };
  tag?: { x: number; y: number; text: string; color: string };
  dwell: number;
}

const fmt = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));

/** Builds the scripted lesson-to-unlock sequence for one domain as a list of steps. */
export function buildSteps(d: GraphData, L: MasteryGraphLabels): Step[] {
  const { forgetIdx, currentIdx, learnIdx, newReady } = d;
  const f = d.nodes[forgetIdx];
  const c = d.nodes[currentIdx];
  const l = learnIdx != null ? d.nodes[learnIdx] : null;
  const amber = "#d97706";
  const gold = "#f5b942";
  const green = "#34d399";
  const steps: Step[] = [
    { caption: L.idle, color: "", overrides: {}, dwell: 1800 },
    {
      caption: L.forgetting,
      color: amber,
      overrides: { [forgetIdx]: "forgetting" },
      cursor: { x: c.x, y: c.y },
      dwell: 1400,
    },
    {
      caption: L.reviewing,
      color: amber,
      overrides: { [forgetIdx]: "forgetting" },
      cursor: { x: f.x, y: f.y },
      dwell: 1100,
    },
    {
      caption: L.reviewed,
      color: green,
      overrides: { [forgetIdx]: "refreshed" },
      cursor: { x: f.x, y: f.y },
      tag: { x: f.x, y: f.y - f.r - 30, text: L.reviewedTag, color: green },
      dwell: 1400,
    },
  ];
  if (!l) return steps;

  const reviewed = { [forgetIdx]: "mastered" } as Record<number, NodeState>;
  steps.push(
    {
      caption: L.ready,
      color: gold,
      overrides: reviewed,
      cursor: { x: c.x, y: c.y },
      tag: { x: l.x, y: l.y - l.r - 30, text: L.readyTag, color: gold },
      dwell: 1600,
    },
    {
      caption: L.learning,
      color: gold,
      overrides: reviewed,
      cursor: { x: l.x, y: l.y },
      dwell: 1100,
    },
  );
  const unlocked = { ...reviewed, [currentIdx]: "mastered", [learnIdx]: "current" } as Record<number, NodeState>;
  steps.push({
    caption: L.unlocked,
    color: "#818cf8",
    overrides: unlocked,
    dwell: 1200,
  });
  const n = newReady.length;
  const expanded = { ...unlocked };
  for (const i of newReady) expanded[i] = "ready";
  steps.push({
    caption:
      n === 0 ? L.pathUpdated : fmt(n === 1 ? L.expandedOne : L.expandedMany, { n }),
    color: green,
    overrides: expanded,
    dwell: 3200,
  });
  return steps;
}

/** Returns the label of the cluster whose ellipse contains the node most deeply. */
function clusterOf(d: GraphData, i: number): string {
  const n = d.nodes[i];
  let best = d.clusters[0];
  let bestScore = Infinity;
  for (const c of d.clusters) {
    const score = ((n.x - c.cx) / c.rx) ** 2 + ((n.y - c.cy) / c.ry) ** 2;
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best.label;
}

export function MasteryAdvantageGraph({
  className = "",
  interactive = false,
  pauseControl = false,
  labels = DEFAULT_GRAPH_LABELS,
}: {
  className?: string;
  /** Show domain tabs, step controls, hover details and the "what is next" view. */
  interactive?: boolean;
  /** Show only a play/pause button on the decorative loop. */
  pauseControl?: boolean;
  labels?: MasteryGraphLabels;
}) {
  const [domainIndex, setDomainIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [showNext, setShowNext] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const uid = useId();

  const domain = DOMAINS[domainIndex];
  const meta = DOMAIN_META[domain];
  const data = graphData[domain];

  const steps = useMemo(() => buildSteps(data, labels), [data, labels]);
  const step = steps[Math.min(stepIndex, steps.length - 1)];

  /* ── Visibility ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* ── Start paused for visitors who prefer reduced motion ── */
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setPlaying(false);
    }
  }, []);

  /* ── Autoplay: advance one step after its dwell time ── */
  useEffect(() => {
    if (!playing || !isVisible || showNext) return;
    const id = setTimeout(() => {
      if (stepIndex < steps.length - 1) {
        setStepIndex(stepIndex + 1);
      } else if (interactive) {
        setStepIndex(0);
      } else {
        // Decorative loop cycles through the subjects.
        setDomainIndex((i) => (i + 1) % DOMAINS.length);
        setStepIndex(0);
      }
    }, step.dwell);
    return () => clearTimeout(id);
  }, [playing, isVisible, showNext, stepIndex, steps.length, step.dwell, interactive]);

  const selectDomain = (i: number) => {
    setDomainIndex(i);
    setStepIndex(0);
    setHovered(null);
  };

  const go = (delta: number) => {
    setPlaying(false);
    setStepIndex((i) => Math.max(0, Math.min(steps.length - 1, i + delta)));
  };

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const move = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (move === undefined && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? DOMAINS.length - 1
          : (i + (move as number) + DOMAINS.length) % DOMAINS.length;
    selectDomain(next);
    document.getElementById(`${uid}-tab-${next}`)?.focus();
  };

  /* ── Derived styles ── */
  const cssVars = useMemo(
    () => ({
      "--ma-node-mastered": meta.mastered,
      "--ma-node-mastered-ring": meta.ring,
      "--ma-edge-active": meta.edge,
      "--ma-node-current-ring": meta.currentRing,
    }),
    [meta],
  );

  const effectiveState = (idx: number): NodeState =>
    step.overrides[idx] || data.nodes[idx].state;

  const readyByCluster = useMemo(() => {
    const counts = new Map<string, number>();
    let here: string | null = null;
    data.nodes.forEach((_, i) => {
      const s = step.overrides[i] || data.nodes[i].state;
      if (s === "ready") {
        const cl = clusterOf(data, i);
        counts.set(cl, (counts.get(cl) ?? 0) + 1);
      }
      if (s === "current") here = clusterOf(data, i);
    });
    return { counts, here };
  }, [data, step]);

  const stateLabel = (s: NodeState) =>
    s === "mastered" || s === "refreshed"
      ? labels.states.mastered
      : s === "current"
        ? labels.states.here
        : s === "ready"
          ? labels.states.ready
          : s === "forgetting"
            ? labels.states.mastered
            : labels.states.locked;

  const hoveredNode = hovered != null ? data.nodes[hovered] : null;
  const caption = { text: step.caption, color: step.color };
  const cursor = step.cursor;

  return (
    <div ref={containerRef} className={`relative ${interactive ? "bg-[#0b1220]" : ""} ${className}`}>
      {interactive && (
        <div
          role="tablist"
          aria-label={labels.tabsLabel}
          className="flex flex-wrap gap-1 px-3 py-2 border-b border-white/5"
          style={{ background: "rgba(10,16,28,0.98)" }}
        >
          {DOMAINS.map((d, i) => {
            const selected = i === domainIndex;
            return (
              <button
                key={d}
                type="button"
                role="tab"
                id={`${uid}-tab-${i}`}
                aria-selected={selected}
                aria-controls={`${uid}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => selectDomain(i)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
                  selected ? "text-white" : "text-white/70 hover:text-white"
                }`}
                style={{
                  borderBottom: `2px solid ${selected ? DOMAIN_META[d].mastered : "transparent"}`,
                }}
              >
                {DOMAIN_META[d].label.replace(" Advantage", "")}
                {PLANNED.has(d) && (
                  <span className="sr-only">{`, ${labels.planned}`}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {/* Status bar */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="flex items-center px-6 py-3.5 min-h-[56px] border-b border-white/5"
        style={{ background: "rgba(10,16,28,0.98)" }}
      >
        <span
          className="text-sm md:text-base font-extrabold tracking-tight transition-colors duration-300"
          style={{ color: caption.color || "rgba(255,255,255,0.9)" }}
        >
          {caption.text}
        </span>
        {pauseControl && !interactive && (
          <button
            type="button"
            aria-label={playing ? labels.pause : labels.play}
            title={playing ? labels.pause : labels.play}
            onClick={() => setPlaying((p) => !p)}
            className="ml-auto h-8 min-w-8 rounded-md border border-white/25 px-2 text-[10px] font-semibold text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            {playing ? <Pause aria-hidden="true" className="mx-auto h-3 w-3" /> : <Play aria-hidden="true" className="mx-auto h-3 w-3" />}
          </button>
        )}
      </div>

      <svg
        role="img"
        aria-label={labels.svgLabel}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid meet"
        className={`mastery-advantage-graph block h-auto w-full ${interactive ? "max-h-[68vh]" : ""}`}
        data-animate={isVisible && playing ? "true" : "false"}
        data-domain={domain}
        id={interactive ? `${uid}-panel` : undefined}
        style={cssVars as React.CSSProperties}
      >

        <defs>
          <radialGradient id="ma-bg-gradient" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="var(--ma-bg-soft)" />
            <stop offset="100%" stopColor="var(--ma-bg)" />
          </radialGradient>
          <pattern
            id="ma-grid-pattern"
            x="0"
            y="0"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="var(--ma-grid)"
              strokeWidth="1"
            />
          </pattern>
          <filter
            id="ma-glow-soft"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter
            id="ma-glow-strong"
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient
            id="ma-active-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="var(--ma-node-mastered)" />
            <stop offset="100%" stopColor="var(--ma-node-current-ring)" />
          </linearGradient>
          <symbol id="ma-icon-check" viewBox="0 0 20 20">
            <path
              d="M5 10.5 L8.5 14 L15 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </symbol>
          <symbol id="ma-icon-spark" viewBox="0 0 20 20">
            <path
              d="M10 3 L11.5 8.5 L17 10 L11.5 11.5 L10 17 L8.5 11.5 L3 10 L8.5 8.5 Z"
              fill="currentColor"
            />
          </symbol>
          <symbol id="ma-icon-lock" viewBox="0 0 20 20">
            <rect
              x="6"
              y="9"
              width="8"
              height="7"
              rx="1.2"
              fill="currentColor"
            />
            <path
              d="M7.5 9 V7 a2.5 2.5 0 0 1 5 0 V9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
            />
          </symbol>
        </defs>

        {/* Background */}
        <g>
          <rect width="1000" height="1000" fill="url(#ma-bg-gradient)" />
          <rect width="1000" height="1000" fill="url(#ma-grid-pattern)" />
        </g>

        {/* Clusters */}
        <g>
          {data.clusters.map((c, i) => (
            <ellipse
              key={`c-${i}`}
              cx={c.cx}
              cy={c.cy}
              rx={c.rx}
              ry={c.ry}
              fill={c.color ? `${c.color}18` : "var(--ma-cluster-fill)"}
              stroke={c.color ? `${c.color}70` : "var(--ma-cluster-stroke)"}
              strokeDasharray="3 5"
              style={{ transition: "fill .5s, stroke .5s" }}
            />
          ))}
        </g>

        {/* Cluster labels */}
        <g>
          {data.clusters.map((c, i) => (
            <text
              key={`cl-${i}`}
              className="ma-cluster-label"
              x={c.cx}
              y={c.labelY}
              textAnchor="middle"
              style={c.color ? { fill: `${c.color}cc` } : undefined}
            >
              {c.label}
            </text>
          ))}
        </g>

        {/* Edges */}
        <g>
          {data.edges.map((d, i) => (
            <path key={`e-${i}`} className="ma-edge" d={d} />
          ))}
        </g>

        {/* Active path */}
        <g>
          <path
            className="ma-edge-active-line"
            d={data.activePath}
            stroke="url(#ma-active-gradient)"
          />
        </g>

        {/* Nodes */}
        <g>
          {data.nodes.map((n, i) => {
            const state = effectiveState(i);
            const iconId =
              state === "mastered"
                ? "#ma-icon-check"
                : state === "locked"
                  ? "#ma-icon-lock"
                  : "#ma-icon-spark";
            return (
              <g
                key={`n-${i}`}
                className="ma-node"
                data-state={state}
                transform={`translate(${n.x} ${n.y})`}
                opacity={
                  showNext && state !== "ready" && state !== "current" ? 0.3 : 1
                }
                onMouseEnter={interactive ? () => setHovered(i) : undefined}
                onMouseLeave={interactive ? () => setHovered(null) : undefined}
                filter={
                  n.glow && state === "current"
                    ? "url(#ma-glow-strong)"
                    : undefined
                }
              >
                <circle
                  className="ma-node-fill"
                  r={n.r}
                  style={
                    n.fillColor &&
                    state !== "forgetting" &&
                    state !== "refreshed"
                      ? { fill: n.fillColor, transition: "fill .5s" }
                      : undefined
                  }
                />
                <circle
                  className="ma-node-ring"
                  r={n.r + (state === "current" ? 6 : 4)}
                  style={
                    n.ringColor &&
                    state !== "forgetting" &&
                    state !== "refreshed"
                      ? { stroke: n.ringColor, transition: "stroke .5s" }
                      : undefined
                  }
                />
                <use
                  href={iconId}
                  x="-10"
                  y="-10"
                  width="20"
                  height="20"
                  className="ma-node-icon"
                />
              </g>
            );
          })}
        </g>

        {/* Cursor */}
        <g
          aria-hidden="true"
          style={{
            transform: cursor ? `translate(${cursor.x}px, ${cursor.y}px)` : undefined,
            opacity: cursor ? 1 : 0,
            transition: "transform .8s ease-in-out, opacity .3s",
          }}
          filter="url(#ma-glow-soft)"
        >
          <circle r="13" fill="#fff" opacity="0.35" />
          <circle r="6" fill="#fff" />
        </g>

        {/* Floating annotation label */}
        <g aria-hidden="true">
          {step.tag && (() => {
            const w = step.tag.text.length * 7.5 + 24;
            return (
              <g transform={`translate(${step.tag.x} ${step.tag.y})`}>
                <rect x={-w / 2} y={-14} width={w} height={22} rx={4} fill="#0b1220" opacity="0.9" />
                <text
                  textAnchor="middle"
                  y={3}
                  fontSize="12"
                  fontWeight="700"
                  fontFamily="ui-sans-serif,system-ui,sans-serif"
                  fill={step.tag.color || "#fff"}
                >
                  {step.tag.text}
                </text>
              </g>
            );
          })()}
        </g>

        {/* "You are here" label follows the current node */}
        <g>
          {data.nodes.map((n, k) =>
            effectiveState(k) === "current" ? (
              <text
                key={`here-${k}`}
                className="ma-node-label"
                x={n.x}
                y={n.y - n.r - 12}
                textAnchor="middle"
              >
                {labels.states.here}
              </text>
            ) : null,
          )}
        </g>

        {/* Hover details (mouse only; the "what is next" panel serves keyboard users) */}
        {hoveredNode && hovered != null && (
          <g aria-hidden="true" transform={`translate(${hoveredNode.x} ${hoveredNode.y + hoveredNode.r + 26})`} pointerEvents="none">
            {(() => {
              const text = `${stateLabel(effectiveState(hovered))} · ${clusterOf(data, hovered)}`;
              const w = text.length * 7.2 + 24;
              return (
                <>
                  <rect x={-w / 2} y={-15} width={w} height={24} rx={5} fill="#0b1220" stroke="rgba(255,255,255,0.25)" />
                  <text textAnchor="middle" y={2} fontSize="13" fontWeight="600" fill="#fff">
                    {text}
                  </text>
                </>
              );
            })()}
          </g>
        )}
      </svg>

      {interactive && (
        <div
          className="border-t border-white/5 px-4 py-3 text-white"
          style={{ background: "rgba(10,16,28,0.98)" }}
        >
          <div
            role="group"
            aria-label={labels.controlsLabel}
            className="flex flex-wrap items-center gap-2"
          >
            {[
              { label: labels.previous, onClick: () => go(-1), disabled: stepIndex === 0, icon: SkipBack },
              { label: playing ? labels.pause : labels.play, onClick: () => setPlaying((p) => !p), disabled: false, icon: playing ? Pause : Play },
              { label: labels.next, onClick: () => go(1), disabled: stepIndex >= steps.length - 1, icon: SkipForward },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                aria-label={b.label}
                title={b.label}
                disabled={b.disabled}
                onClick={b.onClick}
                className="h-9 min-w-9 rounded-md border border-white/25 px-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                <b.icon aria-hidden="true" className="mx-auto h-4 w-4" />
              </button>
            ))}
            <button
              type="button"
              aria-pressed={showNext}
              onClick={() => setShowNext((v) => !v)}
              className={`h-9 rounded-md border px-3 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
                showNext ? "border-mastery-ready bg-mastery-ready text-[#1a1208]" : "border-white/25 hover:bg-white/10"
              }`}
            >
              {labels.whatsNext}
            </button>
            <span className="ml-auto text-xs text-white/70">
              {fmt(labels.stepOf, { current: stepIndex + 1, total: steps.length })}
            </span>
          </div>

          {showNext && (
            <div className="mt-3 rounded-lg border border-white/15 p-3 text-sm" role="region" aria-label={labels.nextTitle}>
              <p className="font-semibold">{labels.nextTitle}</p>
              <ul className="mt-2 space-y-1 text-white/85">
                {readyByCluster.here && (
                  <li>{fmt(labels.nextHere, { cluster: readyByCluster.here })}</li>
                )}
                {[...readyByCluster.counts].map(([cluster, n]) => (
                  <li key={cluster}>{fmt(labels.nextReady, { cluster, n })}</li>
                ))}
                {readyByCluster.counts.size === 0 && <li>{labels.nextNone}</li>}
              </ul>
            </div>
          )}

          <p className="mt-3 text-xs text-white/70">
            {PLANNED.has(domain) ? `${labels.planned}. ` : ""}
            {labels.example}
          </p>
        </div>
      )}
    </div>
  );
}
