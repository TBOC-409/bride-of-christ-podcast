"use client";

import { useEffect, useRef } from "react";
import { videoEmbedUrl } from "@/lib/youtube";

/** YouTube's player API, which reports when the broadcast stops. */
type YouTubePlayer = { destroy: () => void };
type YouTubeApi = {
  Player: new (element: Element, options: { events: { onStateChange: (event: { data: number }) => void } }) => YouTubePlayer;
  PlayerState: { ENDED: number };
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const API_SRC = "https://www.youtube.com/iframe_api";

/**
 * Load YouTube's player API once per page. It announces itself through a single
 * global callback, so any earlier one is kept and called too.
 */
function loadPlayerApi(): Promise<YouTubeApi | null> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT ?? null);
    };
    if (!document.querySelector(`script[src="${API_SRC}"]`)) {
      const script = document.createElement("script");
      script.src = API_SRC;
      script.async = true;
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    }
  });
}

/**
 * The live broadcast, in YouTube's own player, so views and live viewers count
 * on YouTube as they always have.
 *
 * When the broadcast ends the player says so, and onEnded hands the listener
 * back to the radio rather than leaving them on a finished stream. If YouTube's
 * API cannot be reached the video still plays; only that handover is lost.
 */
export function YoutubeWatch({ videoId, onEnded }: { videoId: string; onEnded: () => void }) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const ended = useRef(onEnded);

  useEffect(() => {
    ended.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    let player: YouTubePlayer | undefined;
    let cancelled = false;
    void loadPlayerApi().then((api) => {
      if (cancelled || !api || !frame.current) return;
      player = new api.Player(frame.current, {
        events: {
          onStateChange: (event) => {
            if (event.data === api.PlayerState.ENDED) ended.current();
          },
        },
      });
    });
    return () => {
      cancelled = true;
      try {
        player?.destroy();
      } catch {
        /* the player is already gone */
      }
    };
  }, []);

  return (
    <iframe
      ref={frame}
      title="The Bride of Christ live on YouTube"
      src={`${videoEmbedUrl(videoId)}&enablejsapi=1`}
      allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      className="aspect-video w-full"
    />
  );
}
