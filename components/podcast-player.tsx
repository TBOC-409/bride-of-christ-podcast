"use client";

import Image from "next/image";
import { Loader2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { StreamStatus } from "@/lib/icecast";

/** How often "now playing" refreshes while the page is open. */
const POLL_MS = 20_000;
/** Reconnection attempts when the stream drops. */
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3_000;

type PlayState = "idle" | "connecting" | "playing" | "reconnecting" | "error";

/** Four bars that move while audio plays and rest when it does not. */
function Equalizer({ active }: { active: boolean }) {
  return (
    <span className="site-eq flex h-5 items-end gap-[3px]" data-active={active} aria-hidden>
      {[0, 1, 2, 3].map((bar) => (
        <span key={bar} className="h-full w-[3px] rounded-full bg-sky-500" />
      ))}
    </span>
  );
}

/**
 * The player for the church's 24/7 radio, and the centrepiece of the page.
 *
 * The stream never stops: church programmes go out live, with music between
 * them. So there is no on air or off air, only what is playing now, which the
 * stream announces and this refreshes while the page is open.
 *
 * Controls are custom because the browser's own audio controls offer a
 * download, and the address is fetched when someone presses Listen rather than
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

  // Starts from the server's answer, then keeps "now playing" current,
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

  // Leaving the page closes the connection to the stream.
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
    // If the station cannot be reached at all, repeated attempts only delay
    // the honest answer.
    const limit = status.online ? MAX_RETRIES : 1;
    if (retries.current >= limit) {
      wantPlaying.current = false;
      setState("error");
      setMessage(
        status.online
          ? `${reason} Press Listen live to try again.`
          : "The radio cannot be reached right now. Please try again in a few minutes.",
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
      if (!response.ok || !body.url) throw new Error(body.error ?? "The radio is not available.");
      const element = audio.current;
      if (!element || !wantPlaying.current) return;
      // A fresh query string stops the browser resuming a stale buffer, and a
      // fresh request picks up a new token from hosts such as Zeno.fm.
      element.src = `${body.url}${body.url.includes("?") ? "&" : "?"}t=${Date.now()}`;
      element.volume = volume;
      element.muted = muted;
      await element.play();
    } catch (error) {
      retryOrGiveUp(error instanceof Error ? error.message : "Could not connect to the radio.");
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
  const nowPlaying = !status.configured
    ? "The radio has not been set up yet."
    : status.online
      ? status.title ?? "Live now"
      : "The radio cannot be reached right now.";

  return (
    <section className="site-liquid-home relative isolate overflow-hidden rounded-3xl border border-white/80 p-5 shadow-[0_30px_80px_rgba(14,116,144,0.16)] sm:p-8">
      <div className="site-liquid-blob site-liquid-blob-one pointer-events-none opacity-50" aria-hidden />
      <div className="site-liquid-blob site-liquid-blob-two pointer-events-none opacity-40" aria-hidden />

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
        onEnded={() => retryOrGiveUp("The stream ended.")}
      />

      <div className="relative flex items-center gap-4">
        <Image
          src="/logo.png"
          alt=""
          width={72}
          height={72}
          priority
          className="h-16 w-16 shrink-0 rounded-2xl object-cover shadow-lg ring-4 ring-white sm:h-[72px] sm:w-[72px]"
        />
        <div className="min-w-0">
          {status.configured &&
            (status.online ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-sm">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden />
                Live radio
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />
                Unavailable
              </span>
            ))}
          <h1 className="mt-1.5 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">The Bride Online Radio</h1>
          <p className="mt-0.5 text-sm leading-5 text-slate-600">Church programmes most days, gospel music in between.</p>
        </div>
      </div>

      <div className="relative mt-6 rounded-2xl bg-white/75 p-4 ring-1 ring-white sm:p-5" aria-live="polite">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Now playing</p>
          {status.online && <Equalizer active={state === "playing"} />}
        </div>
        <p className="mt-1.5 line-clamp-2 text-lg font-semibold leading-snug text-slate-900 sm:text-xl">{nowPlaying}</p>
        {status.online && status.listeners !== null && (
          <p className="mt-1 text-xs font-medium text-slate-500">
            {status.listeners} {status.listeners === 1 ? "person" : "people"} listening
          </p>
        )}
      </div>

      {status.configured && (
        <div className="relative mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={active ? stop : listen}
            aria-label={active ? "Stop listening" : "Listen live"}
            className="inline-flex min-h-14 items-center gap-2.5 rounded-full bg-sky-600 py-2 pl-2 pr-6 text-base font-semibold text-white shadow-[0_12px_32px_rgba(2,132,199,.35)] transition hover:bg-sky-700 active:scale-[0.98]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : state === "playing" ? (
                <Pause className="h-5 w-5" aria-hidden />
              ) : (
                <Play className="ml-0.5 h-5 w-5" aria-hidden />
              )}
            </span>
            {state === "connecting" ? "Connecting…" : state === "reconnecting" ? "Reconnecting…" : state === "playing" ? "Stop" : "Listen live"}
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-slate-600 ring-1 ring-white transition hover:text-slate-900"
            >
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
              className="hidden w-28 accent-sky-600 sm:block"
            />
          </div>
        </div>
      )}

      {message && (
        <p
          role={state === "error" ? "alert" : "status"}
          className={`relative mt-4 rounded-xl border px-3 py-2 text-xs font-medium ${state === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-white bg-white/70 text-slate-600"}`}
        >
          {message}
        </p>
      )}
    </section>
  );
}
