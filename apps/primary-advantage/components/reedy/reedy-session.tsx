"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MicIcon, MicOffIcon, PhoneOffIcon, StarIcon } from "lucide-react";
import type { AvatarProfile } from "@reading-advantage/game-contracts";
import type { StartVoiceSessionOutput, VoiceBlock, VoiceSessionRecord } from "@reading-advantage/domain/primary-voice";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Reedy, type ReedyState } from "./reedy";
import { minutesText } from "./reedy-meter";

/** The phases of the Reedy screen. */
export type ReedyPhase = "idle" | "mic" | "connecting" | "live" | "ending" | "done" | "stopped" | "error";

/** The error the screen can explain. */
export type ReedyErrorKey = "noMic" | "micDenied" | "providerDown" | "lost" | VoiceBlock;

/** The browser pieces the session uses; tests replace them. */
export interface ReedyBrowser {
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  PeerConnection: typeof RTCPeerConnection;
  AudioContext?: typeof AudioContext;
  fetch: typeof fetch;
}

const defaultBrowser = (): ReedyBrowser => ({
  getUserMedia: (constraints) => navigator.mediaDevices.getUserMedia(constraints),
  PeerConnection: RTCPeerConnection,
  AudioContext: typeof AudioContext === "undefined" ? undefined : AudioContext,
  fetch: (input, init) => fetch(input, init),
});

/** The Realtime events of the data channel that drive the coach's state. */
export function reedyStateForEvent(type: string, current: ReedyState): ReedyState {
  if (type === "input_audio_buffer.speech_started") return "listening";
  if (type === "input_audio_buffer.speech_stopped") return "thinking";
  if (type === "output_audio_buffer.started" || type === "response.output_audio.delta") return "speaking";
  if (type === "output_audio_buffer.stopped" || type === "output_audio_buffer.cleared") return "listening";
  return current;
}

/**
 * The Reedy session screen (FR-8, FR-9, FR-11, FR-12): the mic flow, the WebRTC call through the
 * voice routes, the live timer, the stop screen at the limit, and the kind summary.
 * @param props.profile The student's avatar.
 * @param props.articleId The lesson article, or null.
 * @param props.remainingSeconds The month's seconds at page load.
 * @param props.blockedBy Why a session cannot start, or null.
 * @param props.browser The browser pieces (tests replace them).
 * @returns The screen.
 */
