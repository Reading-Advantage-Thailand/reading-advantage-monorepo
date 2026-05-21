"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DOMAINS,
  DOMAIN_META,
  graphData,
} from "./mastery-advantage-graph-data";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface FloatingLabel {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
}

export function MasteryAdvantageGraph({ className = "" }: { className?: string }) {
  const [domainIndex, setDomainIndex] = useState(0);
  const [caption, setCaption] = useState({ text: "Mastery Advantage ®", color: "" });
  const [nodeOverrides, setNodeOverrides] = useState<Record<number, string>>({});
  const [floatingLabels, setFloatingLabels] = useState<FloatingLabel[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<SVGGElement>(null);
  const runningRef = useRef(false);
  const abortRef = useRef(false);
  const domainIndexRef = useRef(0);
  const labelIdRef = useRef(0);

  domainIndexRef.current = domainIndex;

  const domain = DOMAINS[domainIndex];
  const meta = DOMAIN_META[domain];
  const data = graphData[domain];

  /* ── Cursor travel (RAF + direct DOM) ── */
  const travelCursor = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    ms: number
  ) => {
    return new Promise<void>((resolve) => {
      const el = cursorRef.current;
      if (!el) {
        resolve();
        return;
      }
      el.style.display = "block";

      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const s = Math.min(60, len * 0.38);
      const cpX = mx - (dy / len) * s;
      const cpY = my + (dx / len) * s;

      const t0 = performance.now();
      function tick(now: number) {
        if (abortRef.current) {
          if (el) el.style.display = "none";
          resolve();
          return;
        }
        const t = Math.min((now - t0) / ms, 1);
        const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const m = 1 - e;
        const x = m * m * x1 + 2 * m * e * cpX + e * e * x2;
        const y = m * m * y1 + 2 * m * e * cpY + e * e * y2;
        if (el) el.setAttribute("transform", `translate(${x} ${y})`);
        if (t < 1) requestAnimationFrame(tick);
        else {
          if (el) el.style.display = "none";
          resolve();
        }
      }
      requestAnimationFrame(tick);
    });
  };

  /* ── Demo sequence ── */
  const runDemo = async () => {
    if (runningRef.current || !isVisible) return;
    runningRef.current = true;
    abortRef.current = false;

    const d = graphData[DOMAINS[domainIndexRef.current]];
    const { forgetIdx, currentIdx, learnIdx, newReady } = d;
    const fN = d.nodes[forgetIdx];
    const cN = d.nodes[currentIdx];
    const lN = learnIdx != null ? d.nodes[learnIdx] : null;

    const addLabel = (x: number, y: number, text: string, color: string) => {
      const id = ++labelIdRef.current;
      setFloatingLabels((prev) => [...prev, { id, x, y, text, color }]);
      return id;
    };
    const removeLabel = (id: number) => {
      setFloatingLabels((prev) => prev.filter((l) => l.id !== id));
    };

    // Phase 1: forgetting
    setCaption({ text: "About to forget — reviewing before it fades", color: "#d97706" });
    setNodeOverrides({ [forgetIdx]: "forgetting" });
    await delay(900);
    if (abortRef.current) return;

    // Phase 2: travel to forgetting node
    if (fN && cN) {
      setCaption({ text: "Reviewing…", color: "#d97706" });
      await travelCursor(cN.x, cN.y, fN.x, fN.y, 860);
    }
    if (abortRef.current) return;

    // Phase 3: refreshed
    setCaption({ text: "Reviewed! Memory secured.", color: "#34d399" });
    const lid1 = fN ? addLabel(fN.x, fN.y - fN.r - 30, "Reviewed! ✓", "#34d399") : 0;
    setNodeOverrides((prev) => ({ ...prev, [forgetIdx]: "refreshed" }));
    await delay(700);
    if (abortRef.current) return;
    setNodeOverrides((prev) => ({ ...prev, [forgetIdx]: "mastered" }));
    await delay(700);
    if (abortRef.current) return;
    removeLabel(lid1);

    // Phase 4: travel back
    if (fN && cN) {
      await travelCursor(fN.x, fN.y, cN.x, cN.y, 800);
    }
    if (abortRef.current) return;
    await delay(480);
    if (abortRef.current) return;

    if (!lN) {
      runningRef.current = false;
      return;
    }

    // Phase 5: ready to learn
    setCaption({ text: "Ready to learn — prerequisites mastered", color: "#f5b942" });
    const lid2 = addLabel(lN.x, lN.y - lN.r - 30, "Ready to learn!", "#f5b942");
    await delay(700);
    if (abortRef.current) return;
    removeLabel(lid2);

    // Phase 6: learning
    setCaption({ text: "Learning…", color: "#f5b942" });
    if (cN && lN) {
      await travelCursor(cN.x, cN.y, lN.x, lN.y, 900);
    }
    if (abortRef.current) return;

    // Phase 7: skill unlocked
    setNodeOverrides((prev) => ({
      ...prev,
      [currentIdx]: "mastered",
      [learnIdx]: "current",
    }));
    setCaption({ text: "Skill unlocked! Recalculating your path…", color: "#818cf8" });
    await delay(520);
    if (abortRef.current) return;

    // Phase 8: cascade newly unlocked nodes
    for (let i = 0; i < newReady.length; i++) {
      setTimeout(() => {
        if (abortRef.current) return;
        setNodeOverrides((prev) => ({ ...prev, [newReady[i]]: "ready" }));
      }, i * 320);
    }
    await delay(newReady.length * 320 + 500);
    if (abortRef.current) return;

    // Phase 9: hold
    const n = newReady.length;
    setCaption({
      text:
        n > 0
          ? `${n} new skill${n !== 1 ? "s" : ""} unlocked — your path just expanded`
          : "Your path has been updated",
      color: "#34d399",
    });
    await delay(2500);

    // Reset
    setCaption({ text: "Mastery Advantage ®", color: "" });
    setNodeOverrides({});
    setFloatingLabels([]);
    runningRef.current = false;
  };

  /* ── Main loop: run demo, then advance domain ── */
  useEffect(() => {
    if (!isVisible) return;
    let cancelled = false;

    async function loop() {
      while (!cancelled) {
        await runDemo();
        if (cancelled) break;
        await delay(800); // brief pause between apps
        if (cancelled) break;
        setDomainIndex((i) => (i + 1) % DOMAINS.length);
        // reset transient state for the new domain
        setCaption({ text: "Mastery Advantage ®", color: "" });
        setNodeOverrides({});
        setFloatingLabels([]);
        await delay(400);
      }
    }

    loop();

    return () => {
      cancelled = true;
      abortRef.current = true;
      runningRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  /* ── IntersectionObserver ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* ── Reset when domain changes externally ── */
  useEffect(() => {
    setCaption({ text: "Mastery Advantage ®", color: "" });
    setNodeOverrides({});
    setFloatingLabels([]);
    runningRef.current = false;
    abortRef.current = true;
  }, [domainIndex]);

  /* ── Derived styles ── */
  const cssVars = useMemo(
    () => ({
      "--ma-node-mastered": meta.mastered,
      "--ma-node-mastered-ring": meta.ring,
      "--ma-edge-active": meta.edge,
      "--ma-node-current-ring": meta.currentRing,
    }),
    [meta]
  );

  const effectiveState = (idx: number) => nodeOverrides[idx] || data.nodes[idx].state;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Status bar */}
      <div
        className="flex items-center px-6 py-3.5 min-h-[56px] border-b border-white/5"
        style={{ background: "rgba(10,16,28,0.98)" }}
      >
        <span
          className="text-sm md:text-base font-extrabold tracking-tight transition-colors duration-300"
          style={{ color: caption.color || "rgba(255,255,255,0.9)" }}
        >
          {caption.text}
        </span>
      </div>

      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid meet"
        className="mastery-advantage-graph block h-auto w-full"
        data-animate={isVisible ? "true" : "false"}
        data-domain={domain}
        style={cssVars as React.CSSProperties}
      >
        <style>{`
          .mastery-advantage-graph {
            --ma-bg: #0b1220;
            --ma-bg-soft: #131c30;
            --ma-grid: rgba(255,255,255,0.04);
            --ma-node-locked: #2a3552;
            --ma-node-locked-ring: #3a4870;
            --ma-node-ready: #f5b942;
            --ma-node-ready-ring: #ffd27a;
            --ma-node-current: #ffffff;
            --ma-edge: rgba(255,255,255,0.08);
            --ma-cluster-fill: rgba(255,255,255,0.025);
            --ma-cluster-stroke: rgba(255,255,255,0.08);
            --ma-label: rgba(255,255,255,0.85);
            --ma-label-muted: rgba(255,255,255,0.45);
            --ma-cluster-label: rgba(255,255,255,0.5);
            font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
          }

          .ma-node circle.ma-node-fill { fill: var(--ma-node-locked); transition: fill .5s ease; }
          .ma-node circle.ma-node-ring { fill: none; stroke: var(--ma-node-locked-ring); stroke-width: 1.5; transition: stroke .5s ease, stroke-width .5s ease; }
          .ma-node .ma-node-icon       { fill: var(--ma-label-muted); transition: fill .5s ease, opacity .5s ease; opacity: 0.6; }

          .ma-node[data-state="ready"] circle.ma-node-fill    { fill: var(--ma-node-ready); }
          .ma-node[data-state="ready"] circle.ma-node-ring    { stroke: var(--ma-node-ready-ring); stroke-width: 2; }
          .ma-node[data-state="ready"] .ma-node-icon          { fill: #1a1208; opacity: 1; }

          .ma-node[data-state="mastered"] circle.ma-node-fill { fill: var(--ma-node-mastered); }
          .ma-node[data-state="mastered"] circle.ma-node-ring { stroke: var(--ma-node-mastered-ring); stroke-width: 2; }
          .ma-node[data-state="mastered"] .ma-node-icon       { fill: #0a2018; opacity: 1; }

          .ma-node[data-state="current"] circle.ma-node-fill  { fill: var(--ma-node-current); }
          .ma-node[data-state="current"] circle.ma-node-ring  { stroke: var(--ma-node-current-ring); stroke-width: 3; }
          .ma-node[data-state="current"] .ma-node-icon        { fill: #0b1220; opacity: 1; }

          .ma-node[data-state="forgetting"] circle.ma-node-fill { fill: #4a2f08 !important; opacity: .6; transition: fill .35s, opacity .35s; }
          .ma-node[data-state="forgetting"] circle.ma-node-ring { stroke: #d97706 !important; stroke-width: 1.5 !important; animation: ma-flicker .85s ease-in-out infinite !important; }

          .ma-node[data-state="refreshed"] circle.ma-node-fill  { fill: #ffffff !important; transition: fill .05s; }
          .ma-node[data-state="refreshed"] circle.ma-node-ring  { stroke: #ffffff !important; stroke-opacity: 1 !important; animation: ma-pop .55s ease-out forwards !important; transform-origin: center; transform-box: fill-box; }

          .ma-node-label { fill: var(--ma-label); font-size: 13px; font-weight: 500; letter-spacing: 0.01em; }
          .ma-cluster-label { fill: var(--ma-cluster-label); font-size: 18px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; transition: fill .5s ease; }

          .ma-edge { stroke: var(--ma-edge); stroke-width: 1.25; fill: none; }
          .ma-edge-active-line {
            stroke: var(--ma-edge-active);
            stroke-width: 2.5; fill: none;
            stroke-linecap: round;
            filter: url(#ma-glow-soft);
          }

          .mastery-advantage-graph[data-animate="true"] .ma-node[data-state="ready"] circle.ma-node-ring {
            animation: ma-pulse 2.4s ease-in-out infinite;
            transform-origin: center; transform-box: fill-box;
          }
          .mastery-advantage-graph[data-animate="true"] .ma-node[data-state="current"] circle.ma-node-ring {
            animation: ma-pulse-strong 1.8s ease-in-out infinite;
            transform-origin: center; transform-box: fill-box;
          }
          .mastery-advantage-graph[data-animate="true"] .ma-edge-active-line {
            stroke-dasharray: 8 6;
            animation: ma-flow 1.8s linear infinite;
          }

          @keyframes ma-pulse {
            0%, 100% { stroke-opacity: 0.6; stroke-width: 2; }
            50%      { stroke-opacity: 1;   stroke-width: 3.5; }
          }
          @keyframes ma-pulse-strong {
            0%, 100% { stroke-opacity: 0.8; stroke-width: 3; }
            50%      { stroke-opacity: 1;   stroke-width: 5; }
          }
          @keyframes ma-flow {
            to { stroke-dashoffset: -28; }
          }
          @keyframes ma-flicker {
            0%,100% { stroke-opacity: .25; stroke-width: 1; }
            50%      { stroke-opacity: 1;   stroke-width: 4.5; }
          }
          @keyframes ma-pop {
            0%   { stroke-width: 22; stroke-opacity: 1;  transform: scale(1.9); }
            60%  { stroke-width: 7;  stroke-opacity: .9; transform: scale(1.1); }
            100% { stroke-width: 2.5; stroke-opacity: .7; transform: scale(1); }
          }

          @media (prefers-reduced-motion: reduce) {
            .mastery-advantage-graph[data-animate="true"] * { animation: none !important; }
          }
        `}</style>

        <defs>
          <radialGradient id="ma-bg-gradient" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stop-color="var(--ma-bg-soft)" />
            <stop offset="100%" stop-color="var(--ma-bg)" />
          </radialGradient>
          <pattern id="ma-grid-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--ma-grid)" stroke-width="1" />
          </pattern>
          <filter id="ma-glow-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="ma-glow-strong" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="ma-active-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="var(--ma-node-mastered)" />
            <stop offset="100%" stop-color="var(--ma-node-current-ring)" />
          </linearGradient>
          <symbol id="ma-icon-check" viewBox="0 0 20 20">
            <path d="M5 10.5 L8.5 14 L15 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
          </symbol>
          <symbol id="ma-icon-spark" viewBox="0 0 20 20">
            <path d="M10 3 L11.5 8.5 L17 10 L11.5 11.5 L10 17 L8.5 11.5 L3 10 L8.5 8.5 Z" fill="currentColor" />
          </symbol>
          <symbol id="ma-icon-lock" viewBox="0 0 20 20">
            <rect x="6" y="9" width="8" height="7" rx="1.2" fill="currentColor" />
            <path d="M7.5 9 V7 a2.5 2.5 0 0 1 5 0 V9" fill="none" stroke="currentColor" stroke-width="1.4" />
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
                filter={n.glow && state === "current" ? "url(#ma-glow-strong)" : undefined}
              >
                <circle
                  className="ma-node-fill"
                  r={n.r}
                  style={
                    n.fillColor && state !== "forgetting" && state !== "refreshed"
                      ? { fill: n.fillColor, transition: "fill .5s" }
                      : undefined
                  }
                />
                <circle
                  className="ma-node-ring"
                  r={n.r + (state === "current" ? 6 : 4)}
                  style={
                    n.ringColor && state !== "forgetting" && state !== "refreshed"
                      ? { stroke: n.ringColor, transition: "stroke .5s" }
                      : undefined
                  }
                />
                <use href={iconId} x="-10" y="-10" width="20" height="20" className="ma-node-icon" />
              </g>
            );
          })}
        </g>

        {/* Cursor */}
        <g ref={cursorRef} style={{ display: "none" }} filter="url(#ma-glow-soft)">
          <circle r="13" fill="#fff" opacity="0.35" />
          <circle r="6" fill="#fff" />
        </g>

        {/* Floating annotation labels */}
        <g>
          {floatingLabels.map((l) => {
            const w = l.text.length * 7.5 + 24;
            return (
              <g key={l.id} transform={`translate(${l.x} ${l.y})`}>
                <rect x={-w / 2} y={-14} width={w} height={22} rx={4} fill="#0b1220" opacity="0.9" />
                <text
                  textAnchor="middle"
                  y={3}
                  fontSize="12"
                  fontWeight="700"
                  fontFamily="ui-sans-serif,system-ui,sans-serif"
                  fill={l.color || "#fff"}
                >
                  {l.text}
                </text>
              </g>
            );
          })}
        </g>

        {/* "You are here" label */}
        <g>
          <text
            className="ma-node-label"
            x={data.label.x}
            y={data.label.y}
            textAnchor="middle"
          >
            {data.label.text}
          </text>
        </g>
      </svg>
    </div>
  );
}
