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
    <section className="rounded-[2rem] border border-sky-wash-200 bg-white/85 p-5 text-navy-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_30px_80px_-30px_rgba(21,32,99,0.25)] sm:p-7">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold-700">Listening journal</p>
      <h2 className="mt-1.5 font-serif text-2xl font-medium leading-tight tracking-tight sm:text-[1.75rem]">
        {longDayLabel(day)}
      </h2>

      {/* The page itself: a toolbar, the ruled sheet, and a status line. */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-sky-wash-200 bg-sky-wash-50 transition focus-within:border-gold-500 focus-within:ring-4 focus-within:ring-gold-400/20">
        <div className="flex items-center justify-between gap-3 border-b border-sky-wash-200 bg-white/80 px-3 py-2">
          <label className="sr-only" htmlFor="notes-day">Choose which day&apos;s notes to show</label>
          <select
            id="notes-day"
            value={day}
            onChange={(event) => openDay(event.target.value)}
            className="min-h-8 rounded-full border border-sky-wash-300 bg-white pl-3 pr-2 text-xs font-semibold text-navy-900 outline-none focus:border-gold-500"
          >
            {choices.map((choice) => (
              <option key={choice} value={choice}>
                {dayLabel(choice, today)}
                {choice !== today && !days.includes(choice) ? " (empty)" : ""}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1.5">
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
            <button
              type="button"
              onClick={saveToFile}
              disabled={!notes}
              title="Save these notes to a file"
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-sky-wash-300 bg-white px-3 text-xs font-semibold text-navy-900 transition hover:border-gold-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />Save
            </button>
            <button
              type="button"
              onClick={deleteDay}
              disabled={!notes}
              aria-label="Delete these notes"
              title="Delete these notes"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-wash-300 bg-white text-navy-950/55 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>

        <label className="sr-only" htmlFor="podcast-notes">Your notes</label>
        <textarea
          id="podcast-notes"
          ref={attachArea}
          value={notes}
          onChange={(event) => update(event.target.value)}
          placeholder="Write down what speaks to you as you listen…"
          className="journal-lines block min-h-64 w-full resize-y bg-transparent text-base text-navy-950 outline-none placeholder:italic placeholder:text-navy-950/35 sm:min-h-80"
        />

        <div className="flex items-center justify-between gap-3 border-t border-sky-wash-200 bg-white/80 px-3 py-2 text-xs text-navy-950/50">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-gold-600" aria-hidden />
            <span className="truncate">
              Private to this browser<span className="hidden sm:inline"> · a fresh page each day</span>
            </span>
          </span>
          <span className="shrink-0 font-serif italic tabular-nums">
            {words} {words === 1 ? "word" : "words"}
          </span>
        </div>
      </div>
    </section>
  );
}
