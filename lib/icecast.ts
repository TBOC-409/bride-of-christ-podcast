/**
 * Reading the church's radio stream.
 *
 * One listening address, STREAM_URL, carries everything: live church programmes
 * and the music that plays between them. The stream is never meant to stop, so
 * there is no on air or off air, only whether it can be reached and what is
 * playing now. The site never needs a source or admin password; those belong
 * only in the broadcasting software.
 *
 * On a self-hosted Icecast both answers come from its status page
 * (/status-json.xsl), along with a listener count. Hosted services such as
 * Zeno.fm do not publish that page, so the site opens the stream itself,
 * confirms audio comes back, and reads the "now playing" text the stream
 * carries alongside the audio (ICY metadata).
 */

export type StreamStatus = {
  /** False until STREAM_URL is set on this site. */
  configured: boolean;
  /** The stream can be reached and is sending audio. */
  online: boolean;
  /** What is playing now, a programme or a song, as the stream announces it. */
  title: string | null;
  /** Only available from a self-hosted Icecast status page. */
  listeners: number | null;
  detectedBy: "status-page" | "stream" | null;
  checkedAt: string;
  /** Setup mistakes that stop the stream playing for some or all listeners. */
  problems: string[];
};

export type IcecastSource = {
  listenurl?: string;
  title?: string;
  server_name?: string;
  server_type?: string;
  listeners?: number;
};

const STATUS_TIMEOUT_MS = 4_000;
/** Long enough to receive the first title, which arrives after about a second of audio. */
const PROBE_TIMEOUT_MS = 7_000;
/** Titles change every few minutes; Icecast only needs asking every few seconds. */
const CACHE_MS = 10_000;
/** A metadata block can be at most 255 x 16 bytes. */
const MAX_METADATA_BYTES = 255 * 16;

/** Values Icecast reports when the broadcaster never named the stream. */
const PLACEHOLDER_TITLES = new Set(["", "-", "unspecified name", "unspecified description", "no name", "untitled"]);

export function streamUrl(): string | null {
  return process.env.STREAM_URL?.trim() || null;
}

/** The mount path of an address, e.g. "/live", or null when there is none. */
export function mountOf(address: string): string | null {
  try {
    const path = new URL(address).pathname.replace(/\/+$/, "");
    return path || null;
  } catch {
    return null;
  }
}

export function statusUrlFor(stream: string): string {
  const override = process.env.STATUS_URL?.trim();
  if (override) return override;
  return `${new URL(stream).origin}/status-json.xsl`;
}

/**
 * The source for our mount on an Icecast status page, if it is listed.
 *
 * Icecast returns `source` as a single object when one mount is live, an array
 * when several are, and leaves it out when none are. Mounts are matched by path
 * only, because Icecast reports its own internal hostname and port in
 * `listenurl`, which rarely matches the public address listeners use.
 */
export function liveSourceFor(payload: unknown, stream: string): IcecastSource | null {
  const raw = (payload as { icestats?: { source?: unknown } } | null)?.icestats?.source;
  const sources = (Array.isArray(raw) ? raw : raw ? [raw] : []) as IcecastSource[];
  const mount = mountOf(stream);
  if (!mount) return null;
  return sources.find((source) => typeof source?.listenurl === "string" && mountOf(source.listenurl) === mount) ?? null;
}

/** Web address endings song-download sites use. Kept to real ones, so a title
 * like "Hymn | St.Anne" is not mistaken for a website. */
const SITE_ENDING = "(?:com|net|org|gh|ng|co|io|fm|info|biz|me|tv|uk|africa)";
/** "[www.site.com]" or "(site.net)" anywhere in the title. */
const BRACKETED_SITE = new RegExp(
  `\\s*[[(][^\\])]*(?:www\\.|https?:\\/\\/|\\.${SITE_ENDING}\\b)[^\\])]*[\\])]\\s*`,
  "gi",
);
/** " | www.site.net" or " - site.com" at the end of the title. */
const SEPARATED_SITE = new RegExp(
  `\\s*(?:[|•~/–—-]|::)\\s*(?:https?:\\/\\/)?(?:www\\.)?[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.${SITE_ENDING}\\b\\S*\\s*$`,
  "i",
);
/** A bare " www.site.gh" at the end, with no separator. */
const BARE_SITE = new RegExp(`\\s+(?:https?:\\/\\/)?www\\.\\S+\\s*$`, "i");

