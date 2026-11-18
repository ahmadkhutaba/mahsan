# Pull Up — clickable demo

A front-end-only prototype for usability testing. A group that is one person short posts an open spot;
someone on their own finds it and asks to join.

There is no backend. All people, venues and messages are mock data held in memory.

## Run it

```bash
cd pull-up
npm install
npm run dev
```

Open http://localhost:5173. On a laptop the app sits in a phone frame with a facilitator panel beside it.
To test on a real phone, connect it to the same Wi-Fi and open the "Network" address that `npm run dev` prints.

## Things the facilitator should know

- **Reset between testers:** "Reset demo" beside the phone frame (laptop), or Profile → "Reset for the next tester" (phone).
  Refreshing the page does the same.
- **Skip the intro:** the dashed "Demo · Skip the intro" button on the first onboarding step.
- **Acceptance is automatic:** a join request is accepted about 5 seconds after it is sent.
- **One host always declines:** "Cocktails and vinyl night" in Tel Aviv. On any waiting screen,
  "Demo · Host declines instead" forces the same outcome.
- **After the evening:** on the "You're in" screen, "Demo · Skip to after the evening" opens the rating.
- **Host mode:** starts with one spot and three waiting requests. The first spot a tester creates gets one
  simulated request after about 7 seconds.
- **Empty home screen:** in Haifa, filter Sports + "After 22:00" (or any combination with no results).
- Dashed buttons labelled "Demo" are facilitator shortcuts, not part of the product design.
- The clock inside the prototype always starts at 17:42, so "tonight" works at any time of day.

## Usability test tasks

Give each task as written. Do not name buttons or screens.

1. **Find and join.** "It's early evening in Haifa and your plans fell through. You'd like to do something
   social tonight, not too far away. Find a group you would actually feel comfortable joining, and ask to join them."
   *Watch for:* which details they read before deciding (verification, group mix, host note), whether they use
   filters, whether they write a message, and what they expect to happen while waiting.

2. **Arrive, then change your mind.** "You were accepted. Work out where exactly to meet the group and let them
   know you're on your way. Then imagine something feels off when you get there: get out of the plan without
   making it awkward."
   *Watch for:* whether they find the "how to find us" hint and the chat, whether they notice "Leave quietly"
   without help, and whether they believe the group won't be told why.

3. **Fill your own table.** "Now you're out with two friends and you need one more person for a board game
   night at 21:00. Post that, then choose who joins from the people who ask."
   *Watch for:* whether they find the switch to hosting, where the form slows them down, and what in a
   joiner's profile makes them accept or decline (especially the unverified request with no message).

Good follow-up questions: "What made you pick that group?", "What would you want to know that wasn't there?",
"How did being turned down feel?" (run the Tel Aviv vinyl spot for that one).

## Where things are

- `src/data/` — mock people, venues and spots. Edit these to change the content.
- `src/state/store.jsx` — all app state and the simulated host/joiner behaviour.
- `src/screens/` — one file per screen (`joiner/`, `host/`, onboarding, profile).
- `src/components/` — phone frame, avatars, cards, buttons.
