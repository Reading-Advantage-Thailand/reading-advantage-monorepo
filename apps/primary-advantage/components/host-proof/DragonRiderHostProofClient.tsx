"use client";

import Link from "next/link";
import { useState } from "react";

interface Attempt { attemptId: string; credential: string; input: readonly { term: string; translation: string }[]; }

/** Runs Primary Advantage's isolated Dragon Rider receipt protocol without client result claims. */
export function DragonRiderHostProofClient() {
  const [attempt, setAttempt] = useState<Attempt>(); const [checkpoint, setCheckpoint] = useState<string>(); const [sequence, setSequence] = useState(1); const [message, setMessage] = useState("Issue an attempt to begin.");
  async function post(path: string, body: object) { const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); if (!response.ok) throw new Error("rejected"); return response.json(); }
  async function issue() { try { setAttempt(await post("/api/host-proof/dragon-rider/attempts", { gameType: "dragon-rider", difficulty: "easy" })); setCheckpoint(undefined); setSequence(1); setMessage("Choose each gate, then wait for the timed boss transition."); } catch { setMessage("Attempt issuance was rejected."); } }
  async function action(gate: "left" | "right") { if (!attempt) return; try { const action = { sequence, kind: "choose-gate" as const, round: sequence, gate }; const receipt = await post("/api/host-proof/dragon-rider/attempts/actions", { attemptId: attempt.attemptId, credential: attempt.credential, action, ...(checkpoint ? { previousCheckpoint: checkpoint } : {}) }); setCheckpoint(receipt.checkpoint); setSequence((value) => value + 1); setMessage("Server receipt recorded."); } catch { setMessage("That gate action is not valid yet."); } }
  async function complete() { if (!attempt) return; try { const result = await post("/api/host-proof/dragon-rider/completions", { attemptId: attempt.attemptId, credential: attempt.credential }); setMessage(`Canonical result: ${result.score} score, ${result.xpEarned} XP${result.duplicate ? " (retry)" : ""}.`); } catch { setMessage("The stored transcript is not yet a victory."); } }
  return <main><h1>Dragon Rider host proof</h1><p>{message}</p>{!attempt ? <button onClick={issue}>Issue attempt</button> : <><p>{attempt.input[Math.min(sequence - 1, attempt.input.length - 1)]?.term}</p><button onClick={() => action("left")}>Left gate</button><button onClick={() => action("right")}>Right gate</button><button onClick={complete}>Complete stored attempt</button></>}<p><Link href="/">Return home</Link></p></main>;
}