/** A raw audio file name, e.g. "enough is enough nana bonsu.wma". */
const AUDIO_FILE = /\.(?:mp3|wma|m4a|aac|wav|flac|ogg|opus|amr)\s*$/i;
/** Leading track numbers in a file name: "04 04 ", "01. ", "1-". */
const TRACK_NUMBERS = /^(?:\d{1,3}(?:\s*[.)\-–_]\s*|\s+))+/;

/** Short words kept lower case inside a title, as in "Rock of Ages". */
const MINOR_WORDS = new Set(["a", "an", "and", "at", "by", "for", "in", "of", "on", "or", "the", "to", "with"]);

/**
 * Song files are often named all in lower case, such as "enough is enough nana
 * bonsu". Those get ordinary title capitals. A title with any capital letters
 * is left exactly as the broadcaster wrote it.
 */
export function capitaliseTitle(title: string): string {
  if (title !== title.toLowerCase() || title === title.toUpperCase()) return title;
  return title.replace(/\S+/g, (word, offset: number) =>
    offset > 0 && MINOR_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1),
  );
}

/**
 * A title fit to show listeners.
 *
 * Song files often carry the website they were downloaded from, as in
 * "Ernest Opoku Junior - My Season [www.ghanagospelsongs.com]" or
 * "Piesie Esther - Wayε Me Yie | www.ndwompafie.net", both seen on this stream.
 * Those tags are removed, spacing is tidied, and Icecast's placeholder names are
 * hidden. Credits such as "(feat. ...)" and "(Live)" are kept.
 */
export function tidyTitle(text: string | null | undefined): string | null {
  if (typeof text !== "string") return null;
  let tidy = text.replace(BRACKETED_SITE, " ").replace(SEPARATED_SITE, "").replace(BARE_SITE, "").trim();

  // Some tracks announce their raw file name. Only then are leading numbers
  // treated as track numbers, so a programme such as "2 Chronicles 7:14 Prayer"
  // keeps its number.
  if (AUDIO_FILE.test(tidy)) {
    tidy = tidy.replace(AUDIO_FILE, "").replace(/_/g, " ").trim().replace(TRACK_NUMBERS, "");
    if (/^\d+$/.test(tidy.trim())) return null;
  }

  tidy = tidy.replace(/\s+/g, " ").replace(/\s+-\s*$/, "").trim();
  if (PLACEHOLDER_TITLES.has(tidy.toLowerCase())) return null;
  return capitaliseTitle(tidy).slice(0, 200);
}

export function cleanTitle(source: IcecastSource | null): string | null {
  return tidyTitle(source?.title) ?? tidyTitle(source?.server_name);
}

/**
 * The StreamTitle value from an ICY metadata block, such as
 * StreamTitle='God's Love - Choir';StreamUrl='';
 *
 * Titles can contain apostrophes, so the value runs to the next "';" rather
 * than to the next quote.
 */
