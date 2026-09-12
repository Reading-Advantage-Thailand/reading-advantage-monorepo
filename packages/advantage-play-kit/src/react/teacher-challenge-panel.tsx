"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactElement } from "react";
import { challengeContentSchema, classChallengePublicSummarySchema, challengeReadingModalitySchema, type ClassChallengePublicSummary } from "@reading-advantage/game-contracts";
import { z } from "zod";

import { getRetroArcadeButtonStyle, RETRO_ARCADE_PANEL_STYLE, RETRO_ARCADE_UI_ASSETS } from "../presentation/retro-arcade-theme.js";

const classesResponseSchema = z.object({
  classes: z.array(z.object({ id: z.string().uuid(), name: z.string().trim().min(1) }).strict()).max(25),
  hasMore: z.boolean(),
}).strict();
const challengeListResponseSchema = z.object({
  challenges: z.array(classChallengePublicSummarySchema).max(25),
}).strict();

/** Installed game details available for teacher challenges. */
export interface TeacherChallengeGame {
  /** Human title shown in the form. */
  readonly title: string;
  /** Declared gameplay revision sent to the server. */
  readonly version: string;
}

/** Props for the shared teacher challenge form. */
export interface TeacherChallengePanelProps {
  /** Stable authenticated teacher scope. */
  readonly ownerKey?: string;
  /** Installed reading vocabulary games keyed by identifier. */
  readonly games: Readonly<Record<string, TeacherChallengeGame>>;
  /** Owned class list endpoint. */
  readonly classesEndpoint?: string;
  /** Challenge creation endpoint. */
  readonly endpoint?: string;
  /** Host path prefix used for arcade images. */
  readonly basePath?: string;
}

type Row = { term: string; translation: string };

/** Joins a host prefix and an absolute asset path. */
function withBasePath(basePath: string, path: string): string {
  if (!basePath || basePath === "/") return path;
  return `${basePath.replace(/\/$/u, "")}${path}`;
}

/** Creates a retro button style with a host-prefixed image. */
function buttonStyle(emphasis: "primary" | "secondary", basePath: string): CSSProperties {
  const asset = emphasis === "primary" ? RETRO_ARCADE_UI_ASSETS.primaryButton : RETRO_ARCADE_UI_ASSETS.secondaryButton;
  return { ...getRetroArcadeButtonStyle(emphasis), borderImageSource: `url("${withBasePath(basePath, asset)}")` };
}

/** Generates one stable safe seed for the current form. */
function generateSeed(): number {
  const values = new Uint32Array(2);
  globalThis.crypto.getRandomValues(values);
  return values[0]! * 0x100000 + (values[1]! & 0xfffff);
}

