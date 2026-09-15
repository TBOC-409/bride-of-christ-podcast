/**
 * Reading the church's Icecast stream.
 *
 * There is one listening address for every programme, set as STREAM_URL. The
 * site never needs Icecast's source or admin password: those belong only in
 * the broadcasting software.
 *
 * Whether something is on air comes from Icecast itself. Its status page
 * (/status-json.xsl) lists every mount a broadcaster is currently connected
 * to. Some hosts switch that page off, so when it cannot be read the site falls
 * back to opening the stream and checking audio actually comes back.
 */

export type StreamStatus = {
  /** False until STREAM_URL is set on this site. */
  configured: boolean;
  live: boolean;
  /** The programme title the broadcasting software sends, when it sends one. */
  title: string | null;
  listeners: number | null;
  detectedBy: "status-page" | "connection-test" | null;
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
const PROBE_TIMEOUT_MS = 5_000;
/** Many listeners poll at once; Icecast only needs asking every few seconds. */
const CACHE_MS = 10_000;

/** Values Icecast reports when the broadcaster never named the stream. */
const PLACEHOLDER_TITLES = new Set(["", "unspecified name", "unspecified description", "no name", "untitled"]);

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
 * The live source for our mount, if a broadcaster is connected to it.
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

export function cleanTitle(source: IcecastSource | null): string | null {
  for (const candidate of [source?.title, source?.server_name]) {
    const text = typeof candidate === "string" ? candidate.trim() : "";
    if (text && !PLACEHOLDER_TITLES.has(text.toLowerCase())) return text.slice(0, 200);
  }
  return null;
}

/** Plain-language setup problems for the stream address and format. */
export function problemsWith(stream: string, format?: string | null): string[] {
  const problems: string[] = [];
  let url: URL | null = null;
  try {
    url = new URL(stream);
  } catch {
    return ["The stream address is not a valid web address."];
  }
  if (url.protocol === "http:") {
    problems.push(
      "The stream uses http://. Browsers will not play it inside an HTTPS website, so most listeners will hear nothing. The Icecast server needs HTTPS.",
    );
  }
  if (!mountOf(stream)) {
    problems.push(
      "The stream address has no mount name, so it points at the Icecast server rather than the audio. Add the mount, for example /live.",
    );
  }
  if (format && /ogg|opus|vorbis/i.test(format)) {
    problems.push(
      "The stream is Ogg or Opus, which iPhones and Safari cannot play. Broadcast MP3 or AAC so every listener can hear it.",
    );
  }
  return problems;
}

async function probeStream(stream: string): Promise<{ live: boolean; format: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(stream, {
      signal: controller.signal,
      cache: "no-store",
      headers: { "Icy-MetaData": "0" },
    });
    const format = response.headers.get("content-type");
    const live = response.ok && /^(audio\/|application\/ogg)/i.test(format ?? "");
    return { live, format };
  } catch {
    return { live: false, format: null };
  } finally {
    clearTimeout(timer);
    // Stop downloading audio as soon as the headers have answered the question.
    controller.abort();
  }
}

/** Ask Icecast directly, with no caching. Never throws. */
export async function readStreamStatus(): Promise<StreamStatus> {
  const checkedAt = new Date().toISOString();
  const stream = streamUrl();
  if (!stream) {
    return { configured: false, live: false, title: null, listeners: null, detectedBy: null, checkedAt, problems: [] };
  }

  const addressProblems = problemsWith(stream);
  if (addressProblems.some((problem) => problem.includes("not a valid"))) {
    return { configured: true, live: false, title: null, listeners: null, detectedBy: null, checkedAt, problems: addressProblems };
  }

  try {
    const response = await fetch(statusUrlFor(stream), {
      cache: "no-store",
      signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
    });
    if (response.ok) {
      const source = liveSourceFor(await response.json(), stream);
      return {
        configured: true,
        live: Boolean(source),
        title: cleanTitle(source),
        listeners: typeof source?.listeners === "number" ? source.listeners : null,
        detectedBy: "status-page",
        checkedAt,
        problems: problemsWith(stream, source?.server_type),
      };
    }
  } catch {
    // Status page switched off, unreachable, or returning broken JSON, which
    // older Icecast versions do when a title contains quotes. Test the stream.
  }

  const probe = await probeStream(stream);
  return {
    configured: true,
    live: probe.live,
    title: null,
    listeners: null,
    detectedBy: "connection-test",
    checkedAt,
    problems: problemsWith(stream, probe.format),
  };
}

let cached: { at: number; value: Promise<StreamStatus> } | null = null;

/** The stream's status, asked of Icecast at most once every few seconds. */
export function getStreamStatus(): Promise<StreamStatus> {
  const now = Date.now();
  if (!cached || now - cached.at >= CACHE_MS) {
    cached = { at: now, value: readStreamStatus() };
  }
  return cached.value;
}
