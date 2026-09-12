"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from "react";
import { classChallengePublicSummarySchema, type ClassChallengePublicSummary } from "@reading-advantage/game-contracts";
import { z } from "zod";

import {
  getRetroArcadeButtonStyle,
  RETRO_ARCADE_PANEL_STYLE,
  RETRO_ARCADE_UI_ASSETS,
} from "../presentation/retro-arcade-theme.js";

const PAGE_SIZE = 25;
const classesResponseSchema = z.object({
  classes: z.array(z.object({ id: z.string().uuid(), name: z.string().trim().min(1) }).strict()).max(PAGE_SIZE),
  hasMore: z.boolean(),
}).strict();
const challengesResponseSchema = z.object({
  challenges: z.array(classChallengePublicSummarySchema).max(PAGE_SIZE),
}).strict();

/** Installed game details used to validate challenge links. */
export interface StudentChallengeCatalogGame {
  /** Human title shown in the catalog. */
  readonly title: string;
  /** Declared gameplay revision installed by the host. */
  readonly version: string;
}

/** Props for the shared student challenge catalog panel. */
export interface StudentChallengeCatalogPanelProps {
  /** Stable authenticated owner scope. */
  readonly ownerKey?: string;
  /** App locale used in challenge links. */
  readonly locale: string;
  /** Installed games keyed by catalog identifier. */
  readonly games: Readonly<Record<string, StudentChallengeCatalogGame>>;
  /** Authenticated class list endpoint. */
  readonly classesEndpoint?: string;
  /** Authenticated challenge list endpoint. */
  readonly challengesEndpoint?: string;
  /** Host path prefix used in game links. */
  readonly basePath?: string;
}

type LoadState = { readonly scope: string; readonly message: string | null; readonly loading: boolean };

/** Joins a host prefix and one absolute application path. */
function withBasePath(basePath: string, path: string): string {
  if (!basePath || basePath === "/") return path;
  return `${basePath.replace(/\/$/u, "")}${path}`;
}

/** Creates a retro button style with a host-prefixed image. */
function buttonStyle(emphasis: "primary" | "secondary", basePath: string): CSSProperties {
  const asset = emphasis === "primary" ? RETRO_ARCADE_UI_ASSETS.primaryButton : RETRO_ARCADE_UI_ASSETS.secondaryButton;
  return { ...getRetroArcadeButtonStyle(emphasis), borderImageSource: `url("${withBasePath(basePath, asset)}")` };
}

/**
 * Shows server-safe class challenge summaries for one authenticated student.
 * @param props Owner scope, locale, routes, path prefix, and installed games.
 * @returns A compact challenge catalog or no content without an owner.
 */
