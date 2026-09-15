"use client";

import { Check, Clock, Download, NotebookPen, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { NOTE_PREFIX, dayKey, dayLabel, isDayKey } from "@/lib/days";

/** Every day that has notes saved in this browser, newest first. */
function storedDays(): string[] {
  const days: string[] = [];
  for (let index = 0; index < window.localStorage.length; index++) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(NOTE_PREFIX)) continue;
    const day = key.slice(NOTE_PREFIX.length);
    if (isDayKey(day) && window.localStorage.getItem(key)) days.push(day);
  }
  return days.sort().reverse();
}

/**
 * A private notepad with a fresh page for each day's programme.
 *
 * Notes stay in the listener's own browser and never reach the church, so there
 * is no sign-in and nothing to administer. Earlier days remain available to
 * reopen, save to a file or delete.
 */
export function PodcastNotepad() {
  const [today] = useState(dayKey);
  const [day, setDay] = useState(today);
  const [notes, setNotes] = useState("");
  const [days, setDays] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const area = useRef<HTMLTextAreaElement | null>(null);
  const loaded = useRef(false);
  const currentDay = useRef(today);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /**
   * Load saved notes once the textarea mounts. A ref callback rather than an
   * effect: server and first client render both show an empty pad, so hydration
   * matches, and storage may be unavailable, which must not break the page.
   */
  const attachArea = useCallback(
    (element: HTMLTextAreaElement | null) => {
      area.current = element;
      if (!element || loaded.current) return;
      loaded.current = true;
      try {
        setDays(storedDays());
        setNotes(window.localStorage.getItem(NOTE_PREFIX + today) ?? "");
      } catch {
        /* storage unavailable: start with an empty pad */
      }
    },
    [today],
  );

  const persist = useCallback((target: string, value: string) => {
    try {
      const key = NOTE_PREFIX + target;
      if (value.trim()) window.localStorage.setItem(key, value);
      else window.localStorage.removeItem(key);
      setDays(storedDays());
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, []);

  // Keep the last keystrokes if the tab closes mid-save. Only once notes have
  // loaded, or an empty pad could overwrite a day that was never opened.
  useEffect(() => {
    const flush = () => {
      if (loaded.current && area.current) persist(currentDay.current, area.current.value);
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [persist]);

  function update(value: string) {
    setNotes(value);
    setSaved(false);
    clearTimeout(saveTimer.current);
    const target = currentDay.current;
    saveTimer.current = setTimeout(() => persist(target, value), 500);
  }

  function openDay(next: string) {
    if (next === currentDay.current) return;
    clearTimeout(saveTimer.current);
    if (area.current) persist(currentDay.current, area.current.value);
    currentDay.current = next;
    setDay(next);
    setSaved(false);
    try {
      setNotes(window.localStorage.getItem(NOTE_PREFIX + next) ?? "");
    } catch {
      setNotes("");
    }
  }

  function stampTime() {
    const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const element = area.current;
    const at = element?.selectionStart ?? notes.length;
    const needsBreak = at > 0 && notes[at - 1] !== "\n";
    const insert = `${needsBreak ? "\n" : ""}[${stamp}] `;
    update(notes.slice(0, at) + insert + notes.slice(at));
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(at + insert.length, at + insert.length);
    });
  }

  function saveToFile() {
    const blob = new Blob([`The Bride of Christ Podcast\n${dayLabel(day, today)} (${day})\n\n${notes}\n`], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `podcast-notes-${day}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function deleteDay() {
    if (!window.confirm(`Delete your notes for ${dayLabel(day, today).toLowerCase()}? This cannot be undone.`)) return;
    clearTimeout(saveTimer.current);
    try {
      window.localStorage.removeItem(NOTE_PREFIX + day);
    } catch {
      /* nothing stored to remove */
    }
    setNotes("");
    setSaved(false);
    try {
      setDays(storedDays());
    } catch {
      setDays([]);
    }
    area.current?.focus();
  }

  const choices = Array.from(new Set([today, day, ...days])).sort().reverse();
  const words = notes.trim() ? notes.trim().split(/\s+/).length : 0;

  return (
    <section className="site-liquid-glass rounded-3xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-base font-semibold text-slate-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
            <NotebookPen className="h-[18px] w-[18px]" aria-hidden />
          </span>
          Your notes
        </h2>
        <p aria-live="polite" className="text-xs font-medium text-slate-500">
          {saved ? (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <Check className="h-3.5 w-3.5" aria-hidden />Saved
            </span>
          ) : notes ? (
            "Typing…"
          ) : (
            ""
          )}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <label className="sr-only" htmlFor="notes-day">Choose which day&apos;s notes to show</label>
        <select
          id="notes-day"
          value={day}
          onChange={(event) => openDay(event.target.value)}
          className="min-h-10 rounded-full border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
        >
          {choices.map((choice) => (
            <option key={choice} value={choice}>
              {dayLabel(choice, today)}
              {choice !== today && !days.includes(choice) ? " (empty)" : ""}
            </option>
          ))}
        </select>
        <span className="text-xs leading-5 text-slate-500">Private to this browser. A fresh page each day.</span>
      </div>

      <label className="sr-only" htmlFor="podcast-notes">Your notes</label>
      <textarea
        id="podcast-notes"
        ref={attachArea}
        value={notes}
        onChange={(event) => update(event.target.value)}
        placeholder="Jot down what stands out as you listen…"
        className="mt-3 min-h-56 w-full resize-y rounded-2xl border border-slate-200 bg-white/90 p-4 text-[15px] leading-7 text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 sm:min-h-72"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={stampTime} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-sky-50 px-3 text-xs font-semibold text-sky-800 transition hover:bg-sky-100">
          <Clock className="h-3.5 w-3.5" aria-hidden />Add time
        </button>
        <button type="button" onClick={saveToFile} disabled={!notes} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-sky-300 disabled:cursor-not-allowed disabled:opacity-50">
          <Download className="h-3.5 w-3.5" aria-hidden />Save notes
        </button>
        <button type="button" onClick={deleteDay} disabled={!notes} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-red-700 transition hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-50">
          <Trash2 className="h-3.5 w-3.5" aria-hidden />Delete
        </button>
        {/* Its own line on phones, so the three buttons keep to one row. */}
        <span className="basis-full text-right text-xs tabular-nums text-slate-400 sm:ml-auto sm:basis-auto">
          {words} {words === 1 ? "word" : "words"}
        </span>
      </div>
    </section>
  );
}
