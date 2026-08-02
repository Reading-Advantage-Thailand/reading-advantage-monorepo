"use client";

import Link from "next/link";
import { useState } from "react";

interface Attempt { attemptId: string; credential: string; input: readonly { term: string; translation: string }[]; seed: string; }
/** Runs the isolated Dragon Rider receipt protocol without submitting client-derived results. */
export function DragonRiderHostProofClient() {
  const [attempt, setAttempt] = useState<Attempt>(); const [checkpoint, setCheckpoint] = useState<string>(); const [sequence, setSequence] = useState(1); const [message, setMessage] = useState("Issue a server-owned attempt to begin.");
  async function issue() { const response = await fetch("/api/host-proof/dragon-rider/attempts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ gameType: "dragon-rider", difficulty: "easy" }) }); if (!response.ok) return setMessage("Attempt issuance was rejected."); setAttempt(await response.json()); setSequence(1); setCheckpoint(undefined); setMessage("Choose a gate for each frozen vocabulary round."); }
  async function action(gate: "left" | "right") { if (!attempt) return; const action = { sequence, kind: "choose-gate" as const, round: sequence, gate }; const response = await fetch("/api/host-proof/dragon-rider/attempts/actions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ attemptId: attempt.attemptId, credential: attempt.credential, action, ...(checkpoint ? { previousCheckpoint: checkpoint } : {}) }) }); if (!response.ok) return setMessage("That gate action is not yet valid; retain the issued attempt and try the next valid step."); const receipt = await response.json(); setCheckpoint(receipt.checkpoint); setSequence((value) => value + 1); setMessage("Server receipt recorded."); }
  async function complete() { if (!attempt) return; const response = await fetch("/api/host-proof/dragon-rider/completions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ attemptId: attempt.attemptId, credential: attempt.credential }) }); const data = await response.json(); setMessage(response.ok ? `Canonical result: ${data.score} score, ${data.xpEarned} XP${data.duplicate ? " (retry)" : ""}.` : "The stored server transcript is not yet a victory."); }
  const prompt = attempt?.input[Math.min(sequence - 1, (attempt?.input.length ?? 1) - 1)];
  return <main><h1>Dragon Rider host proof</h1><p>{message}</p>{!attempt ? <button onClick={issue}>Issue attempt</button> : <><p>{prompt ? `${prompt.term} → ${prompt.translation}` : "Server terminal pending"}</p><button onClick={() => action("left")}>Left gate</button><button onClick={() => action("right")}>Right gate</button><button onClick={complete}>Complete stored attempt</button></>}<p><Link href="/">Return home</Link></p></main>;
}
