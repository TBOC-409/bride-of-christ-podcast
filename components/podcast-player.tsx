"use client";

import Image from "next/image";
import { ExternalLink, Headphones, Loader2, Play, Square, Tv, Volume2, VolumeX } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import type { StreamStatus } from "@/lib/icecast";
import { HEARTBEAT_MS } from "@/lib/listeners";
import { liveWatchUrl } from "@/lib/youtube";
import { YoutubeWatch } from "./youtube-watch";

/** How often "now playing" refreshes while the page is open. */
const POLL_MS = 20_000;
/** Reconnection attempts when the stream drops. */
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3_000;
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

/** Four bars beside the on-air badge, moving only while audio plays. */
function Equalizer() {
  return (
    <span className="eq" aria-hidden>
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

/** A station strip under the header, repeated so the loop reads continuously. */
function StationStrip({ items }: { items: string[] }) {
  const run = [...items, ...items, ...items];
  const group = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {run.map((item, index) => (
        <li key={index} className="flex items-center whitespace-nowrap">
          <span className="px-6">{item}</span>
          <span className="text-gold-600" aria-hidden>✦</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="border-b border-navy-950/[0.07] bg-white" aria-hidden>
      <div className="notice-ticker overflow-hidden py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-900/65">
        <div className="notice-track">
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
 * The player for the church's 24/7 radio: a broadcast band across the top of
 * the page, with the journal below it.
 *
 * The stream never stops: church programmes go out live, with music between
 * them. So there is no on air or off air, only what is playing now, which the
 * stream announces and this refreshes while the page is open.
 *
 * Controls are custom because the browser's own audio controls offer a
 * download, and the address is fetched when someone presses Listen rather than
 * written into the page. Neither stops a determined listener recording it.
 */
export function PodcastPlayer({
  initialStatus,
  stripLines,
  youtubeChannelId,
}: {
  initialStatus: StreamStatus;
  stripLines: string[];
  /** Null when no channel is set, which hides watching altogether. */
  youtubeChannelId: string | null;
}) {
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
  /** Listening to the radio, or watching the broadcast on YouTube. */
  const [mode, setMode] = useState<"listen" | "watch">("listen");
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

  // Only one of the two ever plays: starting the video stops the radio, so a
  // listener never hears the stream and the broadcast at once.
  function watch() {
    if (active) stop();
    setMode("watch");
  }

  function backToListening() {
    setMode("listen");
  }

  // The broadcast has finished. Rather than leave a dead player on screen, the
  // radio is brought back and started, since it never stops.
  function broadcastEnded() {
    setMode("listen");
    // After listen(), which clears any earlier message of its own.
    listen();
    setMessage("The live broadcast has ended. Back to the radio.");
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
  const stateLabel =
    state === "connecting" ? "Connecting…" : state === "reconnecting" ? "Reconnecting…" : playing ? "You are listening live" : "";
  const watching = mode === "watch";
  const volumeFill = { "--fill": `${Math.round((muted ? 0 : volume) * 100)}%` } as CSSProperties;

  const playIcon = (size: string) =>
    busy ? (
      <Loader2 className={`${size} animate-spin`} aria-hidden />
    ) : playing ? (
      <Square className={`${size} fill-current`} aria-hidden />
    ) : (
      <Play className={`${size} fill-current`} aria-hidden />
    );

  // What is playing leads; the rest is the church's own wording, set in the portal.
  const stripItems = [status.online ? `On air · ${nowPlaying}` : "In His Presence", ...stripLines];

  return (
    <>
      <StationStrip items={stripItems} />

      <section className="mx-auto max-w-6xl px-4 pt-7 sm:px-6 sm:pt-10 lg:px-8">
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

        <div className="relative overflow-hidden rounded-[30px] border border-navy-950/[0.07] bg-white p-7 shadow-[0_40px_90px_-50px_rgba(15,21,51,0.5)] sm:p-11">
          {/* A warm cast of light behind the artwork, so the card has depth. */}
          <div
            className="pointer-events-none absolute -right-28 -top-40 h-[520px] w-[520px] bg-[radial-gradient(circle_at_50%_50%,rgba(184,137,44,0.16),transparent_64%)]"
            aria-hidden
          />

          <div
            className={`relative flex flex-col items-center gap-7 text-center ${watching ? "" : "sm:flex-row sm:items-center sm:gap-9 sm:text-left"}`}
          >
            {watching && youtubeChannelId ? (
              <div className="w-full overflow-hidden rounded-[22px] bg-navy-950 ring-1 ring-navy-950/10">
                <YoutubeWatch channelId={youtubeChannelId} onEnded={broadcastEnded} />
              </div>
            ) : (
              <div className="relative h-[150px] w-[150px] shrink-0 overflow-hidden rounded-[26px] border border-navy-950/[0.08] bg-white shadow-[0_34px_70px_-34px_rgba(15,21,51,0.65)] sm:h-[212px] sm:w-[212px]">
                <Image src="/logo.png" alt="" fill priority sizes="212px" className="scale-[1.08] object-cover" />
              </div>
            )}

            <div className="flex min-w-0 flex-col gap-4" aria-live="polite">
              <div className="flex items-center justify-center gap-3 sm:justify-start">
                {status.configured &&
                  (status.online ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-red-700">
                      <span className="relative flex h-1.5 w-1.5" aria-hidden>
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75 motion-reduce:animate-none" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                      </span>
                      On air
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-haze-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-navy-950/50">
                      <span className="h-1.5 w-1.5 rounded-full bg-navy-950/30" aria-hidden />
                      Off air
                    </span>
                  ))}
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-navy-950/40">Now playing</span>
                {playing && <Equalizer />}
              </div>

              <p className="line-clamp-2 font-serif text-[1.75rem] font-medium leading-[1.08] tracking-[-0.01em] text-navy-950 sm:text-[2.5rem]">
                {song}
              </p>
              <p className="truncate text-sm text-navy-950/55 sm:text-base">
                {artist ?? "Live from The Bride of Christ"}
              </p>

              {youtubeChannelId && (
                <div className="inline-flex self-center rounded-full border border-navy-950/[0.1] bg-haze-50 p-1 sm:self-start">
                  <button
                    type="button"
                    onClick={backToListening}
                    aria-pressed={!watching}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-bold transition ${watching ? "text-navy-950/55 hover:text-navy-950" : "bg-navy-900 text-white"}`}
                  >
                    <Headphones className="h-3.5 w-3.5" aria-hidden />
                    Listen
                  </button>
                  <button
                    type="button"
                    onClick={watch}
                    aria-pressed={watching}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-bold transition ${watching ? "bg-navy-900 text-white" : "text-navy-950/55 hover:text-navy-950"}`}
                  >
                    <Tv className="h-3.5 w-3.5" aria-hidden />
                    Watch
                  </button>
                </div>
              )}

              {watching && youtubeChannelId ? (
                <a
                  href={liveWatchUrl(youtubeChannelId)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 self-center text-xs font-medium text-navy-950/55 transition hover:text-navy-900 sm:self-start"
                >
                  Open on YouTube
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              ) : null}

              {status.configured && !watching && (
                <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
                  <button
                    type="button"
                    onClick={active ? stop : listen}
                    className="inline-flex h-[54px] min-w-48 items-center justify-center gap-2.5 rounded-full bg-navy-900 px-7 text-[15px] font-bold text-white shadow-[0_20px_44px_-20px_rgba(22,32,94,0.75)] transition hover:bg-navy-800 active:scale-[0.98]"
                  >
                    {playIcon("h-4 w-4")}
                    {state === "connecting" ? "Connecting…" : state === "reconnecting" ? "Reconnecting…" : playing ? "Stop" : "Listen live"}
                  </button>

                  <div className="hidden items-center gap-3 sm:flex">
                    <button
                      type="button"
                      onClick={toggleMute}
                      aria-label={muted ? "Unmute" : "Mute"}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-navy-950/45 transition hover:bg-haze-100 hover:text-navy-950"
                    >
                      {muted ? <VolumeX className="h-[18px] w-[18px]" aria-hidden /> : <Volume2 className="h-[18px] w-[18px]" aria-hidden />}
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
                      className="volume-range w-[120px]"
                    />
                  </div>

                  {stateLabel && <p className="text-xs text-navy-950/45">{stateLabel}</p>}
                </div>
              )}

              {message && (
                <p
                  role={state === "error" ? "alert" : "status"}
                  className={`inline-block rounded-lg px-3 py-2 text-xs font-medium ${state === "error" ? "bg-red-50 text-red-700" : "bg-haze-100 text-navy-950/70"}`}
                >
                  {message}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* On phones the player stays within reach at the bottom, wherever the
          page is scrolled. Never while the video is showing, where it would
          start the radio over it. */}
      {status.configured && !watching && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-navy-950/[0.07] bg-white/95 p-2 pr-2.5 shadow-[0_22px_50px_-20px_rgba(15,21,51,0.6)] backdrop-blur-xl">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-navy-950/10" aria-hidden>
              <Image src="/logo.png" alt="" fill sizes="44px" className="scale-[1.08] object-cover" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-semibold text-navy-950">{song}</p>
              <p className="truncate text-xs text-navy-950/55">
                {playing ? "Listening live" : busy ? stateLabel || "Connecting…" : artist ?? "In His Presence"}
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
