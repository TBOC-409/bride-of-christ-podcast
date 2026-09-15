# The Bride of Christ Podcast

The public listening site for the church's live Icecast stream. One page: a
Listen live button that knows by itself whether a programme is on air, and a
private notepad with a fresh page each day.

There is no database and nothing to schedule. The site reads one setting, the
stream address, and asks Icecast whether anything is broadcasting.

## Environment

| Variable | Value |
|---|---|
| `STREAM_URL` | The public Icecast listening address with its mount, over HTTPS, e.g. `https://radio.example.org/live` |
| `STATUS_URL` | Optional. Icecast's status JSON, if it is not at `/status-json.xsl` on the stream's server |
| `NEXT_PUBLIC_SITE_URL` | This site's public address, no trailing slash |

Never put the Icecast source or admin password in this site. Only the
broadcasting software needs it.

## What the stream needs

- **HTTPS.** Browsers will not play an `http://` stream inside an HTTPS page.
- **A mount name** in the address. The server address alone is Icecast's status
  page, not audio.
- **MP3 or AAC.** iPhones and Safari cannot play Ogg or Opus.

The church portal's Podcast page reports any of these problems once the church
site's `NEXT_PUBLIC_PODCAST_SITE_URL` points here.

## How on air is detected

The site reads Icecast's `/status-json.xsl`, which lists the mounts a
broadcaster is connected to, and picks up the programme title when the
broadcasting software sends one. If that page is switched off or unreachable, it
opens the stream instead and checks audio comes back. Icecast is asked at most
every ten seconds however many people are listening.

## Running locally

```bash
npm install
cp .env.example .env.local   # then set STREAM_URL
npm run dev                  # http://localhost:3001
```
