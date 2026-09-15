# The Bride of Christ Podcast

The public listening site for the church's radio. The stream runs around the
clock: church programmes go out live most days of the week, with gospel music in
between. One page: a Listen live button showing what is playing now, and a
private notepad with a fresh page each day.

There is no database and nothing to schedule. The site reads one setting, the
stream's listening address.

## Environment

| Variable | Value |
|---|---|
| `STREAM_URL` | The public HTTPS listening address, e.g. `https://stream.zeno.fm/your-station-id` |
| `STATUS_URL` | Optional, self-hosted Icecast only: its status JSON, if not at `/status-json.xsl` |
| `NEXT_PUBLIC_SITE_URL` | This site's public address, no trailing slash |

On Zeno.fm, `STREAM_URL` is the listening link under **Stream Settings**, not the
encoder address under **Encoder Settings** (`link.zeno.fm`, port 80, a
`.../source` mount, username and password). The encoder address is only for the
broadcasting software. Never put its password in this site.

## What the stream needs

- **HTTPS.** Browsers will not play an `http://` stream inside an HTTPS page.
- **The full listening address**, not just the server.
- **MP3 or AAC.** iPhones and Safari cannot play Ogg or Opus.

The church portal's Podcast page reports any of these problems once the church
site's `NEXT_PUBLIC_PODCAST_SITE_URL` points here.

## How "now playing" is found

On a self-hosted Icecast the site reads `/status-json.xsl`, which also gives a
listener count. Hosted services such as Zeno.fm do not publish that page, so the
site opens the stream, confirms audio comes back, and reads the title the stream
announces alongside the audio. Website tags in song titles, such as
`[www.ghanagospelsongs.com]`, are removed before display.

The stream is checked at most every ten seconds however many people are
listening, and pages are served the latest answer immediately while a fresh one
is fetched in the background.

## Running locally

```bash
npm install
cp .env.example .env.local   # then set STREAM_URL
npm run dev                  # http://localhost:3001
```