export function ReedySession({ profile, articleId, remainingSeconds, blockedBy, browser }: { profile: Pick<AvatarProfile, "classId" | "tints">; articleId: string | null; remainingSeconds: number; blockedBy: VoiceBlock | null; browser?: ReedyBrowser }) {
  const t = useTranslations("Reedy");
  const [phase, setPhase] = useState<ReedyPhase>(blockedBy ? "error" : "idle");
  const [error, setError] = useState<ReedyErrorKey | null>(blockedBy);
  const [state, setState] = useState<ReedyState>(blockedBy ? "reassuring" : "idle");
  const [level, setLevel] = useState(0);
  const [muted, setMuted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [summary, setSummary] = useState<VoiceSessionRecord | null>(null);
  const [monthLeft, setMonthLeft] = useState(remainingSeconds);
  const call = useRef<{ pc: RTCPeerConnection; mic: MediaStream; sessionId: string; expiresAt: number; audio: HTMLAudioElement | null; context: AudioContext | null; raf: number } | null>(null);
  const ending = useRef(false);
  // The browser pieces resolve on first use, never during server rendering (no RTCPeerConnection there).
  const api = useRef<ReedyBrowser | null>(browser ?? null);
  const apiOf = (): ReedyBrowser => {
    if (!api.current) api.current = defaultBrowser();
    return api.current;
  };

  const cleanup = useCallback(() => {
    const live = call.current;
    if (!live) return;
    cancelAnimationFrame(live.raf);
    live.mic.getTracks().forEach((track) => track.stop());
    live.pc.close();
    live.context?.close().catch(() => undefined);
    call.current = null;
  }, []);

  const finish = useCallback(
    async (reason: "USER_ENDED" | "CONNECTION_LOST" | "QUOTA_REACHED") => {
      const live = call.current;
      if (!live || ending.current) return;
      ending.current = true;
      setPhase("ending");
      setState("thinking");
      // The mic stops now; the call stays open until the server has asked the coach for the summary.
      live.mic.getTracks().forEach((track) => track.stop());
      if (reason === "CONNECTION_LOST") cleanup();
      try {
        const response = await apiOf().fetch(`/api/voice/sessions/${live.sessionId}/end`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason: reason === "QUOTA_REACHED" ? "USER_ENDED" : reason }) });
        const record = (await response.json()) as VoiceSessionRecord;
        setSummary(response.ok ? record : null);
        setMonthLeft((left) => Math.max(0, left - (record.consumedSeconds ?? 0)));
      } catch {
        setSummary(null);
      }
      cleanup();
      ending.current = false;
      if (reason === "CONNECTION_LOST") {
        setError("lost");
        setPhase("error");
        setState("reassuring");
      } else {
        setPhase(reason === "QUOTA_REACHED" ? "stopped" : "done");
        setState("celebrating");
      }
    },
    [cleanup],
  );

  // The countdown; the server ends the session at the limit, the client only shows it (FR-2).
  useEffect(() => {
    if (phase !== "live") return;
    const timer = setInterval(() => {
      const live = call.current;
      if (!live) return;
      const left = Math.max(0, Math.ceil((live.expiresAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) void finish("QUOTA_REACHED");
    }, 500);
    return () => clearInterval(timer);
  }, [phase, finish]);

  // A closed page still ends the session (keepalive).
  useEffect(() => {
    const onHide = () => {
      const live = call.current;
      if (!live) return;
      void apiOf().fetch(`/api/voice/sessions/${live.sessionId}/end`, { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ reason: "PAGE_CLOSED" }) }).catch(() => undefined);
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      cleanup();
    };
  }, [cleanup]);

  const start = async () => {
    setError(null);
    setPhase("mic");
    let mic: MediaStream;
    try {
      mic = await apiOf().getUserMedia({ audio: true });
    } catch (cause) {
      const name = (cause as { name?: string }).name;
      setError(name === "NotFoundError" || name === "OverconstrainedError" ? "noMic" : "micDenied");
      setPhase("error");
      setState("reassuring");
      return;
    }
    setPhase("connecting");
    setState("connecting");
    const Peer = apiOf().PeerConnection;
    const pc = new Peer();
    const live = { pc, mic, sessionId: "", expiresAt: 0, audio: null as HTMLAudioElement | null, context: null as AudioContext | null, raf: 0 };
    call.current = live;
    try {
      mic.getTracks().forEach((track) => pc.addTrack(track, mic));
      pc.ontrack = (event) => {
        const stream = event.streams[0];
        if (!stream) return;
        const audio = new Audio();
        audio.autoplay = true;
        audio.srcObject = stream;
        live.audio = audio;
        const Context = apiOf().AudioContext;
        if (!Context) return;
        const context = new Context();
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        context.createMediaStreamSource(stream).connect(analyser);
        live.context = context;
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (const sample of data) sum += (sample - 128) ** 2;
          setLevel(Math.min(1, Math.sqrt(sum / data.length) / 40));
          live.raf = requestAnimationFrame(tick);
        };
        live.raf = requestAnimationFrame(tick);
      };
      const channel = pc.createDataChannel("oai-events");
      channel.onmessage = (message) => {
        try {
          const event = JSON.parse(String(message.data)) as { type?: string };
          if (typeof event.type === "string") setState((current) => (muted ? "muted" : reedyStateForEvent(event.type!, current)));
        } catch {
          /* a non-JSON frame */
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          void apiOf()
            .fetch(`/api/voice/sessions/${live.sessionId}/connected`, { method: "POST" })
            .then(async (response) => {
              const body = (await response.json()) as { expiresAt?: string };
              if (body.expiresAt) live.expiresAt = Date.parse(body.expiresAt);
              setPhase("live");
              setState("listening");
            })
            .catch(() => finish("CONNECTION_LOST"));
        } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected" || pc.connectionState === "closed") {
          if (call.current === live && !ending.current && phase !== "done") void finish("CONNECTION_LOST");
        }
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") return resolve();
        const done = () => {
          if (pc.iceGatheringState === "complete") {
            pc.removeEventListener("icegatheringstatechange", done);
            resolve();
          }
        };
        pc.addEventListener("icegatheringstatechange", done);
        setTimeout(resolve, 2000);
      });
      const response = await apiOf().fetch("/api/voice/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ articleId, sdp: pc.localDescription?.sdp ?? offer.sdp }) });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        const code = body.error;
        const key: ReedyErrorKey = code === "QUOTA_EXHAUSTED" || code === "SESSION_ALREADY_ACTIVE" || code === "AUTH_STRENGTH" || code === "VOICE_DISABLED" || code === "AVATAR_REQUIRED" ? ({ QUOTA_EXHAUSTED: "QUOTA_EXHAUSTED", SESSION_ALREADY_ACTIVE: "SESSION_ACTIVE", AUTH_STRENGTH: "AUTH_STRENGTH", VOICE_DISABLED: "DISABLED", AVATAR_REQUIRED: "NO_AVATAR" } as const)[code] : "providerDown";
        throw Object.assign(new Error(code ?? "failed"), { key });
      }
      const started = (await response.json()) as StartVoiceSessionOutput;
      live.sessionId = started.sessionId;
      live.expiresAt = Date.parse(started.expiresAt);
      setMonthLeft(started.remainingSeconds + started.reservedSeconds);
      await pc.setRemoteDescription({ type: "answer", sdp: started.answerSdp });
    } catch (cause) {
      cleanup();
      setError(((cause as { key?: ReedyErrorKey }).key ?? "providerDown") as ReedyErrorKey);
      setPhase("error");
      setState("reassuring");
    }
  };

  const toggleMute = () => {
    const live = call.current;
    if (!live) return;
    const next = !muted;
    live.mic.getAudioTracks().forEach((track) => (track.enabled = !next));
    setMuted(next);
    setState(next ? "muted" : "listening");
  };

  const scores = summary?.scores;
  return (
    <div className="flex flex-col items-center gap-6">
      <Reedy profile={profile} state={state} level={level} />
      {phase === "live" || phase === "connecting" ? (
        <p role="timer" aria-live="off" className="text-lg font-semibold tabular-nums">
          {phase === "connecting" ? t("connecting") : t("timeLeft", { time: minutesText(secondsLeft ?? 0) })}
        </p>
      ) : null}
      {phase === "idle" ? (
        <div className="flex flex-col items-center gap-3">
          <p className="cq-on-scene text-center text-sm">{t("micAsk")}</p>
          <Button type="button" onClick={start} className="min-h-14 rounded-2xl px-8 text-lg">
            <MicIcon aria-hidden="true" className="size-5" />
            {t("start")}
          </Button>
        </div>
      ) : null}
      {phase === "mic" ? <p className="text-muted-foreground text-sm">{t("micAsk")}</p> : null}
      {phase === "live" ? (
        <div className="flex flex-wrap justify-center gap-3">
          <Button type="button" variant="outline" onClick={toggleMute} aria-pressed={muted} className="min-h-12 rounded-xl px-6 text-base">
            {muted ? <MicOffIcon aria-hidden="true" className="size-5" /> : <MicIcon aria-hidden="true" className="size-5" />}
            {muted ? t("unmute") : t("mute")}
          </Button>
          <Button type="button" variant="destructive" onClick={() => finish("USER_ENDED")} className="min-h-12 rounded-xl px-6 text-base">
            <PhoneOffIcon aria-hidden="true" className="size-5" />
            {t("end")}
          </Button>
        </div>
      ) : null}
      {phase === "ending" ? <p className="text-muted-foreground text-sm">{t("connecting")}</p> : null}
      {phase === "stopped" ? (
        <section role="status" className="bg-card flex max-w-md flex-col items-center gap-2 rounded-2xl border p-5 text-center shadow-sm">
          <h2 className="text-xl font-bold">{t("stopTitle")}</h2>
          <p className="text-muted-foreground">{t("stopBody")}</p>
        </section>
      ) : null}
      {(phase === "done" || phase === "stopped") && summary ? (
        <section aria-labelledby="reedy-summary" className="bg-card flex w-full max-w-md flex-col gap-4 rounded-2xl border p-5 shadow-sm">
          <h2 id="reedy-summary" className="text-xl font-bold">
            {t("summaryTitle")}
          </h2>
          <p className="text-muted-foreground text-sm">{t("summaryKind")}</p>
          {scores ? (
            <ul className="grid grid-cols-2 gap-3">
              {(["fluency", "grammar", "vocabulary", "pronunciation"] as const).map((key) => (
                <li key={key} className="flex flex-col gap-1">
                  <span className="text-sm font-semibold">{t(`scores.${key}`)}</span>
                  <span role="img" aria-label={t("stars", { score: scores[key] })} className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <StarIcon key={n} aria-hidden="true" className={cn("size-5", n <= scores[key] ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {summary.summary ? (
            <div className="flex flex-col gap-2 text-sm">
              <p lang="th">{summary.summary.summaryTh}</p>
              {summary.summary.strengths.length ? (
                <p>
                  <span className="font-semibold">{t("strengths")}: </span>
                  <span lang="th">{summary.summary.strengths.join(" · ")}</span>
                </p>
              ) : null}
              {summary.summary.improvements.length ? (
                <p>
                  <span className="font-semibold">{t("improvements")}: </span>
                  <span lang="th">{summary.summary.improvements.join(" · ")}</span>
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
      {phase === "error" && error ? (
        <p role="alert" className="max-w-md text-center text-base">
          {error === "noMic" || error === "micDenied" || error === "providerDown" || error === "lost" ? t(error) : t(`blocked.${error}`)}
        </p>
      ) : null}
      {phase === "done" || phase === "stopped" || phase === "error" ? (
        <div className="flex flex-wrap justify-center gap-3">
          {phase !== "stopped" && error !== "QUOTA_EXHAUSTED" && error !== "DISABLED" && error !== "SCHOOL_DISABLED" && error !== "AUTH_STRENGTH" && monthLeft > 0 ? (
            <Button type="button" variant="outline" onClick={() => { setSummary(null); setError(null); setPhase("idle"); setState("idle"); setMuted(false); }} className="min-h-12 rounded-xl px-6 text-base">
              {t("again")}
            </Button>
          ) : null}
          {error === "NO_AVATAR" ? (
            <Link href="/student/avatar?from=reedy" className={cn(buttonVariants({ variant: "default" }), "min-h-12 rounded-xl px-6 text-base")}>
              {t("blocked.NO_AVATAR")}
            </Link>
          ) : null}
          <Link href="/student/home" className={cn(buttonVariants({ variant: "ghost" }), "min-h-12 rounded-xl px-6 text-base")}>
            {t("backHome")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
