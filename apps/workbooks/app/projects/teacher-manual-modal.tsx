"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { compileTeacherManualAction, type TeacherManualLang } from "../teacher-manual-actions";

/** Language codes the teacher manual language toggle offers. */
const LANGUAGES: readonly { value: TeacherManualLang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "th", label: "Thai" },
];

/** Live compile state of the teacher manual modal. */
type TeacherManualCompileState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; html: string; lessonCount: number; lang: TeacherManualLang };

/** Props controlling the teacher manual preview modal. */
export interface TeacherManualModalProps {
  /** Drafts selected for the manual, in selection order. */
  draftIds: readonly string[];
  /** Called when the user dismisses the modal. */
  onClose: () => void;
}

/**
 * Modal that compiles the selected drafts into a teacher's manual and shows
 * the result inside a sandboxed iframe.
 *
 * The manual compiles on open and recompiles whenever the language toggle
 * changes. The iframe receives the compiled html through srcDoc and is
 * sandboxed WITHOUT allow-same-origin (scripts and modals are allowed so the
 * Paged.js pagination and the Print button work), matching the review
 * finding for lesson previews.
 * @param props Selected draft ids and a close callback; see TeacherManualModalProps.
 * @returns The teacher manual modal overlay.
 */
export function TeacherManualModal({
  draftIds,
  onClose,
}: TeacherManualModalProps) {
  const [lang, setLang] = useState<TeacherManualLang>("en");
  const [state, setState] = useState<TeacherManualCompileState>({
    status: "loading",
  });
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const compile = useCallback(
    async (targetLang: TeacherManualLang) => {
      setState({ status: "loading" });
      try {
        const result = await compileTeacherManualAction(
          [...draftIds],
          targetLang,
        );
        if (result.ok) {
          setState({
            status: "success",
            html: result.html,
            lessonCount: result.lessonCount,
            lang: result.lang,
          });
        } else {
          setState({ status: "error", message: result.message });
        }
      } catch {
        setState({
          status: "error",
          message: "An error occurred while compiling the teacher manual.",
        });
      }
    },
    [draftIds],
  );

  useEffect(() => {
    void compile(lang);
  }, [compile, lang]);

  const handleLangChange = (nextLang: TeacherManualLang) => {
    if (nextLang !== lang) {
      setLang(nextLang);
    }
  };

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Teacher Manual"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        padding: "1rem",
        background: "rgba(0, 0, 0, 0.5)",
      }}
    >
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          borderRadius: "0.5rem",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 1rem",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <h2>Teacher Manual</h2>
          <button type="button" aria-label="Close teacher manual" onClick={onClose}>
            ×
          </button>
        </header>
        <div
          role="group"
          aria-label="Language"
          style={{ display: "flex", gap: "0.5rem", padding: "0.5rem 1rem" }}
        >
          {LANGUAGES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={lang === option.value}
              disabled={state.status === "loading"}
              onClick={() => handleLangChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "0 1rem" }}>
          {state.status === "loading" && <p>Compiling teacher manual…</p>}
          {state.status === "error" && (
            <div>
              <p role="alert">{state.message}</p>
              <button type="button" onClick={() => void compile(lang)}>
                Retry
              </button>
            </div>
          )}
          {state.status === "success" && (
            <div>
              <p>
                {state.lessonCount} lesson{state.lessonCount === 1 ? "" : "s"}
              </p>
              <div style={{ height: "55vh" }}>
                <iframe
                  ref={iframeRef}
                  title="Teacher Manual"
                  srcDoc={state.html}
                  style={{ width: "100%", height: "100%", border: "1px solid #e5e7eb" }}
                  sandbox="allow-scripts allow-modals"
                />
              </div>
              <p role="note">
                To save as a PDF, enable Background graphics in the print dialog
                and set margins to Default or None — the manual&apos;s colors
                and layout depend on them.
              </p>
            </div>
          )}
        </div>
        {state.status === "success" && (
          <footer
            style={{
              display: "flex",
              justifyContent: "flex-end",
              padding: "0.75rem 1rem",
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <button type="button" onClick={handlePrint}>
              Print
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