export function StudentChallengeCatalogPanel({
  ownerKey,
  locale,
  games,
  classesEndpoint = "/api/v1/apk/challenges/classes",
  challengesEndpoint = "/api/v1/apk/challenges",
  basePath = "",
}: StudentChallengeCatalogPanelProps): ReactElement | null {
  const enabled = Boolean(ownerKey);
  const scope = useMemo(() => JSON.stringify([ownerKey, classesEndpoint, challengesEndpoint]), [ownerKey, classesEndpoint, challengesEndpoint]);
  const generationRef = useRef(0);
  const challengeGenerationRef = useRef(0);
  const challengeControllerRef = useRef<AbortController | null>(null);
  const controllersRef = useRef<AbortController[]>([]);
  const [classes, setClasses] = useState<readonly { id: string; name: string }[]>([]);
  const [classesScope, setClassesScope] = useState<string>();
  const [classesHasMore, setClassesHasMore] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>();
  const [challenges, setChallenges] = useState<readonly ClassChallengePublicSummary[]>([]);
  const [challengesScope, setChallengesScope] = useState<string>();
  const [challengeHasMore, setChallengeHasMore] = useState(false);
  const [classStatus, setClassStatus] = useState<LoadState | null>(null);
  const [challengeStatus, setChallengeStatus] = useState<LoadState | null>(null);

  const request = useCallback(async (url: string, controller: AbortController) => {
    const response = await fetch(url, { credentials: "same-origin", cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error("Request failed");
    return response.json() as Promise<unknown>;
  }, []);

  const loadClasses = useCallback(async (offset: number) => {
    if (!enabled) return;
    const generation = generationRef.current;
    const controller = new AbortController();
    controllersRef.current.push(controller);
    setClassStatus({ scope, loading: true, message: null });
    try {
      const payload = classesResponseSchema.parse(await request(`${classesEndpoint}?limit=${PAGE_SIZE}&offset=${offset}`, controller));
      if (generation !== generationRef.current || controller.signal.aborted) return;
      setClasses((current) => offset === 0 ? payload.classes : [...current, ...payload.classes]);
      setClassesScope(scope);
      setClassesHasMore(payload.hasMore && payload.classes.length > 0);
      if (offset === 0) setSelectedClassId(payload.classes[0]?.id);
      setClassStatus({ scope, loading: false, message: null });
    } catch {
      if (generation !== generationRef.current || controller.signal.aborted) return;
      setClassStatus({ scope, loading: false, message: "Classes could not be loaded." });
    } finally {
      controllersRef.current = controllersRef.current.filter((item) => item !== controller);
    }
  }, [classesEndpoint, enabled, request, scope]);

  const loadChallenges = useCallback(async (classId: string, offset: number) => {
    const generation = generationRef.current;
    const challengeGeneration = challengeGenerationRef.current;
    const controller = new AbortController();
    challengeControllerRef.current?.abort();
    challengeControllerRef.current = controller;
    controllersRef.current.push(controller);
    const selectedScope = `${scope}\u0000${classId}`;
    setChallengeStatus({ scope: selectedScope, loading: true, message: null });
    try {
      const query = `?classId=${encodeURIComponent(classId)}&limit=${PAGE_SIZE}&offset=${offset}`;
      const payload = challengesResponseSchema.parse(await request(`${challengesEndpoint}${query}`, controller));
      if (payload.challenges.some((challenge) => challenge.classId !== classId)) throw new Error("Class mismatch");
      if (generation !== generationRef.current || challengeGeneration !== challengeGenerationRef.current || controller.signal.aborted) return;
      setChallenges((current) => offset === 0 ? payload.challenges : [...current, ...payload.challenges]);
      setChallengesScope(selectedScope);
      setChallengeHasMore(payload.challenges.length === PAGE_SIZE);
      setChallengeStatus({ scope: selectedScope, loading: false, message: null });
    } catch {
      if (generation !== generationRef.current || challengeGeneration !== challengeGenerationRef.current || controller.signal.aborted) return;
      setChallengeStatus({ scope: selectedScope, loading: false, message: "Challenges could not be loaded." });
    } finally {
      controllersRef.current = controllersRef.current.filter((item) => item !== controller);
    }
  }, [challengesEndpoint, request, scope]);

  useEffect(() => {
    generationRef.current += 1;
    controllersRef.current.forEach((controller) => controller.abort());
    controllersRef.current = [];
    setClasses([]);
    setClassesScope(undefined);
    setSelectedClassId(undefined);
    setChallenges([]);
    setChallengesScope(undefined);
    setClassStatus(enabled ? { scope, loading: true, message: null } : null);
    setChallengeStatus(null);
    if (enabled) void loadClasses(0);
    return () => {
      generationRef.current += 1;
      controllersRef.current.forEach((controller) => controller.abort());
    };
  }, [enabled, loadClasses, scope]);

  useEffect(() => {
    challengeGenerationRef.current += 1;
    challengeControllerRef.current?.abort();
    setChallenges([]);
    setChallengesScope(undefined);
    setChallengeHasMore(false);
    setChallengeStatus(selectedClassId ? { scope: `${scope}\u0000${selectedClassId}`, loading: true, message: null } : null);
    if (enabled && selectedClassId) void loadChallenges(selectedClassId, 0);
  }, [enabled, loadChallenges, scope, selectedClassId]);

  if (!enabled) return null;
  const visibleClassStatus = classStatus?.scope === scope ? classStatus : null;
  const selectedChallengeScope = `${scope}\u0000${selectedClassId ?? ""}`;
  const visibleChallengeStatus = challengeStatus?.scope === selectedChallengeScope ? challengeStatus : null;
  const visibleClasses = classesScope === scope ? classes : [];
  const visibleChallenges = challengesScope === selectedChallengeScope ? challenges : [];
  const now = Date.now();

  return (
    <section aria-label="Class challenges" style={{ ...RETRO_ARCADE_PANEL_STYLE, borderImageSource: `url("${withBasePath(basePath, RETRO_ARCADE_UI_ASSETS.squarePanel)}")`, padding: 12, background: "#0f172a", color: "#f8fafc", maxWidth: "100%" }}>
      <h2 style={{ margin: 0 }}>Class challenges</h2>
      {visibleClassStatus?.message ? <div role="alert"><p>{visibleClassStatus.message}</p><button style={buttonStyle("secondary", basePath)} type="button" onClick={() => void loadClasses(0)}>Try again</button></div> : null}
      {visibleClassStatus?.loading && visibleClasses.length === 0 ? <p role="status">Loading classes…</p> : null}
      {visibleClasses.length > 0 ? <label>Class <select style={{ minHeight: 44, maxWidth: "100%" }} value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)}>{visibleClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}
      {classesHasMore && classesScope === scope ? <button disabled={visibleClassStatus?.loading} style={buttonStyle("secondary", basePath)} type="button" onClick={() => void loadClasses(visibleClasses.length)}>More classes</button> : null}
      {!visibleClassStatus?.loading && !visibleClassStatus?.message && visibleClasses.length === 0 ? <p>No classes are available.</p> : null}
      {visibleChallengeStatus?.message ? <div role="alert"><p>{visibleChallengeStatus.message}</p><button style={buttonStyle("secondary", basePath)} type="button" onClick={() => selectedClassId && void loadChallenges(selectedClassId, 0)}>Try again</button></div> : null}
      {visibleChallengeStatus?.loading && visibleChallenges.length === 0 ? <p role="status">Loading challenges…</p> : null}
      {!visibleChallengeStatus?.loading && !visibleChallengeStatus?.message && selectedClassId && visibleChallenges.length === 0 ? <p>No challenges are available.</p> : null}
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>{visibleChallenges.map((challenge) => {
        const installed = games[challenge.gameId];
        const active = Date.parse(challenge.startsAt) <= now && now < Date.parse(challenge.expiresAt);
        const supported = Boolean(installed && installed.version === challenge.gameVersion && challenge.difficulty === "medium" && challenge.modality.modality === "reading");
        const status = !active ? (now < Date.parse(challenge.startsAt) ? "Upcoming" : "Expired") : supported ? "Active" : "Unavailable";
        const href = withBasePath(basePath, `/${locale}/student/games/apk/${challenge.gameId}?challengeId=${challenge.id}`);
        return <li key={challenge.id} style={{ borderTop: "1px solid #475569", paddingBlock: 10, overflowWrap: "anywhere" }}><strong>{challenge.title}</strong><div>{installed?.title ?? "Game unavailable"}</div><div>Class progress: {challenge.contributionCount}/{challenge.target}</div><div>{status}</div><time dateTime={challenge.startsAt}>{new Date(challenge.startsAt).toLocaleDateString()}</time> – <time dateTime={challenge.expiresAt}>{new Date(challenge.expiresAt).toLocaleDateString()}</time>{active && supported ? <div><a style={{ ...buttonStyle("primary", basePath), display: "inline-flex", padding: "0.5rem 1rem", textDecoration: "none", fontWeight: 700, alignItems: "center" }} href={href}>Play challenge</a></div> : null}</li>;
      })}</ul>
      {challengeHasMore && challengesScope === selectedChallengeScope && selectedClassId ? <button disabled={visibleChallengeStatus?.loading} style={buttonStyle("secondary", basePath)} type="button" onClick={() => void loadChallenges(selectedClassId, visibleChallenges.length)}>More challenges</button> : null}
    </section>
  );
}
