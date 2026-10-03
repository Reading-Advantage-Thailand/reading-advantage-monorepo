import { SiteImageView } from "@/components/marketing/site-image";
import { siteImages } from "@/lib/site-assets";
import type { ReactNode } from "react";

/** Mandatory knowledge-graph state colors from the visual identity guide. */
export const MASTERY_COLORS = {
  mastered: "#22c55e",
  here: "#ffffff",
  ready: "#fbbf24",
  locked: "#0c1437",
} as const;

type StateKey = keyof typeof MASTERY_COLORS;

export type MasteryStateLabels = Record<StateKey, string>;

type PanelShellProps = {
  texture: keyof typeof siteImages;
  label: string;
  caption: string;
  children: ReactNode;
};

/** Static class names so Tailwind can see each state color. */
const STATE_BG: Record<StateKey, string> = {
  mastered: "bg-mastery-mastered",
  here: "bg-mastery-here",
  ready: "bg-mastery-ready",
  locked: "bg-mastery-locked",
};

function Swatch({ state }: { state: StateKey }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-3 w-3 rounded-full ${STATE_BG[state]} ${state === "locked" ? "shadow-locked-ring" : ""}`}
    />
  );
}

function Legend({ labels, states }: { labels: MasteryStateLabels; states: StateKey[] }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-mastery-label">
      {states.map((state) => (
        <li key={state} className="inline-flex items-center gap-2">
          <Swatch state={state} />
          {labels[state]}
        </li>
      ))}
    </ul>
  );
}

function PanelShell({ texture, label, caption, children }: PanelShellProps) {
  return (
    <figure className="relative isolate overflow-hidden rounded-3xl border border-slate-700 bg-site-navy text-white shadow-panel-deep m-0">
      <SiteImageView
        image={siteImages[texture]}
        alt=""
        sizes="(min-width: 1024px) 560px, 100vw"
        className="absolute inset-0 -z-10 h-full w-full object-cover opacity-30"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-site-navy/40 via-site-navy/70 to-site-navy/95" />
      <div className="p-5 sm:p-7">
        <p className="mb-4 text-xs font-semibold uppercase tracking-eyebrow text-mastery-ready">{label}</p>
        {children}
      </div>
      <figcaption className="border-t border-white/10 bg-site-navy/80 px-5 py-4 text-sm leading-relaxed text-mastery-label sm:px-7">
        {caption}
      </figcaption>
    </figure>
  );
}

const NODES: { id: string; x: number; y: number; state: StateKey }[] = [
  { id: "a1", x: 50, y: 60, state: "mastered" },
  { id: "a2", x: 50, y: 150, state: "mastered" },
  { id: "a3", x: 50, y: 240, state: "mastered" },
  { id: "b1", x: 170, y: 105, state: "mastered" },
  { id: "b2", x: 170, y: 205, state: "mastered" },
  { id: "c1", x: 290, y: 65, state: "ready" },
  { id: "c2", x: 290, y: 150, state: "here" },
  { id: "c3", x: 290, y: 235, state: "ready" },
  { id: "d1", x: 410, y: 105, state: "locked" },
  { id: "d2", x: 410, y: 200, state: "locked" },
];

const EDGES: [string, string][] = [
  ["a1", "b1"], ["a2", "b1"], ["a2", "b2"], ["a3", "b2"],
  ["b1", "c1"], ["b1", "c2"], ["b2", "c2"], ["b2", "c3"],
  ["c1", "d1"], ["c2", "d1"], ["c2", "d2"], ["c3", "d2"],
];

/**
 * Panel for "what's next": a small prerequisite graph that uses the four graph states.
 * @param props The localized labels.
 * @returns The designed panel.
 */
export function MasteryPathPanel({ label, caption, states }: { label: string; caption: string; states: MasteryStateLabels }) {
  const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));
  return (
    <PanelShell texture="masteryClusterHero" label={label} caption={caption}>
      <svg viewBox="0 0 460 290" className="mb-5 h-auto w-full" role="presentation" aria-hidden="true">
        {EDGES.map(([from, to]) => {
          const a = byId[from];
          const b = byId[to];
          const done = a.state === "mastered" && b.state !== "locked";
          return (
            <line
              key={`${from}-${to}`}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={done ? MASTERY_COLORS.mastered : "#6f7fc0"}
              strokeWidth={done ? 2.5 : 1.5}
              strokeDasharray={done ? undefined : "5 5"}
              opacity={done ? 0.9 : 0.8}
            />
          );
        })}
        {NODES.map((n) => (
          <g key={n.id}>
            {n.state === "here" ? (
              <>
                <circle cx={n.x} cy={n.y} r={26} fill="var(--color-white)" opacity={0.18} className="mastery-pulse-ring" />
                <circle cx={n.x} cy={n.y} r={19} fill="none" stroke="var(--color-white)" strokeWidth={1.5} opacity={0.7} />
              </>
            ) : null}
            <circle
              cx={n.x} cy={n.y} r={13}
              fill={MASTERY_COLORS[n.state]}
              stroke={n.state === "locked" ? "#8c9bd6" : "#0c1437"}
              strokeWidth={n.state === "locked" ? 2 : 3}
            />
          </g>
        ))}
      </svg>
      <Legend labels={states} states={["mastered", "here", "ready", "locked"]} />
    </PanelShell>
  );
}

/**
 * Panel for "review at the right time": memory fades, then each review lifts it again.
 * @param props The localized labels.
 * @returns The designed panel.
 */
export function MasteryReviewPanel({
  label, caption, states, axisMemory, axisTime, reviewDue,
}: {
  label: string; caption: string; states: MasteryStateLabels; axisMemory: string; axisTime: string; reviewDue: string;
}) {
  return (
    <PanelShell texture="masteryPulse" label={label} caption={caption}>
      <svg viewBox="0 0 460 250" className="mb-5 h-auto w-full" role="presentation" aria-hidden="true">
        <line x1="40" y1="20" x2="40" y2="205" stroke="var(--color-mastery-axis)" strokeWidth="1.5" />
        <line x1="40" y1="205" x2="445" y2="205" stroke="var(--color-mastery-axis)" strokeWidth="1.5" />
        <line x1="40" y1="150" x2="445" y2="150" stroke="var(--color-mastery-ready)" strokeWidth="1" strokeDasharray="4 5" opacity="0.7" />
        <path
          d="M40 40 Q 85 135 150 150 L150 40 Q 215 105 290 150 L290 40 Q 365 85 440 120"
          fill="none" stroke={MASTERY_COLORS.mastered} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"
        />
        {[150, 290].map((x) => (
          <g key={x}>
            <circle cx={x} cy={150} r={8} fill={MASTERY_COLORS.ready} stroke="var(--color-site-navy)" strokeWidth="3" />
            <circle cx={x} cy={40} r={6} fill={MASTERY_COLORS.mastered} stroke="var(--color-site-navy)" strokeWidth="3" />
          </g>
        ))}
        <circle cx={40} cy={40} r={6} fill={MASTERY_COLORS.mastered} stroke="var(--color-site-navy)" strokeWidth="3" />
        <text x="158" y="172" fill="var(--color-mastery-ready)" fontSize="12" fontWeight="600">{reviewDue}</text>
        <text x="46" y="16" fill="var(--color-mastery-label)" fontSize="12">{axisMemory}</text>
        <text x="445" y="226" fill="var(--color-mastery-label)" fontSize="12" textAnchor="end">{axisTime}</text>
      </svg>
      <Legend labels={states} states={["mastered", "ready"]} />
    </PanelShell>
  );
}

/**
 * Panel for "progress you can see": a skill list that shows each state.
 * @param props The localized labels and sample skill names.
 * @returns The designed panel.
 */
export function MasteryProgressPanel({
  label, caption, states, example, skills,
}: {
  label: string; caption: string; states: MasteryStateLabels; example: string; skills: [string, string, string, string];
}) {
  const rows: { name: string; state: StateKey; pct: number }[] = [
    { name: skills[0], state: "mastered", pct: 100 },
    { name: skills[1], state: "here", pct: 60 },
    { name: skills[2], state: "ready", pct: 15 },
    { name: skills[3], state: "locked", pct: 0 },
  ];
  return (
    <PanelShell texture="masteryGrid" label={label} caption={caption}>
      <ul className="m-0 mb-4 flex list-none flex-col gap-3 p-0">
        {rows.map((row) => (
          <li key={row.name} className="rounded-2xl border border-white/15 bg-site-navy/70 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="font-semibold text-white">{row.name}</span>
              <span className="inline-flex items-center gap-2 text-xs text-mastery-label">
                <Swatch state={row.state} />
                {states[row.state]}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full w-pct rounded-full ${STATE_BG[row.state]}`} style={{ "--pct": `${row.pct}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs italic text-mastery-label">{example}</p>
    </PanelShell>
  );
}
