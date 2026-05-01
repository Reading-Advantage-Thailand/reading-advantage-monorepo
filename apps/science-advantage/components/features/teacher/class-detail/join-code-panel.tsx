"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, Copy, Eye, EyeOff, Lock } from "lucide-react";

import { track } from "@/lib/analytics";
import { copyToClipboard } from "@/lib/utils/clipboard";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type LocaleKey = "en" | "th";

type Translations = Record<
  LocaleKey,
  {
    title: string;
    revealAction: string;
    hideAction: string;
    revealPlaceholder: string;
    copyAction: string;
    copiedAction: string;
    helpText: string;
    pending: string;
    error: string;
    unauthorized: string;
    ariaRevealed: string;
    ariaHidden: string;
    ariaCopied: string;
    ariaCopyFailed: string;
    retry: string;
  }
>;

const translations: Translations = {
  en: {
    title: "Class Join Code",
    revealAction: "Reveal Code",
    hideAction: "Hide code",
    revealPlaceholder: "Click to reveal",
    copyAction: "Copy Code",
    copiedAction: "Copied!",
    helpText: "Share this code with students to let them join the class.",
    pending: "Join code is being generated...",
    error: "Failed to load join code.",
    unauthorized: "You do not have permission to view this join code.",
    ariaRevealed: "Join code revealed",
    ariaHidden: "Join code hidden",
    ariaCopied: "Join code copied to clipboard",
    ariaCopyFailed: "Failed to copy join code",
    retry: "Retry",
  },
  th: {
    title: "รหัสเข้าชั้นเรียน",
    revealAction: "แสดงรหัส",
    hideAction: "ซ่อนรหัส",
    revealPlaceholder: "คลิกเพื่อแสดงรหัส",
    copyAction: "คัดลอกรหัส",
    copiedAction: "คัดลอกแล้ว!",
    helpText: "แบ่งปันรหัสนี้ให้นักเรียนเพื่อเข้าร่วมชั้นเรียน",
    pending: "กำลังกำหนดรหัสเข้าชั้นเรียน...",
    error: "ไม่สามารถโหลดรหัสเข้าชั้นเรียน",
    unauthorized: "คุณไม่มีสิทธิ์ดูรหัสเข้าชั้นเรียนนี้",
    ariaRevealed: "แสดงรหัสเข้าชั้นเรียนแล้ว",
    ariaHidden: "ซ่อนรหัสเข้าชั้นเรียนแล้ว",
    ariaCopied: "คัดลอกรหัสเข้าชั้นเรียนแล้ว",
    ariaCopyFailed: "คัดลอกรหัสเข้าชั้นเรียนไม่สำเร็จ",
    retry: "ลองอีกครั้ง",
  },
};

type JoinCodePanelStatus = "ready" | "pending" | "error";

export interface JoinCodePanelProps {
  classId: string;
  classTitle: string;
  joinCode?: string | null;
  isOwner: boolean;
  status?: JoinCodePanelStatus;
  onRetry?: () => void | Promise<void>;
  className?: string;
}