/** Converts a local date input into an ISO timestamp. */
function toIso(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

/**
 * Creates fixed Thai-to-English reading challenges for an owned class.
 * @param props Owner scope, installed games, routes, and asset path prefix.
 * @returns The teacher form or no content without an owner.
 */
export function TeacherChallengePanel({
  ownerKey,
  games,
  classesEndpoint = "/api/v1/apk/challenges/teacher-classes",
  endpoint = "/api/v1/apk/challenges",
  basePath = "",
}: TeacherChallengePanelProps): ReactElement | null {
  const gamesKey = JSON.stringify(Object.entries(games).sort(([left], [right]) => left.localeCompare(right)));
  const gameEntries = Object.entries(games);
  const scope = JSON.stringify([ownerKey, classesEndpoint, endpoint, gamesKey]);
  const seedRef = useRef<number | undefined>(undefined);
  const submissionRef = useRef<{ scope: string; normalizedBody: string; creationKey: string } | null>(null);
  if (seedRef.current === undefined) seedRef.current = generateSeed();
  const generationRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const classControllerRef = useRef<AbortController | null>(null);
  const [formScope, setFormScope] = useState<string>();
  const [classes, setClasses] = useState<readonly { id: string; name: string }[]>([]);
  const [classesHasMore, setClassesHasMore] = useState(false);
  const [classId, setClassId] = useState("");
  const [title, setTitle] = useState("");
  const [gameId, setGameId] = useState(gameEntries[0]?.[0] ?? "");
  const [rows, setRows] = useState<readonly Row[]>([{ term: "", translation: "" }]);
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [target, setTarget] = useState("1");
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [saved, setSaved] = useState<ClassChallengePublicSummary | null>(null);
  const [reviewScope, setReviewScope] = useState<string>();
  const [reviewChallenges, setReviewChallenges] = useState<readonly ClassChallengePublicSummary[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewFailure, setReviewFailure] = useState<string | null>(null);

  const loadExistingChallenges = useCallback(async (capturedClassId: string, generation = generationRef.current) => {
    const capturedScope = `${scope}\u0000${capturedClassId}`;
    setReviewScope(capturedScope); setReviewLoading(true); setReviewFailure(null);
    try {
      const query = `?classId=${encodeURIComponent(capturedClassId)}&limit=25&offset=0`;
      const response = await fetch(`${endpoint}${query}`, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error("Existing challenges could not be loaded.");
      const page = challengeListResponseSchema.parse(await response.json());
      if (page.challenges.some((challenge) => challenge.classId !== capturedClassId)) throw new Error("Class mismatch");
      if (generation !== generationRef.current) return;
      setReviewChallenges(page.challenges); setReviewLoading(false);
    } catch {
      if (generation !== generationRef.current) return;
      setReviewChallenges([]); setReviewFailure("Existing challenges could not be loaded."); setReviewLoading(false);
    }
  }, [endpoint, scope]);

  const loadClasses = useCallback(async (offset: number, generation = generationRef.current) => {
    if (!ownerKey) return;
    classControllerRef.current?.abort();
    const controller = new AbortController(); classControllerRef.current = controller;
    setLoadingClasses(true); setFailure(null);
    try {
      const response = await fetch(`${classesEndpoint}?limit=25&offset=${offset}`, { credentials: "same-origin", cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Classes could not be loaded.");
      const page = classesResponseSchema.parse(await response.json());
      if (generation !== generationRef.current || controller.signal.aborted) return;
      setClasses((current) => offset === 0 ? page.classes : [...current, ...page.classes]);
      setClassesHasMore(page.hasMore && page.classes.length > 0);
      if (offset === 0) setClassId(page.classes[0]?.id ?? "");
      setLoadingClasses(false);
    } catch {
      if (generation !== generationRef.current || controller.signal.aborted) return;
      setFailure("Classes could not be loaded."); setLoadingClasses(false);
    }
  }, [classesEndpoint, ownerKey]);

  useEffect(() => {
    generationRef.current += 1;
    const generation = generationRef.current;
    controllerRef.current?.abort();
    classControllerRef.current?.abort();
    setFormScope(scope);
    setClasses([]); setClassId(""); setTitle(""); setRows([{ term: "", translation: "" }]);
    setClassesHasMore(false);
    setStartsAt(""); setExpiresAt(""); setTarget("1"); setFailure(null); setSaved(null); setPending(false);
    setReviewScope(undefined); setReviewChallenges([]); setReviewLoading(false); setReviewFailure(null);
    submissionRef.current = null;
    setGameId(gameEntries[0]?.[0] ?? "");
    if (!ownerKey) { setLoadingClasses(false); return; }
    void loadClasses(0, generation);
    return () => { generationRef.current += 1; classControllerRef.current?.abort(); controllerRef.current?.abort(); };
  }, [loadClasses, ownerKey, scope]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending || saved || !ownerKey) return;
    const game = games[gameId];
    const start = toIso(startsAt);
    const expiry = toIso(expiresAt);
    const content = challengeContentSchema.safeParse({ mode: "vocabulary", items: rows });
    const targetValue = Number(target);
    if (!classes.some((item) => item.id === classId) || !title.trim() || !game || !start || !expiry || Date.parse(start) >= Date.parse(expiry) || !content.success || !Number.isSafeInteger(targetValue) || targetValue < 1 || targetValue > 1_000_000) {
      setFailure("Check the class, words, dates, and target."); return;
    }
    const normalizedBody = {
      classId, title, gameId, gameVersion: game.version, contentLocale: "th" as const,
      content: content.data, seed: seedRef.current!, difficulty: "medium" as const,
      modality: challengeReadingModalitySchema.parse({ modality: "reading", promptLocale: "th-TH", answerLocale: "en-US", promptField: "translation", answerField: "term", scored: true }),
      startsAt: start, expiresAt: expiry, target: targetValue, teacherParticipationEnabled: false,
    };
    const serializedBody = JSON.stringify(normalizedBody);
    const priorSubmission = submissionRef.current;
    const creationKey = priorSubmission?.scope === scope && priorSubmission.normalizedBody === serializedBody
      ? priorSubmission.creationKey
      : globalThis.crypto.randomUUID();
    submissionRef.current = { scope, normalizedBody: serializedBody, creationKey };
    const body = { ...normalizedBody, creationKey };
    const generation = generationRef.current;
    const controller = new AbortController(); controllerRef.current = controller;
    setPending(true); setFailure(null); setSaved(null);
    let responseReceived = false;
    try {
      const response = await fetch(endpoint, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
      responseReceived = true;
      if (generation !== generationRef.current || controller.signal.aborted) return;
      if (response.status === 409) { setFailure("This creation request conflicts with an existing request."); return; }
      if (!response.ok) { setFailure("Challenge could not be saved."); return; }
      const receipt = classChallengePublicSummarySchema.parse(await response.json());
      if (generation !== generationRef.current || controller.signal.aborted) return;
      if (receipt.classId !== normalizedBody.classId || receipt.gameId !== normalizedBody.gameId || receipt.gameVersion !== normalizedBody.gameVersion) {
        setFailure("The saved challenge receipt did not match the form."); return;
      }
      setSaved(receipt);
    } catch {
      if (generation !== generationRef.current || controller.signal.aborted) return;
      setFailure(responseReceived
        ? "The challenge response was invalid."
        : "Creation could not be confirmed. Review this class before creating another challenge.");
      if (!responseReceived) await loadExistingChallenges(normalizedBody.classId, generation);
    } finally {
      if (generation === generationRef.current && !controller.signal.aborted) setPending(false);
    }
  };

  if (!ownerKey) return null;
  if (formScope !== scope) return <section aria-label="Create class challenge" role="status">Loading classes…</section>;
  const formLocked = pending || saved !== null;
  const fieldStyle: CSSProperties = { display: "block", minHeight: 44, maxWidth: "100%", width: "100%", boxSizing: "border-box" };
  return <section aria-label="Create class challenge" style={{ ...RETRO_ARCADE_PANEL_STYLE, borderImageSource: `url("${withBasePath(basePath, RETRO_ARCADE_UI_ASSETS.squarePanel)}")`, padding: 12, background: "#0f172a", color: "#f8fafc" }}>
    <h2>Create class challenge</h2>
    {loadingClasses ? <p role="status">Loading classes…</p> : null}
    {!loadingClasses && !failure && classes.length === 0 ? <p>No owned classes are available.</p> : null}
    {failure === "Classes could not be loaded." ? <button type="button" style={buttonStyle("secondary", basePath)} onClick={() => void loadClasses(0)}>Try again</button> : null}
    <form style={{ display: "grid", gap: 8 }} onSubmit={(event) => void submit(event)}>
      <label>Class<select aria-label="Class" disabled={formLocked} required value={classId} onChange={(event) => setClassId(event.target.value)} style={fieldStyle}>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Challenge title<input disabled={formLocked} required maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} style={fieldStyle} /></label>
      <label>Game<select aria-label="Game" disabled={formLocked} required value={gameId} onChange={(event) => setGameId(event.target.value)} style={fieldStyle}>{gameEntries.map(([id, game]) => <option key={id} value={id}>{game.title}</option>)}</select></label>
      {rows.map((row, index) => <fieldset disabled={formLocked} key={index}><legend>Word {index + 1}</legend><label>English answer<input required value={row.term} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, term: event.target.value } : item))} style={fieldStyle} /></label><label>Thai prompt<input required value={row.translation} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, translation: event.target.value } : item))} style={fieldStyle} /></label>{rows.length > 1 ? <button type="button" style={buttonStyle("secondary", basePath)} onClick={() => setRows((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove word</button> : null}</fieldset>)}
      {rows.length < 50 ? <button disabled={formLocked} type="button" style={buttonStyle("secondary", basePath)} onClick={() => setRows((current) => [...current, { term: "", translation: "" }])}>Add word</button> : null}
      <label>Starts<input aria-label="Starts" disabled={formLocked} required type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} style={fieldStyle} /></label>
      <label>Ends<input aria-label="Ends" disabled={formLocked} required type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} style={fieldStyle} /></label>
      <label>Target players<input aria-label="Target players" disabled={formLocked} required type="number" min={1} max={1_000_000} value={target} onChange={(event) => setTarget(event.target.value)} style={fieldStyle} /></label>
      <button disabled={formLocked || loadingClasses || !classId || !gameId} type="submit" style={buttonStyle("primary", basePath)}>{pending ? "Saving…" : "Create challenge"}</button>
    </form>
    {classesHasMore ? <button disabled={loadingClasses || pending} type="button" style={buttonStyle("secondary", basePath)} onClick={() => void loadClasses(classes.length)}>More classes</button> : null}
    {failure ? <p role="alert">{failure}</p> : null}
    {saved ? <div><p role="status">Challenge saved: {saved.title}</p><button type="button" style={buttonStyle("secondary", basePath)} onClick={() => { seedRef.current = generateSeed(); submissionRef.current = null; setSaved(null); setTitle(""); }}>Create another challenge</button></div> : null}
    {reviewScope === `${scope}\u0000${classId}` ? <section aria-label="Existing class challenges">
      <h3>Existing challenges</h3>
      {reviewLoading ? <p role="status">Loading existing challenges…</p> : null}
      {reviewFailure ? <p role="alert">{reviewFailure}</p> : null}
      {!reviewLoading && !reviewFailure && reviewChallenges.length === 0 ? <p>No existing challenges were found.</p> : null}
      <ul>{reviewChallenges.map((challenge) => <li key={challenge.id}><strong>{challenge.title}</strong> <time dateTime={challenge.startsAt}>{new Date(challenge.startsAt).toLocaleDateString()}</time> – <time dateTime={challenge.expiresAt}>{new Date(challenge.expiresAt).toLocaleDateString()}</time></li>)}</ul>
      <button disabled={reviewLoading} type="button" style={buttonStyle("secondary", basePath)} onClick={() => void loadExistingChallenges(classId)}>Refresh existing challenges</button>
    </section> : null}
  </section>;
}
