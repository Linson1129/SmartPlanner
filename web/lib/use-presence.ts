"use client";

import { useEffect, useRef, useState } from "react";
import { sendHeartbeat } from "./api";
import type { HeartbeatResponse } from "./types";

interface UsePresenceOptions {
  enabled: boolean;
  idleThresholdSeconds: number;
  onHeartbeat: (response: HeartbeatResponse) => void;
}

interface PresenceState {
  active: boolean;
  online: boolean;
  lastSync: Date | null;
  sessionId: string;
}

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Sends a heartbeat while the tab is visible. "Active" means the user has
 * interacted within the configured idle threshold; the server uses the
 * aggregate of all browser sessions to decide whether normal strong reminders
 * should be held back.
 */
export function usePresence({ enabled, idleThresholdSeconds, onHeartbeat }: UsePresenceOptions): PresenceState {
  const [active, setActive] = useState(true);
  const [online, setOnline] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const sessionIdRef = useRef<string>("");
  const lastInteractionRef = useRef<number>(Date.now());
  const inFlightRef = useRef(false);
  const onHeartbeatRef = useRef(onHeartbeat);
  const thresholdRef = useRef(idleThresholdSeconds);

  onHeartbeatRef.current = onHeartbeat;
  thresholdRef.current = idleThresholdSeconds;

  useEffect(() => {
    if (!enabled) return undefined;
    if (!sessionIdRef.current) {
      sessionIdRef.current = createSessionId();
    }
    let disposed = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let stateTimer: ReturnType<typeof setInterval> | undefined;

    const tick = async () => {
      if (disposed) return;
      if (document.visibilityState !== "visible") {
        setActive(false);
        return;
      }
      const idle = Date.now() - lastInteractionRef.current >= thresholdRef.current * 1000;
      setActive(!idle);
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const response = await sendHeartbeat(sessionIdRef.current, !idle, true);
        if (disposed) return;
        setOnline(true);
        setLastSync(new Date());
        onHeartbeatRef.current(response);
      } catch {
        if (!disposed) setOnline(false);
      } finally {
        inFlightRef.current = false;
      }
    };

    const markInteraction = () => {
      lastInteractionRef.current = Date.now();
      if (document.visibilityState === "visible") {
        setActive(true);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        lastInteractionRef.current = Date.now();
        setActive(true);
        void tick();
      } else {
        setActive(false);
      }
    };

    const activityEvents: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"];
    activityEvents.forEach((name) => window.addEventListener(name, markInteraction, { passive: true }));
    document.addEventListener("visibilitychange", onVisibility);
    void tick();
    pollTimer = setInterval(() => void tick(), 8_000);
    stateTimer = setInterval(() => {
      if (document.visibilityState !== "visible") {
        setActive(false);
        return;
      }
      setActive(Date.now() - lastInteractionRef.current < thresholdRef.current * 1000);
    }, 5_000);

    return () => {
      disposed = true;
      if (pollTimer) clearInterval(pollTimer);
      if (stateTimer) clearInterval(stateTimer);
      activityEvents.forEach((name) => window.removeEventListener(name, markInteraction));
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, idleThresholdSeconds]);

  return { active, online, lastSync, sessionId: sessionIdRef.current };
}