export function JoinCodePanel({
  classId,
  classTitle,
  joinCode,
  isOwner,
  status,
  onRetry,
  className,
}: JoinCodePanelProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [isCopying, setIsCopying] = useState(false);
  const copyResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [internalStatus, setInternalStatus] = useState<JoinCodePanelStatus>(() => {
    if (status) return status;
    if (!joinCode) return "pending";
    return "ready";
  });

  useEffect(() => {
    if (status) {
      setInternalStatus(status);
      return;
    }
    setInternalStatus(joinCode ? "ready" : "pending");
  }, [joinCode, status]);

  const locale: LocaleKey = useMemo(() => {
    if (typeof document === "undefined") {
      return "en";
    }
    const lang = document.documentElement.lang?.toLowerCase() ?? "en";
    return lang.startsWith("th") ? "th" : "en";
  }, []);

  const t = translations[locale];

  useEffect(() => {
    if (!announcement) return;
    const timeout = setTimeout(() => setAnnouncement(""), 2000);
    return () => clearTimeout(timeout);
  }, [announcement]);

  const handleRevealToggle = useCallback(() => {
    if (!isOwner || internalStatus !== "ready") {
      return;
    }

    setIsRevealed(previous => {
      const next = !previous;
      setAnnouncement(next ? t.ariaRevealed : t.ariaHidden);

      if (!previous) {
        track("join_code_revealed", { classId });
      }

      return next;
    });
  }, [classId, internalStatus, isOwner, t.ariaHidden, t.ariaRevealed]);

  const handleCopy = useCallback(async () => {
    if (!joinCode || !isOwner || !isRevealed || internalStatus !== "ready") {
      return;
    }

    try {
      setIsCopying(true);
      const success = await copyToClipboard(joinCode);

      if (success) {
        setIsCopied(true);
        setAnnouncement(t.ariaCopied);
        track("join_code_copied", { classId });
        if (copyResetTimeoutRef.current) {
          clearTimeout(copyResetTimeoutRef.current);
        }
        copyResetTimeoutRef.current = setTimeout(() => setIsCopied(false), 2000);
      } else {
        setAnnouncement(t.ariaCopyFailed);
      }
    } finally {
      setIsCopying(false);
    }
  }, [classId, internalStatus, isOwner, isRevealed, joinCode, t.ariaCopied, t.ariaCopyFailed]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key.toLowerCase() === "c" && event.shiftKey && internalStatus === "ready") {
        if (event.metaKey || event.ctrlKey) {
          event.preventDefault();
          handleCopy();
        }
      }
      if (event.key === "Enter" && !isRevealed && internalStatus === "ready") {
        event.preventDefault();
        handleRevealToggle();
      }
    },
    [handleCopy, handleRevealToggle, internalStatus, isRevealed]
  );

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current) {
        clearTimeout(copyResetTimeoutRef.current);
      }
    };
  }, []);

  let body: React.ReactNode;

  if (!isOwner) {
    body = (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-amber-200 bg-amber-50 px-4 py-5 text-center text-sm text-amber-800">
        <Lock className="h-5 w-5" aria-hidden />
        <p>{t.unauthorized}</p>
      </div>
    );
  } else if (internalStatus === "pending") {
    body = (
      <div className="rounded-lg border border-dashed border-sky-200 bg-sky-50 px-4 py-5 text-sm text-sky-800">
        {t.pending}
      </div>
    );
  } else if (internalStatus === "error") {
    body = (
      <div className="flex flex-col gap-3 rounded-lg border border-dashed border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-800">
        <p>{t.error}</p>
        {onRetry ? (
          <div>
            <Button size="sm" variant="outline" onClick={onRetry}>
              {t.retry}
            </Button>
          </div>
        ) : null}
      </div>
    );
  } else {
    body = (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-emerald-200 bg-emerald-50 px-4 py-3">
          <span
            className={cn(
              "font-mono text-xl font-semibold tracking-widest",
              isRevealed ? "text-emerald-700" : "text-emerald-600"
            )}
            aria-live="polite"
            aria-label={
              isRevealed
                ? joinCode ?? t.revealPlaceholder
                : t.revealPlaceholder
            }
          >
            {isRevealed ? joinCode ?? t.revealPlaceholder : "••••••"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRevealToggle}
              aria-pressed={isRevealed}
              aria-label={isRevealed ? t.hideAction : t.revealAction}
            >
              {isRevealed ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" aria-hidden />
                  {t.hideAction}
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" aria-hidden />
                  {t.revealAction}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!isRevealed || isCopying}
              aria-live="polite"
              aria-label={isCopied ? t.copiedAction : t.copyAction}
            >
              {isCopied ? (
                <>
                  <Check className="mr-2 h-4 w-4" aria-hidden />
                  {t.copiedAction}
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" aria-hidden />
                  {t.copyAction}
                </>
              )}
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-600">{t.helpText}</p>
      </>
    );
  }

  return (
    <Card className={className} onKeyDown={onKeyDown}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">{t.title}</CardTitle>
        <CardDescription>{classTitle}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {body}
        <span aria-live="polite" className="sr-only">
          {announcement}
        </span>
      </CardContent>
    </Card>
  );
}
