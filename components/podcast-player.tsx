"use client";

import Image from "next/image";
import { Loader2, Play, Square, Volume2, VolumeX } from "lucide-react";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import type { StreamStatus } from "@/lib/icecast";
import { HEARTBEAT_MS } from "@/lib/listeners";

/** How often "now playing" refreshes while the page is open. */
const POLL_MS = 20_000;
/** Reconnection attempts when the stream drops. */
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3_000;
/** Height of the sticky site header, which covers the top of the page. */
const HEADER_PX = 64;
/** Browser storage key for the anonymous listener ID. */
const LISTENER_KEY = "boc-podcast-listener";

/**
 * One anonymous ID per browser, so two tabs playing at once count as one
 * listener. If storage is blocked, the ID lives only as long as the page.
 */
function listenerId(): string {
  try {
    const saved = window.localStorage.getItem(LISTENER_KEY);
    if (saved && /^[A-Za-z0-9-]{8,64}$/.test(saved)) return saved;
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(LISTENER_KEY, fresh);
    return fresh;
  } catch {
    return crypto.randomUUID();
  }
}

type PlayState = "idle" | "connecting" | "playing" | "reconnecting" | "error";

const BAR_COUNT = 72;
/**
 * The ring of signal bars. Timings vary from bar to bar so the ring ripples
 * rather than pulsing as one, but are fixed, so server and browser agree.
 */
const BARS = Array.from({ length: BAR_COUNT }, (_, index) => ({
  angle: (360 / BAR_COUNT) * index,
  delay: -((index * 37) % 97) / 100,
  duration: 0.55 + ((index * 53) % 60) / 100,
}));

/**
 * The logo, held still, inside a ring of signal bars. While audio plays the
 * bars rise and a warm glow behind the logo gently brightens; both settle when
 * it stops. The bars are decoration, not a reading of the audio: measuring a
 * stream from another site would silence it in the browser.
 */
function SignalDial({ playing }: { playing: boolean }) {
  return (
    <div className="signal-dial" data-playing={playing} aria-hidden>
      <div className="signal-bars absolute inset-0">
        {BARS.map((bar) => (
          <span key={bar.angle} style={{ transform: `rotate(${bar.angle}deg)` }}>
            <i style={{ animationDelay: `${bar.delay}s`, animationDuration: `${bar.duration}s` }} />
          </span>
        ))}
      </div>
      <div className="signal-halo" />
      <div className="signal-ring" />
      <div className="signal-disc">
        <Image src="/logo.png" alt="" fill priority sizes="200px" className="scale-[1.16] object-cover" />
      </div>
    </div>
  );
}

