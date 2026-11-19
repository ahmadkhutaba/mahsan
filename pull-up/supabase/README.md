# Pull Up database

Everything the backend does is in `migrations/`, applied in order. Nothing is configured by hand in the
Supabase dashboard.

| File | What it holds |
|---|---|
| `…150000_schema.sql` | Tables, constraints, indexes |
| `…150100_access_rules.sql` | Who can read which rows (row level security) and the table grants |
| `…150200_write_functions.sql` | Every write: onboarding, spots, requests, chat, ratings, blocking, reports, account deletion |
| `…150300_read_functions.sql` | Totals that are safe to show: places left, group mix, trust summary |
| `…150400_maintenance_and_grants.sql` | 5-minute housekeeping job, live-update publication, function grants |

## The rules in one place

- **The browser can only read.** It has `SELECT` on tables, filtered by row level security. Every change goes
  through a function that checks who is calling and whether the change is allowed right now.
- **Logged-out visitors can read and call nothing.**
- **Private data is in a separate table** (`account_private`: gender, interests, consent, email verification).
  Only its owner can read it. Other people only ever get first name, avatar, age range and languages.
- **One source of truth per state.** A spot is *full* when its active memberships equal its places, *started*
  after `starts_at`, *completed* after `ends_at`. A request is *expired* when it is still pending on a spot that
  started or was cancelled. None of these are stored twice.
- **Accepting is atomic.** `decide_request` locks the spot row, then checks host, pending request, not started,
  not cancelled, no block, and a free place, in one transaction.
- **Times** are `timestamptz` (UTC in storage). Eligibility uses the database clock, never the phone's.
- **Errors** are raised as SQLSTATE `P0001` with a short code as the message (`spot_full`, `not_member`, …).
  The app translates the code.

## Limits

| What | Limit |
|---|---|
| Requests waiting at once, per person | 5 |
| Requests per person per day | 10 |
| Re-asking the same spot after withdrawing | 2 times |
| Open spots per host | 3 |
| Spots created per host per day | 5 |
| Chat messages per person per minute | 30 |
| Reports per person per day | 10 |
| Blocks per person per day | 50 |
| A spot can start | 10 minutes to 7 days from now |
| A spot can last | 30 minutes to 12 hours |

## Run it locally

Needs Docker.

```bash
npm install
npm run db:start     # local Supabase Postgres on port 54322
npm run db:reset     # re-apply every migration from scratch
npm run test:db      # 71 tests, about 15 seconds
```

The tests refuse to run against anything but a local database, because they wipe it. Each simulated user is
its own connection with the `authenticated` role and the same JWT claims the API sets, so the tests exercise
the real grants and policies.

## What the tests do not cover

- The live-update service (Supabase Realtime) and the HTTP API layer. The rules they rely on are tested here;
  the services themselves are tested from the app in later stages.
- Google sign-in.
- The hosted project. These migrations have only been applied to a local database so far.
