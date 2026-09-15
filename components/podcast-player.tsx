"use client";

import { Loader2, Pause, Play, Radio, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { StreamStatus } from "@/lib/icecast";

/** How often the on-air badge checks Icecast while the page is open. */
const POLL_MS = 20_000;
/** Reconnection attempts when the stream drops during a live programme. */
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3_000;

type PlayState = "idle" | "connecting" | "playing" | "reconnecting" | "error";

/**
 * The live player for the church's single Icecast stream.
 *
 * Controls are custom because the browser's own audio controls offer a
 * download. The address is fetched when someone presses Listen rather than
 * written into the page. Neither stops a determined listener recording it.
 */
export function PodcastPlayer({ initialStatus }: { initialStatus: StreamStatus }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  /** True from pressing Listen until pressing Stop, so drops can be retried. */
  const wantPlaying = useRef(false);
  const retries = useRef(0);
  const [status, setStatus] = useState<StreamStatus>(initialStatus);
  const [state, setState] = useState<PlayState>("idle");
  const [message, setMessage] = useState("");
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.9);

  // The badge starts from the server's answer and then keeps itself current,
  // checking again straight away when someone returns to the tab.
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const response = await fetch("/api/status", { cache: "no-store" });
        if (!response.ok) return;
        const next = (await response.json()) as StreamStatus;
        if (!cancelled) setStatus(next);
      } catch {
        // Keep showing the last known status.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = setInterval(refresh, POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Leaving the page closes the connection to Icecast.
  useEffect(() => {
    const element = audio.current;
    return () => {
      wantPlaying.current = false;
      if (element) {
        element.pause();
        element.removeAttribute("src");
        element.load();
      }
    };
  }, []);

  function release() {
    const element = audio.current;
    if (!element) return;
    element.pause();
    // Dropping the source ends the download rather than buffering unheard audio.
    element.removeAttribute("src");
    element.load();
  }

  function retryOrGiveUp(reason: string) {
    if (!wantPlaying.current) return;
    release();
    // Off air, the mount does not exist, so repeated attempts only delay the
    // honest answer.
    const limit = status.live ? MAX_RETRIES : 1;
    if (retries.current >= limit) {
      wantPlaying.current = false;
      setState("error");
      setMessage(
        status.live
          ? `${reason} Press Listen live to try again.`
          : "Nothing is broadcasting right now. Press Listen live when a programme starts.",
      );
      return;
    }
    retries.current += 1;
    setState("reconnecting");
    setMessage(`Reconnecting… attempt ${retries.current} of ${limit}`);
    setTimeout(() => {
      if (wantPlaying.current) void connect();
    }, RETRY_DELAY_MS);
  }

  async function connect() {
    try {
      const response = await fetch("/api/stream", { cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !body.url) throw new Error(body.error ?? "The live stream is not available.");
      const element = audio.current;
      if (!element || !wantPlaying.current) return;
      // A fresh query string stops the browser resuming a stale buffer.
      element.src = `${body.url}${body.url.includes("?") ? "&" : "?"}t=${Date.now()}`;
      element.volume = volume;
      element.muted = muted;
      await element.play();
    } catch (error) {
      retryOrGiveUp(error instanceof Error ? error.message : "Could not connect to the live stream.");
    }
  }

  function listen() {
    wantPlaying.current = true;
    retries.current = 0;
    setState("connecting");
    setMessage("");
    void connect();
  }

  function stop() {
    wantPlaying.current = false;
    retries.current = 0;
    release();
    setState("idle");
    setMessage("");
  }

  function changeVolume(next: number) {
    setVolume(next);
    if (audio.current) audio.current.volume = next;
    if (next > 0 && muted) {
      setMuted(false);
      if (audio.current) audio.current.muted = false;
    }
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    if (audio.current) audio.current.muted = next;
  }

  const busy = state === "connecting" || state === "reconnecting";
  const active = busy || state === "playing";

  return (
    <div>
      <audio
        ref={audio}
        preload="none"
        controlsList="nodownload noplaybackrate"
        onContextMenu={(event) => event.preventDefault()}
        onPlaying={() => {
          retries.current = 0;
          setState("playing");
          setMessage("");
        }}
        onWaiting={() => {
          if (wantPlaying.current) setMessage("Buffering…");
        }}
        onError={() => retryOrGiveUp("The stream dropped.")}
        onEnded={() => retryOrGiveUp("The broadcast ended.")}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {status.live ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-red-700">
            <Radio className="h-3.5 w-3.5 animate-pulse" aria-hidden />On air
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">
            <Radio className="h-3.5 w-3.5" aria-hidden />Off air
          </span>
        )}
        {status.live && status.listeners !== null && (
          <span className="text-xs font-medium text-slate-500">
            {status.listeners} {status.listeners === 1 ? "person" : "people"} listening
          </span>
        )}
      </div>

      {status.live && status.title && (
        <p className="mt-3 text-lg font-semibold leading-snug text-slate-900">{status.title}</p>
      )}

      {!status.configured ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          The live stream has not been set up yet.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={active ? stop : listen}
              aria-label={active ? "Stop listening" : "Listen live"}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-sky-600 px-6 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(14,165,233,.22)] transition hover:bg-sky-700"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : state === "playing" ? (
                <Pause className="h-4 w-4" aria-hidden />
              ) : (
                <Play className="h-4 w-4" aria-hidden />
              )}
              {state === "connecting" ? "Connecting…" : state === "reconnecting" ? "Reconnecting…" : state === "playing" ? "Stop" : "Listen live"}
            </button>

            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} className="text-slate-500 hover:text-slate-800">
                {muted ? <VolumeX className="h-5 w-5" aria-hidden /> : <Volume2 className="h-5 w-5" aria-hidden />}
              </button>
              <label className="sr-only" htmlFor="podcast-volume">Volume</label>
              <input
                id="podcast-volume"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(event) => changeVolume(Number(event.target.value))}
                className="w-24 accent-sky-600"
              />
            </div>
          </div>

          {!status.live && state === "idle" && !message && (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Nothing is broadcasting right now. When a church programme starts, this shows On air.
            </p>
          )}

          {message && (
            <p
              role={state === "error" ? "alert" : "status"}
              className={`mt-3 rounded-xl border px-3 py-2 text-xs font-medium ${state === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}
            >
              {message}
            </p>
          )}
        </>
      )}
    </div>
  );
}