export function parseIcyTitle(block: string): string | null {
  const marker = "StreamTitle='";
  const start = block.indexOf(marker);
  if (start === -1) return null;
  const from = start + marker.length;
  const end = block.indexOf("';", from);
  return end === -1 ? block.slice(from).replace(/'\s*$/, "") : block.slice(from, end);
}

/** Plain-language setup problems for the stream address and format. */
export function problemsWith(stream: string, format?: string | null): string[] {
  const problems: string[] = [];
  let url: URL;
  try {
    url = new URL(stream);
  } catch {
    return ["The stream address is not a valid web address."];
  }
  if (url.protocol === "http:") {
    problems.push(
      "The stream uses http://. Browsers will not play it inside an HTTPS website, so most listeners will hear nothing. Use the HTTPS listening address.",
    );
  }
  if (!mountOf(stream)) {
    problems.push(
      "The stream address has no mount name, so it points at the server rather than the audio. Use the full listening address.",
    );
  }
  if (format && /ogg|opus|vorbis/i.test(format)) {
    problems.push(
      "The stream is Ogg or Opus, which iPhones and Safari cannot play. Broadcast MP3 or AAC so every listener can hear it.",
    );
  }
  return problems;
}

/**
 * Read the first "now playing" title from a stream that was requested with
 * Icy-MetaData: 1. The server sends `icy-metaint` bytes of audio, then one
 * length byte (times 16), then the metadata text.
 */
export async function readIcyTitle(response: Response): Promise<string | null> {
  const metaint = Number(response.headers.get("icy-metaint"));
  if (!Number.isInteger(metaint) || metaint <= 0 || metaint > 256_000 || !response.body) return null;
  const reader = response.body.getReader();
  let buffered = new Uint8Array(0);
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done || !value) return null;
      const merged = new Uint8Array(buffered.length + value.length);
      merged.set(buffered);
      merged.set(value, buffered.length);
      buffered = merged;
      if (buffered.length <= metaint) continue;
      const length = buffered[metaint] * 16;
      if (length === 0) return null;
      if (buffered.length < metaint + 1 + length) {
        if (buffered.length > metaint + 1 + MAX_METADATA_BYTES) return null;
        continue;
      }
      const block = new TextDecoder().decode(buffered.subarray(metaint + 1, metaint + 1 + length)).replace(/\0+$/, "");
      return tidyTitle(parseIcyTitle(block));
    }
  } catch {
    return null;
  } finally {
    reader.cancel().catch(() => {});
  }
}

async function probeStream(stream: string): Promise<{ online: boolean; format: string | null; title: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(stream, {
      signal: controller.signal,
      cache: "no-store",
      headers: { "Icy-MetaData": "1" },
    });
    const format = response.headers.get("content-type");
    const online = response.ok && /^(audio\/|application\/ogg)/i.test(format ?? "");
    const title = online ? await readIcyTitle(response) : null;
    return { online, format, title };
  } catch {
    return { online: false, format: null, title: null };
  } finally {
    clearTimeout(timer);
    // Stop downloading audio as soon as the question is answered.
    controller.abort();
  }
}

/** Ask the stream directly, with no caching. Never throws. */
export async function readStreamStatus(): Promise<StreamStatus> {
  const checkedAt = new Date().toISOString();
  const stream = streamUrl();
  if (!stream) {
    return { configured: false, online: false, title: null, listeners: null, detectedBy: null, checkedAt, problems: [] };
  }

  const addressProblems = problemsWith(stream);
  if (addressProblems.some((problem) => problem.includes("not a valid"))) {
    return { configured: true, online: false, title: null, listeners: null, detectedBy: null, checkedAt, problems: addressProblems };
  }

  try {
    const response = await fetch(statusUrlFor(stream), {
      cache: "no-store",
      signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
    });
    if (response.ok) {
      const source = liveSourceFor(await response.json(), stream);
      if (source) {
        return {
          configured: true,
          online: true,
          title: cleanTitle(source),
          listeners: typeof source.listeners === "number" ? source.listeners : null,
          detectedBy: "status-page",
          checkedAt,
          problems: problemsWith(stream, source.server_type),
        };
      }
      // Not listed. Music between programmes is often served from a fallback
      // mount, which the status page does not show under ours, so the stream
      // itself decides.
    }
  } catch {
    // No status page (as on Zeno.fm), unreachable, or the broken JSON older
    // Icecast versions return when a title contains quotes.
  }

  const probe = await probeStream(stream);
  return {
    configured: true,
    online: probe.online,
    title: probe.title,
    listeners: null,
    detectedBy: "stream",
    checkedAt,
    problems: problemsWith(stream, probe.format),
  };
}

let latest: StreamStatus | null = null;
let refreshedAt = 0;
let refreshing: Promise<StreamStatus> | null = null;

/**
 * The stream's status, checked at most every few seconds.
 *
 * Once a first answer exists it is returned straight away while a fresh one is
 * fetched in the background, so a visitor never waits on the stream to load
 * the page. Only the very first request waits.
 */
export function getStreamStatus(): Promise<StreamStatus> {
  if (Date.now() - refreshedAt >= CACHE_MS && !refreshing) {
    refreshing = readStreamStatus().then((value) => {
      latest = value;
      refreshedAt = Date.now();
      refreshing = null;
      return value;
    });
  }
  return latest ? Promise.resolve(latest) : (refreshing as Promise<StreamStatus>);
}
