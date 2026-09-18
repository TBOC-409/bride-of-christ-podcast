"use client";

import { Check, Download, LockKeyhole, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { NOTE_PREFIX, dayKey, dayLabel, isDayKey, longDayLabel } from "@/lib/days";

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

  function saveToFile() {
    const blob = new Blob([`In His Presence · The Bride of Christ\n${dayLabel(day, today)} (${day})\n\n${notes}\n`], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `in-his-presence-notes-${day}.txt`;
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
    <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="rounded-[30px] border border-navy-950/[0.07] bg-white p-7 shadow-[0_40px_90px_-60px_rgba(15,21,51,0.5)] sm:p-9">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-navy-950/40">Listening journal</p>
          <h2 className="mt-1.5 font-serif text-2xl font-medium leading-tight tracking-tight sm:text-3xl">
            {longDayLabel(day)}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <p aria-live="polite" className="mr-1 text-xs font-medium text-navy-950/50">
            {saved ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <Check className="h-3.5 w-3.5" aria-hidden />Saved
              </span>
            ) : notes ? (
              "Writing…"
            ) : (
              ""
            )}
          </p>
          <label className="sr-only" htmlFor="notes-day">Choose which day&apos;s notes to show</label>
          <select
            id="notes-day"
            value={day}
            onChange={(event) => openDay(event.target.value)}
            className="h-9 rounded-lg border border-navy-950/[0.12] bg-white pl-3 pr-2 text-xs font-semibold text-navy-900 outline-none transition focus:border-navy-900/40 focus:ring-4 focus:ring-navy-900/5"
          >
            {choices.map((choice) => (
              <option key={choice} value={choice}>
                {dayLabel(choice, today)}
                {choice !== today && !days.includes(choice) ? " (empty)" : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={saveToFile}
            disabled={!notes}
            title="Save these notes to a file"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-navy-950/[0.12] bg-white px-3 text-xs font-semibold text-navy-900 transition hover:border-navy-900/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />Save
          </button>
          <button
            type="button"
            onClick={deleteDay}
            disabled={!notes}
            aria-label="Delete these notes"
            title="Delete these notes"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-navy-950/[0.12] bg-white text-navy-950/55 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-navy-950/[0.09] bg-haze-50 transition focus-within:border-navy-900/30 focus-within:ring-4 focus-within:ring-navy-900/5">
        <label className="sr-only" htmlFor="podcast-notes">Your notes</label>
        <textarea
          id="podcast-notes"
          ref={attachArea}
          value={notes}
          onChange={(event) => update(event.target.value)}
          placeholder="Write down what speaks to you as you listen…"
          className="block min-h-[22rem] w-full resize-y bg-transparent p-5 text-[15px] leading-[1.9] text-navy-950 outline-none placeholder:text-navy-950/35 sm:min-h-[26rem] sm:p-7 sm:text-base"
        />
        <div className="flex items-center justify-between gap-3 border-t border-navy-950/[0.08] bg-white px-5 py-3 text-xs text-navy-950/50 sm:px-7">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-gold-600" aria-hidden />
            <span className="truncate">
              Private to this browser<span className="hidden sm:inline"> · a fresh page each day</span>
            </span>
          </span>
          <span className="shrink-0 tabular-nums">
            {words} {words === 1 ? "word" : "words"}
          </span>
        </div>
      </div>
      </div>
    </section>
  );
}
