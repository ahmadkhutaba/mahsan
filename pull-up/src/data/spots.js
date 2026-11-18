import { ME } from './people.js'

// A "spot" is one open place in a group that is going out tonight.
// memberIds includes the host. Chat is only shown to accepted members.

export const initialSpots = [
  // ───────────── Haifa ─────────────
  {
    id: 's-trivia',
    venueId: 'lantern',
    type: 'bar',
    activity: 'Pub trivia night',
    startTime: '20:30',
    hostId: 'maya',
    memberIds: ['maya', 'omer', 'rana'],
    openSpots: 1,
    ageRange: '25–29',
    vibeTags: ['Talkative', 'Competitive (a little)', 'Beer & nachos'],
    hostNote:
      'Teams are four and we are three. No trivia skills needed, we mostly need someone who knows anything about sports. First round is on us.',
    findUsHint: 'Table by the window, ask for Maya.',
    chat: [
      { fromId: 'maya', text: 'Got the window table again 🙌', time: '16:52' },
      { fromId: 'omer', text: 'Quiz starts at 21:00 sharp, come a bit early for food', time: '16:55' },
    ],
  },
  {
    id: 's-mezze',
    venueId: 'fennel',
    type: 'restaurant',
    activity: 'Mezze dinner, sharing plates',
    startTime: '19:30',
    hostId: 'yousef',
    memberIds: ['yousef', 'lina', 'daniel', 'shira'],
    openSpots: 2,
    ageRange: '25–34',
    vibeTags: ['Foodies', 'Relaxed', 'Long dinner'],
    hostNote:
      'We booked a table for six and two friends cancelled. We order everything for the middle and split the bill evenly, around ₪120 each.',
    findUsHint: 'Garden at the back, table under the lemon tree. Booking is under Yousef.',
    chat: [
      { fromId: 'yousef', text: 'Table is at 19:30, they hold it for 15 minutes', time: '16:10' },
      { fromId: 'lina', text: 'Any allergies? I want to pre-order the fish', time: '16:14' },
    ],
  },
  {
    id: 's-catan',
    venueId: 'meeple',
    type: 'boardgames',
    activity: 'Catan and whatever comes next',
    startTime: '20:00',
    hostId: 'itai',
    memberIds: ['itai', 'tamar', 'sasha'],
    openSpots: 1,
    ageRange: '20–24',
    vibeTags: ['Beginner friendly', 'Nerdy', 'No alcohol needed'],
    hostNote:
      'Catan is better with four. We explain rules as we go, so total beginners are welcome. Table fee is ₪25 per person.',
    findUsHint: 'Upstairs, the big round table next to the game shelf. Look for the orange Catan box.',
    chat: [
      { fromId: 'tamar', text: 'I call the red pieces', time: '16:20' },
      { fromId: 'itai', text: 'We have the table until 23:00', time: '16:31' },
    ],
  },
  {
    id: 's-volley',
    venueId: 'dado',
    type: 'sports',
    activity: 'Beach volleyball, 3 v 3',
    startTime: '18:30',
    hostId: 'gal',
    memberIds: ['gal', 'amit', 'nour', 'ido', 'rotem'],
    openSpots: 1,
    ageRange: '25–34',
    vibeTags: ['Friendly level', 'Sunset', 'Sandy'],
    hostNote:
      'We are five and need a sixth for 3 v 3. Mixed level, nobody spikes. Bring water, we have the ball. Usually a drink on the promenade after.',
    findUsHint: 'Court 2, the one closest to the lifeguard tower. Gal has the yellow ball.',
    chat: [
      { fromId: 'gal', text: 'Court 2 is ours from 18:30', time: '17:05' },
      { fromId: 'amit', text: 'Wind is fine today 👌', time: '17:20' },
    ],
  },
  {
    id: 's-beer',
    venueId: 'wadi',
    type: 'bar',
    activity: 'Craft beer and live oud set',
    startTime: '21:30',
    hostId: 'karim',
    memberIds: ['karim', 'noa'],
    openSpots: 2,
    ageRange: '30–34',
    vibeTags: ['Live music', 'Low-key', 'Good conversation'],
    hostNote:
      'A friend is playing a short set at 22:00. Two of us so far and a table for four. Come for one beer or stay for the whole thing.',
    findUsHint: 'High table to the left of the stage. Karim has a grey cap.',
    chat: [
      { fromId: 'karim', text: 'Set starts 22:00, doors are free', time: '17:02' },
    ],
  },

  // ───────────── Tel Aviv ─────────────
  {
    id: 's-wine',
    venueId: 'levinsky',
    type: 'bar',
    activity: 'Natural wine and small plates',
    startTime: '21:00',
    hostId: 'yael',
    memberIds: ['yael', 'hila', 'michal'],
    openSpots: 1,
    ageRange: '25–34',
    vibeTags: ['Chatty', 'Wine nerds welcome', 'Home by midnight'],
    hostNote:
      'Our fourth is stuck at work. Nothing fancy, we share a bottle and whatever the kitchen recommends.',
    findUsHint: 'Corner table inside, by the record shelf. Ask the staff for Yael.',
    chat: [
      { fromId: 'hila', text: 'They have the orange wine from last time!', time: '17:15' },
      { fromId: 'yael', text: 'Table is under my name from 21:00', time: '17:20' },
    ],
  },
  {
    id: 's-kerem',
    venueId: 'kerem',
    type: 'restaurant',
    activity: 'Yemenite home-style dinner',
    startTime: '20:00',
    hostId: 'eitan',
    memberIds: ['eitan', 'dana', 'yonatan', 'layla', 'tal'],
    openSpots: 1,
    ageRange: '30–39',
    vibeTags: ['Loud table', 'Big portions', 'Everyone talks at once'],
    hostNote:
      'Six-person set menu, five of us. ₪95 each, vegetarian works. We are old friends but we like new faces, promise.',
    findUsHint: 'Long table in the courtyard. Ask for Eitan at the counter.',
    chat: [
      { fromId: 'dana', text: 'I told them one vegetarian for now', time: '16:40' },
      { fromId: 'eitan', text: 'Courtyard table confirmed', time: '16:44' },
    ],
  },
  {
    id: 's-codenames',
    venueId: 'dice',
    type: 'boardgames',
    activity: 'Codenames tournament night',
    startTime: '19:30',
    hostId: 'roni',
    memberIds: ['roni', 'adam', 'katya', 'majd'],
    openSpots: 2,
    ageRange: '20–29',
    vibeTags: ['Team games', 'Easy to learn', 'Pizza'],
    hostNote:
      'Two teams of three would be perfect. Games are in English tonight. Pizza is by the slice, pay for what you eat.',
    findUsHint: 'Second room, table 7. There is a paper sign that says “Team Roni”.',
    chat: [
      { fromId: 'roni', text: 'Table 7 is booked 19:30 to 22:30', time: '16:30' },
      { fromId: 'majd', text: 'Bringing my lucky spymaster energy', time: '16:47' },
    ],
  },
  {
    id: 's-run',
    venueId: 'yarkon',
    type: 'sports',
    activity: 'Easy 5K sunset run',
    startTime: '18:00',
    hostId: 'adi',
    memberIds: ['adi', 'ben', 'hadeel'],
    openSpots: 3,
    ageRange: '25–34',
    vibeTags: ['Conversational pace', 'No one left behind', 'Juice after'],
    hostNote:
      'Slow and social, about 6:30 per km, walking breaks are fine. We finish at the juice stand by the bridge.',
    findUsHint: 'Meet at the rowing centre entrance, by the bike racks. Adi wears a bright orange cap.',
    chat: [
      { fromId: 'adi', text: 'Leaving at 18:05, we wait for everyone', time: '17:10' },
    ],
  },
  {
    id: 's-vinyl',
    venueId: 'heron',
    type: 'bar',
    activity: 'Cocktails and vinyl night',
    startTime: '22:00',
    hostId: 'dima',
    memberIds: ['dima', 'lior', 'guy'],
    openSpots: 1,
    ageRange: '25–34',
    vibeTags: ['Late night', 'Loud music', 'Dancing later'],
    hostNote: 'Table for four, we are three. DJ plays funk and disco from 23:00.',
    findUsHint: 'Booth near the DJ, ask for Dima.',
    chat: [{ fromId: 'dima', text: 'Booth is booked from 22:00', time: '17:02' }],
    autoDecline: true, // this host always declines, so testers can reach the "declined" state
  },

  // ───────────── The tester's own spot (host mode) ─────────────
  {
    id: 's-mine',
    venueId: 'meeple',
    type: 'boardgames',
    activity: 'Ticket to Ride night',
    startTime: '21:00',
    hostId: ME,
    memberIds: [ME, 'tomer', 'shir'],
    openSpots: 1,
    ageRange: '25–29',
    vibeTags: ['Easygoing', 'Beginner friendly'],
    hostNote: 'Three of us and the game is best with four. We teach, you win.',
    findUsHint: 'Ground floor, table by the front window.',
    chat: [],
    seeded: true,
  },
]

// Requests the tester (as host) has already received when the demo starts.
export const initialRequests = [
  {
    id: 'r-lia',
    spotId: 's-mine',
    personId: 'lia',
    message: 'Hi! I know Ticket to Ride well and can be there by 21:00. Is the Europe map ok?',
    status: 'pending',
    sentAt: '12 min ago',
  },
  {
    id: 'r-ahmad',
    spotId: 's-mine',
    personId: 'ahmad',
    message: 'Never played but I learn fast. Happy to bring something sweet for the table.',
    status: 'pending',
    sentAt: '25 min ago',
  },
  {
    id: 'r-jonny',
    spotId: 's-mine',
    personId: 'jonny',
    message: '',
    status: 'pending',
    sentAt: '31 min ago',
  },
]
