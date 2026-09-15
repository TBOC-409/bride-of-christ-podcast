"use client";

import { Check, Clock, Download, NotebookPen, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A private notepad for a listener to jot down what they hear.
 *
 * Notes stay in the listener's own browser and are never sent to the church.
 * That keeps it usable with no sign-in and nothing to administer, at the cost
 * of notes not following someone to another device. Listeners can save their
 * own notes to a file: the restriction is on the audio, not on their writing.
 */
export function PodcastNotepad({ sessionId, sessionTitle }: { sessionId: string; sessionTitle: string }) {
  const storageKey = `boc-podcast-notes-${sessionId}`;
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const area = useRef<HTMLTextAreaElement | null>(null);
  const loaded = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /**
   * Restore saved notes once the textarea mounts.
   *
   * Done in a ref callback rather than an effect: the server and the first
   * client render both produce an empty pad, so hydration matches, and the
   * stored text arrives immediately afterwards. Storage can also be
   * unavailable (private windows, blocked site data), and a notepad is a
   * convenience, so failing to reach it must never break the page.
   */
  const attachArea = useCallback((element: HTMLTextAreaElement | null) => {
    area.current = element;
    if (!element || loaded.current) return;
    loaded.current = true;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) setNotes(stored);
    } catch {
      /* start from an empty pad */
    }
  }, [storageKey]);

  const persist = useCallback((value: string) => {
    try {
      if (value) window.localStorage.setItem(storageKey, value);
      else window.localStorage.removeItem(storageKey);
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [storageKey]);

  function update(value: string) {
    setNotes(value);
    setSaved(false);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(value), 500);
  }

  // Don't lose the last few keystrokes if the tab closes mid-debounce.
  useEffect(() => {
    const flush = () => persist(area.current?.value ?? "");
    window.addEventListener("pagehide", flush);
    return () => { window.removeEventListener("pagehide", flush); clearTimeout(saveTimer.current); };
  }, [persist]);

  /** Drop the wall-clock time at the cursor, so a note can be found again later. */
  function stampTime() {
    const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const el = area.current;
    const at = el?.selectionStart ?? notes.length;
    const needsBreak = at > 0 && notes[at - 1] !== "\n";
    const insert = `${needsBreak ? "\n" : ""}[${stamp}] `;
    const next = notes.slice(0, at) + insert + notes.slice(at);
    update(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + insert.length, at + insert.length);
    });
  }

  function saveToFile() {
    const stamp = new Date().toISOString().slice(0, 10);
    const safeTitle = sessionTitle.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase();
    const blob = new Blob([`${sessionTitle}\n${stamp}\n\n${notes}\n`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeTitle || "session"}-notes-${stamp}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function clearNotes() {
    if (!window.confirm("Clear your notes for this session? This cannot be undone.")) return;
    update("");
    area.current?.focus();
  }

  const words = notes.trim() ? notes.trim().split(/\s+/).length : 0;

  return (
    <section className="site-liquid-glass rounded-2xl p-5 sm:rounded-3xl sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <NotebookPen className="h-5 w-5 text-sky-600" aria-hidden />
          Your notes
        </h2>
        <p aria-live="polite" className="text-xs font-medium text-slate-500">
          {saved ? <span className="inline-flex items-center gap-1 text-emerald-700"><Check className="h-3.5 w-3.5" aria-hidden />Saved</span> : notes ? "Typing…" : ""}
        </p>
      </div>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        Saved privately in this browser as you type. Only you can see them, and they stay on this device.
      </p>

      <label className="sr-only" htmlFor="podcast-notes">Your notes for this session</label>
      <textarea
        id="podcast-notes"
        ref={attachArea}
        value={notes}
        onChange={(event) => update(event.target.value)}
        rows={12}
        placeholder="Jot down what stands out as you listen…"
        className="mt-3 w-full resize-y rounded-xl border border-slate-200 bg-white/90 p-3 text-sm leading-6 text-slate-800 outline-none focus:border-sky-500"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={stampTime} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-sky-400 disabled:opacity-60">
          <Clock className="h-3.5 w-3.5" aria-hidden />Add time
        </button>
        <button type="button" onClick={saveToFile} disabled={!notes} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-sky-400 disabled:opacity-40">
          <Download className="h-3.5 w-3.5" aria-hidden />Save notes
        </button>
        <button type="button" onClick={clearNotes} disabled={!notes} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-red-700 hover:border-red-300 disabled:opacity-40">
          <Trash2 className="h-3.5 w-3.5" aria-hidden />Clear
        </button>
        <span className="ml-auto text-xs text-slate-400">{words} {words === 1 ? "word" : "words"}</span>
      </div>
    </section>
  );
}