/** A scrolling station band under the header, repeated so it loops seamlessly. */
function OnAirTicker({ items }: { items: string[] }) {
  const run = [...items, ...items, ...items];
  const group = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {run.map((item, index) => (
        <li key={index} className="flex items-center whitespace-nowrap">
          <span className="px-5">{item}</span>
          <span className="text-gold-500" aria-hidden>✦</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="border-b border-sky-wash-200 bg-white/50" aria-hidden>
      <div className="on-air-ticker overflow-hidden py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-navy-900/70">
        <div className="on-air-track">
          {group(false)}
          {group(true)}
        </div>
      </div>
    </div>
  );
}

/**
 * Streams announce songs as "Artist - Song". Split that way, the song can lead
 * and the artist sit beneath it. Anything else, such as a programme name, is
 * shown whole.
 */
function splitTitle(title: string): { song: string; artist: string | null } {
  const parts = title.split(" - ");
  if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) return { song: title, artist: null };
  return { song: parts[1].trim(), artist: parts[0].trim() };
}

/**
 * The player for the church's 24/7 radio, and the centrepiece of the page.
 * Whatever is passed as children (the notepad) sits beside it.
 *
 * The stream never stops: church programmes go out live, with music between
 * them. So there is no on air or off air, only what is playing now, which the
 * stream announces and this refreshes while the page is open.
 *
 * Controls are custom because the browser's own audio controls offer a
 * download, and the address is fetched when someone presses Listen rather than
 * written into the page. Neither stops a determined listener recording it.
 */
export function PodcastPlayer({ initialStatus, children }: { initialStatus: StreamStatus; children?: ReactNode }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  /** True from pressing Listen until pressing Stop, so drops can be retried. */
  const wantPlaying = useRef(false);
  const retries = useRef(0);
  const listenerRef = useRef<string | null>(null);
  const [status, setStatus] = useState<StreamStatus>(initialStatus);
  const [state, setState] = useState<PlayState>("idle");
  const [message, setMessage] = useState("");
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.9);
  const controls = useRef<HTMLDivElement | null>(null);
  /** True once the main controls have scrolled up out of view, to show the mini player. */
  const [controlsPassed, setControlsPassed] = useState(false);

  // On phones the notepad sits below the player, so a mini player docks at the
  // bottom while writing. On wide screens the player stays in view and it never shows.
  useEffect(() => {
    const element = controls.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      // Only once scrolled past, not while still further down a short screen.
      ([entry]) => setControlsPassed(!entry.isIntersecting && entry.boundingClientRect.top < HEADER_PX),
      { rootMargin: `-${HEADER_PX}px 0px 0px 0px` },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

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

  // Counted as listening while audio plays, and while reconnecting after a
  // drop, so a brief stall does not make someone vanish from the count.
  const listening = state === "playing" || state === "reconnecting";

  // Check in with the site while listening, and say so when stopping or
  // leaving. The site counts anyone who checked in recently.
  useEffect(() => {
    if (!listening) return;
    listenerRef.current ??= listenerId();
    const id = listenerRef.current;
    const checkIn = (playing: boolean, closing = false) => {
      const body = JSON.stringify({ id, playing });
      if (closing && typeof navigator.sendBeacon === "function") {
        navigator.sendBeacon("/api/listeners", body);
        return;
      }
      void fetch("/api/listeners", {
        method: "POST",
        body,
        keepalive: true,
        headers: { "Content-Type": "application/json" },
      }).catch(() => {});
    };
    checkIn(true);
    const timer = setInterval(() => checkIn(true), HEARTBEAT_MS);
    const leaving = () => checkIn(false, true);
    window.addEventListener("pagehide", leaving);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", leaving);
      checkIn(false, true);
    };
  }, [listening]);

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
  const playing = state === "playing";
  const nowPlaying = !status.configured
    ? "The radio has not been set up yet."
    : status.online
      ? status.title ?? "Live now"
      : "The radio cannot be reached right now.";
  const { song, artist } = status.online && status.title ? splitTitle(status.title) : { song: nowPlaying, artist: null };
  const listenersLine =
    status.online && status.listeners !== null
      ? `${status.listeners} ${status.listeners === 1 ? "person" : "people"} listening`
      : null;
  const stateLabel =
    state === "connecting"
      ? "Connecting…"
      : state === "reconnecting"
        ? "Reconnecting…"
        : playing
          ? "You are listening live"
          : "Tap to listen live";
  const tickerItems = [
    status.online ? `On air · ${nowPlaying}` : "In His Presence",
    "Live around the clock",
    "Church programmes most days",
    "Gospel music in between",
    ...(listenersLine ? [listenersLine] : []),
  ];
  const volumeFill = { "--fill": `${Math.round((muted ? 0 : volume) * 100)}%` } as CSSProperties;

  const playIcon = (size: string) =>
    busy ? (
      <Loader2 className={`${size} animate-spin`} aria-hidden />
    ) : playing ? (
      <Square className={`${size} fill-current`} aria-hidden />
    ) : (
      <Play className={`${size} ml-0.5 fill-current`} aria-hidden />
    );

  return (
    <>
      <OnAirTicker items={tickerItems} />

      <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-6 sm:px-6 sm:pt-10 lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-8 lg:px-8">
        {/* On wide screens the player stays in view while notes are written. */}
        <section className="relative isolate overflow-hidden rounded-[2rem] border border-sky-wash-200 bg-white/85 px-5 pb-7 pt-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_30px_80px_-30px_rgba(21,32,99,0.25)] sm:px-10 sm:pb-9 sm:pt-6 lg:sticky lg:top-24">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-3/4 bg-[radial-gradient(ellipse_at_50%_38%,rgba(226,180,87,0.16),transparent_65%)]"
            aria-hidden
          />
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

          <h1 className="sr-only">In His Presence, live radio from The Bride of Christ</h1>
          <div className="flex min-h-7 items-center justify-end">
            {status.configured &&
              (status.online ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-red-700">
                  <span className="relative flex h-1.5 w-1.5" aria-hidden>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75 motion-reduce:animate-none" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                  </span>
                  On air
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-wash-300 bg-sky-wash-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-navy-950/50">
                  <span className="h-1.5 w-1.5 rounded-full bg-navy-950/30" aria-hidden />
                  Off air
                </span>
              ))}
          </div>

          <div className="mt-5 flex justify-center sm:mt-6">
            <SignalDial playing={playing} />
          </div>

          <div className="mt-5 sm:mt-6" aria-live="polite">
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-gold-700">Now playing</p>
            <p className="mx-auto mt-2 line-clamp-2 max-w-md font-serif text-2xl font-medium leading-tight tracking-tight text-navy-950 sm:text-[1.9rem]">
              {song}
            </p>
            <p className="mx-auto mt-1.5 max-w-md truncate text-sm font-medium text-navy-950/60">
              {artist ?? "Live from The Bride of Christ"}
            </p>
            {listenersLine && <p className="mt-1 text-xs text-navy-950/45">{listenersLine}</p>}
          </div>

          {status.configured && (
            <div ref={controls} className="mt-6 flex flex-col items-center sm:mt-7">
              <button
                type="button"
                onClick={active ? stop : listen}
                aria-label={active ? "Stop listening" : "Listen live"}
                className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-navy-900 text-white shadow-[0_0_0_8px_rgba(226,180,87,0.22),0_18px_40px_rgba(21,32,99,0.3)] transition hover:bg-navy-800 active:scale-95"
              >
                {playIcon("h-7 w-7")}
              </button>
              <p className="mt-4 text-xs font-medium text-navy-950/55">{stateLabel}</p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-sky-wash-200 bg-sky-wash-50 p-1 sm:pr-4">
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={muted ? "Unmute" : "Mute"}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-navy-950/60 transition hover:bg-white hover:text-navy-950"
                >
                  {muted ? <VolumeX className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
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
                  style={volumeFill}
                  className="volume-range hidden w-32 sm:block"
                />
              </div>
            </div>
          )}

          {message && (
            <p
              role={state === "error" ? "alert" : "status"}
              className={`mx-auto mt-4 max-w-sm rounded-xl border px-3 py-2 text-xs font-medium ${state === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-sky-wash-200 bg-sky-wash-50 text-navy-950/70"}`}
            >
              {message}
            </p>
          )}
        </section>

        {children}
      </div>

      {/* The mini player, once the main controls have scrolled away. */}
      {status.configured && controlsPassed && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-sky-wash-200 bg-white/90 p-2 pr-2.5 shadow-[0_20px_50px_-10px_rgba(21,32,99,0.3)] backdrop-blur-xl">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-gold-400/60" aria-hidden>
              <Image src="/logo.png" alt="" fill sizes="44px" className="scale-[1.16] object-cover" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-semibold text-navy-950">{song}</p>
              <p className="truncate text-xs text-navy-950/55">
                {playing ? "Listening live" : busy ? stateLabel : artist ?? "In His Presence"}
                {playing && artist ? ` · ${artist}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={active ? stop : listen}
              aria-label={active ? "Stop listening" : "Listen live"}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy-900 text-white transition hover:bg-navy-800 active:scale-95"
            >
              {playIcon("h-4 w-4")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
