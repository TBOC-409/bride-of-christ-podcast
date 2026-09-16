"use client";

import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISSED_KEY = "boc-podcast-install-dismissed-at";
/** A dismissed banner comes back after two weeks, in case it was closed by accident. */
const REMIND_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function isIosDevice(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function dismissedRecently(): boolean {
  try {
    const at = Number(window.localStorage.getItem(DISMISSED_KEY));
    return at > 0 && Date.now() - at < REMIND_AFTER_MS;
  } catch {
    return false;
  }
}

/**
 * Lets members install the radio as an app, mirroring the portal's prompt.
 *
 * Renders a small Install app button, meant for the header so it is always
 * findable, plus a dismissible banner. Android and desktop browsers offer a
 * native install dialog; iPhones do not, so there the banner explains Add to
 * Home Screen instead. Nothing shows once the app is already installed.
 */
export function InstallApp() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [standalone, setStandalone] = useState(true);
  const [bannerHidden, setBannerHidden] = useState(true);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setStandalone(isStandalone());
      setIos(isIosDevice());
      setBannerHidden(dismissedRecently());
    });

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }

    function onBeforeInstall(event: Event) {
      // Keep the browser's own mini prompt from appearing; ours is shown instead.
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    }

    function onInstalled() {
      setStandalone(true);
      setInstallPrompt(null);
      try {
        window.localStorage.removeItem(DISMISSED_KEY);
      } catch {
        /* nothing to clear */
      }
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone || (!installPrompt && !ios)) return null;

  async function install() {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallPrompt(null);
        setStandalone(true);
      }
      return;
    }
    // iPhones have no install dialog; show how to add it by hand.
    setShowIosHelp(true);
    setBannerHidden(false);
  }

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      /* the banner simply returns next visit */
    }
    setBannerHidden(true);
    setShowIosHelp(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={install}
        className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-navy-900/15 bg-white/70 px-3.5 text-xs font-semibold text-navy-900 transition hover:border-gold-500"
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        Install app
      </button>

      {/* Rendered straight into the body: the header's blur effect would
          otherwise pin this "fixed" banner to the header instead of the screen. */}
      {!bannerHidden && createPortal(
        <aside className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-sm rounded-2xl border border-sky-wash-200 bg-white/95 p-4 shadow-[0_20px_50px_-10px_rgba(21,32,99,0.3)] backdrop-blur-xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:mx-0">
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss install prompt"
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-navy-950/40 transition hover:bg-sky-wash-100 hover:text-navy-950"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
          <div className="flex gap-3 pr-7">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-400/20 text-gold-700">
              <Download className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-navy-950">Install the radio app</p>
              <p className="mt-1 text-xs leading-5 text-navy-950/55">
                Listen with one tap from your home screen, like any other app.
              </p>
            </div>
          </div>
          {showIosHelp ? (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-sky-wash-100 p-3 text-xs leading-5 text-navy-950/75">
              <Share className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Tap the Share button in your browser, then choose “Add to Home Screen”.
            </p>
          ) : (
            <button
              type="button"
              onClick={install}
              className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800"
            >
              Install app
            </button>
          )}
        </aside>,
        document.body,
      )}
    </>
  );
}
