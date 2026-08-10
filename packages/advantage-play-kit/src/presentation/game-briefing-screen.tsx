"use client";

import {
  useId,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { VocabularyItem } from "@reading-advantage/game-contracts";

import type { LayoutProfile, ResponsiveInputMode } from "../responsive/responsive-composition.js";
import type { GameBriefing } from "./game-briefing-contract.js";

/** Props for the host-neutral, pre-game briefing presentation. */
export type GameBriefingScreenProps = Omit<
  ComponentProps<"section">,
  "children" | "role" | "aria-label" | "aria-labelledby" | "aria-describedby"
  | "aria-modal" | "inputMode"
> & {
  /** Validated title, objective, instructions, learning-preview metadata, and controls. */
  readonly briefing: GameBriefing;
  /** Complete canonical vocabulary or sentence content shown before play. */
  readonly learningItems: readonly VocabularyItem[];
  /** Requests one transition from briefing into the host-selected next phase. */
  readonly onStart: () => void;
  /** Spatial profile selected by the APK composition resolver. */
  readonly layoutProfile?: LayoutProfile;
  /** Input capabilities currently applicable to this briefing. */
  readonly inputMode?: ResponsiveInputMode;
  /** Disables the transition while the host is starting the next phase. */
  readonly startPending?: boolean;
  /** One bounded host-owned extension rendered in the briefing footer. */
  readonly extension?: ReactNode;
};

const sectionStyle: CSSProperties = {
  border: "1px solid var(--apk-briefing-border, #335c4b)",
  borderRadius: "var(--apk-briefing-radius, 10px)",
  background: "var(--apk-briefing-surface, #0c1b16)",
  padding: "var(--apk-briefing-card-padding, clamp(1rem, 3vw, 1.5rem))",
};

const headingStyle: CSSProperties = {
  margin: 0,
  color: "var(--apk-briefing-text, #f4f0dc)",
  fontFamily: "var(--apk-briefing-display-font, ui-serif, Georgia, serif)",
  fontSize: "clamp(1.1rem, 2vw, 1.45rem)",
  lineHeight: 1.2,
};

const mutedTextStyle: CSSProperties = {
  color: "var(--apk-briefing-muted, #b9c9bf)",
  lineHeight: 1.6,
  overflowWrap: "anywhere",
};

function isControlApplicable(
  mode: "keyboard" | "pointer" | "touch",
  inputMode: ResponsiveInputMode | undefined,
): boolean {
  if (!inputMode) return true;
  if (inputMode === "touch") return mode === "touch";
  if (inputMode === "pointer-keyboard") return mode === "keyboard" || mode === "pointer";
  return true;
}

/**
 * Renders the complete accessible mission briefing shown before a cartridge accepts normal play input.
 * @param props Validated briefing content, learning items, host transition, and presentation options.
 * @returns A named briefing dialog with mission details, learning content, controls, and one Start action.
 */
export function GameBriefingScreen({
  briefing,
  learningItems,
  onStart,
  layoutProfile = "compact",
  inputMode,
  startPending = false,
  extension,
  style,
  ...sectionProps
}: GameBriefingScreenProps) {
  const titleId = useId();
  const objectiveId = useId();
  const objectiveHeadingId = useId();
  const instructionsHeadingId = useId();
  const learningHeadingId = useId();
  const controlsHeadingId = useId();
  const startActivatedRef = useRef(false);
  const [startActivated, setStartActivated] = useState(false);
  const labels = briefing.labels;
  const controls = briefing.controls.filter((control) => isControlApplicable(control.mode, inputMode));
  const startLabel = labels?.startAction ?? "Start game";
  const learningHeading = labels?.learningPreviewHeading ?? briefing.learningPreview.heading;

  const handleStart = () => {
    if (startPending || startActivatedRef.current) return;
    startActivatedRef.current = true;
    setStartActivated(true);
    onStart();
  };

  return (
    <section
      {...sectionProps}
      aria-labelledby={titleId}
      aria-describedby={objectiveId}
      data-apk-briefing="true"
      data-apk-presentation="briefing"
      data-apk-region="modal"
      data-apk-layout-profile={layoutProfile}
      {...(inputMode ? { "data-apk-input-mode": inputMode } : {})}
      role="dialog"
      style={{
        display: "flex",
        flexDirection: "column",
        minBlockSize: "100%",
        maxBlockSize: "100%",
        overflow: "hidden",
        background: "var(--apk-briefing-background, #07110e)",
        color: "var(--apk-briefing-text, #f4f0dc)",
        fontFamily: "var(--apk-briefing-body-font, ui-sans-serif, system-ui, sans-serif)",
        ...style,
      }}
    >
      <header
        data-apk-briefing-region="header"
        style={{
          borderBlockEnd: "1px solid var(--apk-briefing-border, #335c4b)",
          padding: "clamp(1.25rem, 4vw, 2.25rem) clamp(1rem, 4vw, 2.5rem) 1.25rem",
        }}
      >
        <p
          style={{
            margin: "0 0 0.65rem",
            color: "var(--apk-briefing-accent, #8ce0b8)",
            fontFamily: "var(--apk-briefing-mono-font, ui-monospace, SFMono-Regular, monospace)",
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          {labels?.eyebrow ?? "Mission brief / ready"}
        </p>
        <h1
          id={titleId}
          style={{
            margin: 0,
            color: "var(--apk-briefing-text, #f4f0dc)",
            fontFamily: "var(--apk-briefing-display-font, ui-serif, Georgia, serif)",
            fontSize: "clamp(2rem, 6vw, 3.8rem)",
            fontWeight: 800,
            letterSpacing: "-0.035em",
            lineHeight: 1,
            overflowWrap: "anywhere",
          }}
        >
          {briefing.title}
        </h1>
        {briefing.subtitle ? (
          <p style={{ ...mutedTextStyle, margin: "0.8rem 0 0", maxInlineSize: "56rem" }}>
            {briefing.subtitle}
          </p>
        ) : null}
      </header>

      <div
        data-apk-briefing-region="body"
        style={{
          display: "grid",
          flex: "1 1 auto",
          gridTemplateColumns: layoutProfile === "wide" ? "minmax(0, 1fr) minmax(18rem, 0.8fr)" : "minmax(0, 1fr)",
          gap: "clamp(0.75rem, 2vw, 1.25rem)",
          overflowY: "auto",
          padding: "clamp(1rem, 3vw, 1.75rem) clamp(1rem, 4vw, 2.5rem)",
          overscrollBehavior: "contain",
        }}
      >
        <div data-apk-briefing-region="mission" style={{ display: "grid", alignContent: "start", gap: "1rem" }}>
          <section aria-labelledby={objectiveHeadingId} style={sectionStyle} data-apk-briefing-region="objective">
            <h2 id={objectiveHeadingId} style={headingStyle}>{labels?.objectiveHeading ?? "Mission objective"}</h2>
            <p id={objectiveId} style={{ ...mutedTextStyle, margin: "0.75rem 0 0" }}>{briefing.objective}</p>
          </section>

          <section aria-labelledby={instructionsHeadingId} style={sectionStyle} data-apk-briefing-region="instructions">
            <h2 id={instructionsHeadingId} style={headingStyle}>{labels?.instructionsHeading ?? "How to play"}</h2>
            <ol
              style={{
                display: "grid",
                gap: "0.85rem",
                margin: "1rem 0 0",
                paddingInlineStart: "1.5rem",
                ...mutedTextStyle,
              }}
            >
              {briefing.instructions.map((instruction, index) => (
                <li key={`${instruction.title}-${index}`} style={{ paddingInlineStart: "0.35rem" }}>
                  <strong style={{ color: "var(--apk-briefing-text, #f4f0dc)" }}>{instruction.title}</strong>
                  <span style={{ display: "block", marginBlockStart: "0.15rem" }}>{instruction.description}</span>
                </li>
              ))}
            </ol>
          </section>

          {briefing.tip ? (
            <aside style={{ ...sectionStyle, borderInlineStart: "3px solid var(--apk-briefing-accent-warm, #f3c969)" }} data-apk-briefing-region="tip">
              <p style={{ ...mutedTextStyle, margin: 0 }}>
                <strong style={{ color: "var(--apk-briefing-accent-warm, #f3c969)" }}>{labels?.tipHeading ?? "Field note"}: </strong>
                {briefing.tip}
              </p>
            </aside>
          ) : null}
        </div>

        <div data-apk-briefing-region="learning-and-controls" style={{ display: "grid", alignContent: "start", gap: "1rem" }}>
          <section aria-labelledby={learningHeadingId} style={sectionStyle} data-apk-briefing-region="learning-preview">
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: "0.75rem" }}>
              <h2 id={learningHeadingId} style={headingStyle}>{learningHeading}</h2>
              <span style={{ ...mutedTextStyle, fontSize: "0.78rem", fontFamily: "var(--apk-briefing-mono-font, ui-monospace, monospace)" }}>
                {learningItems.length} {labels?.itemCountLabel ?? "items"}
              </span>
            </div>
            <ul
              aria-label={learningHeading}
              style={{
                display: "grid",
                gap: 0,
                listStyle: "none",
                margin: "1rem 0 0",
                maxBlockSize: "min(32rem, 52vh)",
                overflowY: "auto",
                padding: 0,
                borderBlockStart: "1px solid var(--apk-briefing-border-soft, #29483c)",
              }}
            >
              {learningItems.map((item, index) => (
                <li
                  key={`${item.term}-${index}`}
                  style={{
                    display: "grid",
                    gap: "0.25rem",
                    padding: "0.8rem 0.1rem",
                    borderBlockEnd: "1px solid var(--apk-briefing-border-soft, #29483c)",
                    overflowWrap: "anywhere",
                  }}
                >
                  <span style={{ color: "var(--apk-briefing-text, #f4f0dc)", fontWeight: 700 }}>{item.term}</span>
                  <span style={mutedTextStyle}>{item.translation}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby={controlsHeadingId} style={sectionStyle} data-apk-briefing-region="controls">
            <h2 id={controlsHeadingId} style={headingStyle}>{labels?.controlsHeading ?? "Controls"}</h2>
            <ul
              style={{
                display: "grid",
                gap: "0.7rem",
                listStyle: "none",
                margin: "1rem 0 0",
                padding: 0,
              }}
            >
              {controls.map((control, index) => (
                <li
                  key={`${control.mode}-${control.label}-${index}`}
                  data-apk-control-mode={control.mode}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "0.5rem",
                    minBlockSize: "var(--apk-briefing-control-row, 2.75rem)",
                    color: "var(--apk-briefing-muted, #b9c9bf)",
                    overflowWrap: "anywhere",
                  }}
                >
                  <span style={{ color: "var(--apk-briefing-text, #f4f0dc)", fontWeight: 700 }}>{control.label}</span>
                  {control.keys?.map((key) => (
                    <kbd
                      key={key}
                      style={{
                        border: "1px solid var(--apk-briefing-border, #335c4b)",
                        borderRadius: "var(--apk-briefing-key-radius, 4px)",
                        background: "var(--apk-briefing-key-background, #102820)",
                        color: "var(--apk-briefing-accent, #8ce0b8)",
                        fontFamily: "var(--apk-briefing-mono-font, ui-monospace, monospace)",
                        fontSize: "0.78rem",
                        padding: "0.18rem 0.4rem",
                      }}
                    >
                      {key}
                    </kbd>
                  ))}
                  <span style={{ flex: "1 1 12rem" }}>{control.action}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <footer
        data-apk-briefing-region="footer"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          borderBlockStart: "1px solid var(--apk-briefing-border, #335c4b)",
          background: "var(--apk-briefing-footer-background, #0c1b16)",
          padding: "1rem clamp(1rem, 4vw, 2.5rem) calc(1rem + env(safe-area-inset-bottom))",
        }}
      >
        {extension ? <div data-apk-briefing-region="extension" style={{ flex: "1 1 12rem", minInlineSize: 0 }}>{extension}</div> : null}
        <button
          type="button"
          aria-busy={startPending || startActivated || undefined}
          autoFocus
          data-apk-briefing-start="true"
          disabled={startPending || startActivated}
          onClick={handleStart}
          style={{
            minBlockSize: "48px",
            minInlineSize: "min(100%, 12rem)",
            border: "1px solid var(--apk-briefing-action-border, #f3c969)",
            borderRadius: "var(--apk-briefing-action-radius, 6px)",
            background: "var(--apk-briefing-action-background, #f3c969)",
            color: "var(--apk-briefing-action-text, #07110e)",
            cursor: startPending || startActivated ? "wait" : "pointer",
            font: "inherit",
            fontWeight: 800,
            padding: "0.75rem 1.25rem",
          }}
        >
          {startLabel}
        </button>
      </footer>
    </section>
  );
}
