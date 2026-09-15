# The Bride of Christ Podcast

The public listener site for live audio sessions: a list of live and upcoming
sessions, a player for the Icecast stream, and a private notepad.

Sessions are created, started and ended by church staff in the church portal,
under Website > Podcast. This app never writes anything. It only reads published
sessions from the database it shares with the church site.

## Never change the database from here

This project describes a single table. Running `prisma db push` or
`prisma migrate` from it would treat every other church table as unwanted and
try to delete it. The `db:push` script refuses on purpose, and the database login
this app uses cannot alter tables either. Schema changes belong in the church
project.

## Environment

| Variable | Value |
|---|---|
| `DATABASE_URL` | The read-only `podcast_reader` login, pooled connection on port 6543 |
| `NEXT_PUBLIC_SITE_URL` | This site's public address, no trailing slash |

## Running locally

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3001
```
