# Pull Up

A group that is one person short posts an open spot; someone on their own finds it and asks to join.

**Status:** being turned from a clickable demo into a working app, in stages.

| Stage | Status |
|---|---|
| 0. Database (`supabase/`) | Done, tested locally |
| 1. English and Hebrew, right-to-left, honest copy | Done |
| 2–9. Accounts, spots, requests, chat, notifications, rating, safety, launch | Not started |

Until those stages land, the screens still run on **sample data in memory** (`src/data/`). Nothing is saved,
and the dashed "Demo" buttons stand in for the other person. They are removed as each screen is connected
to the database.

## Run it

```bash
cd pull-up
npm install
npm run dev
```

Open http://localhost:5173. On a laptop the app sits in a phone frame. On a phone on the same Wi-Fi, open the
"Network" address that `npm run dev` prints.

## Checks

```bash
npm run test:i18n                 # English and Hebrew have the same keys; every key the code uses exists
node e2e/walkthrough.mjs en       # full click-through at phone size, fails on any console error
node e2e/walkthrough.mjs he       # the same in Hebrew, plus right-to-left and overflow checks
npm run test:db                   # database rules (needs Docker, see supabase/README.md)
```

## Languages

- All copy is in `src/i18n/en.js` and `src/i18n/he.js`. Components never hold their own text.
- Layout uses start/end, not left/right, so Hebrew mirrors without special cases.
- Names and other user-written text are isolated, so an English name inside a Hebrew sentence (or the
  reverse) stays intact.
- The language choice is remembered on the device. Switching language keeps whatever is typed in a form.

## What the app does not claim

Pull Up does not verify identity, age or attendance, and the copy says so. The 18+ box is the user's own
declaration. Group details are "as described by the host".

## Where things are

- `src/data/` — sample people, venues and spots (temporary).
- `src/i18n/` — all copy, in English and Hebrew.
- `src/state/store.jsx` — all app state and the simulated host/joiner behaviour.
- `src/screens/` — one file per screen (`joiner/`, `host/`, onboarding, profile).
- `src/components/` — phone frame, avatars, cards, buttons.
