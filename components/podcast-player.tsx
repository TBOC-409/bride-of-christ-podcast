"use client";

import { Loader2, Pause, Play, Radio, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "connecting" | "playing" | "error";

/**
 * Listener side of a live Icecast session.
 *
 * Controls are custom rather than the browser's own, because the native audio
 * element carries a download item in its overflow menu. The mount URL is also
 * fetched at the moment of play instead of being rendered into the page, so it
 * is not sitting in view-source.
 *
 * Neither measure is real protection: an Icecast mount is a plain HTTP stream,
 * and anyone who opens the network tab can still capture it. They stop casual
 * copying, nothing more.
 */
export function PodcastPlayer({ sessionId, isLive }: { sessionId: string; isLive: boolean }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.9);

  const stop = useCallback(() => {
    const element = audio.current;
    if (!element) return;
    element.pause();
    // Dropping the source closes the connection to Icecast rather than leaving
    // it buffering in the background while nobody listens.
    element.removeAttribute("src");
    element.load();
    setStatus("idle");
  }, []);

  // A live stream has no meaningful position, so leaving the page is a stop.
  useEffect(() => stop, [stop]);

  async function play() {
    setStatus("connecting");
    setMessage("");
    try {
      const response = await fetch(`/api/sessions/${sessionId}/stream`, { cache: "no-store" });
      const body = await response.json().catch(() => ({})) as { url?: string; error?: string };
      if (!response.ok || !body.url) {
        setStatus("error");
        setMessage(body.error ?? "This session is not live right now.");
        return;
      }
      const element = audio.current;
      if (!element) return;
      // A cache-busting suffix stops a browser replaying a stale buffer from an
      // earlier connection to the same mount.
      element.src = `${body.url}${body.url.includes("?") ? "&" : "?"}t=${Date.now()}`;
      element.volume = volume;
      element.muted = muted;
      await element.play();
      setStatus("playing");
    } catch {
      setStatus("error");
      setMessage("Could not connect to the live audio. Please try again.");
    }
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

  const busy = status === "connecting";

  return (
    <div>
      <audio
        ref={audio}
        preload="none"
        controlsList="nodownload noplaybackrate"
        onContextMenu={(event) => event.preventDefault()}
        onStalled={() => setMessage("Buffering…")}
        onPlaying={() => { setStatus("playing"); setMessage(""); }}
        onError={() => {
          if (status === "idle") return;
          setStatus("error");
          setMessage("The audio stream dropped. Press play to reconnect.");
        }}
      />

      {!isLive ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The session is not live yet. When it starts, the player appears here.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={status === "playing" ? stop : play}
              disabled={busy}
              aria-label={status === "playing" ? "Stop listening" : "Listen live"}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-sky-600 px-5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                : status === "playing" ? <Pause className="h-4 w-4" aria-hidden />
                  : <Play className="h-4 w-4" aria-hidden />}
              {busy ? "Connecting…" : status === "playing" ? "Stop" : "Listen live"}
            </button>

            {status === "playing" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-red-700">
                <Radio className="h-3.5 w-3.5 animate-pulse" aria-hidden />On air
              </span>
            )}

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

          {message && (
            <p role={status === "error" ? "alert" : "status"} className={`mt-3 rounded-xl border px-3 py-2 text-xs font-medium ${status === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
              {message}
            </p>
          )}
        </>
      )}
    </div>
  );
}
