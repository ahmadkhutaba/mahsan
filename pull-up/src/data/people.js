// Mock people. Avatars are drawn in code (see components/Avatar.jsx).
// skin: 1 (lightest) – 5 (darkest). hair styles: short, buzz, long, bob, bun, curly, hijab.

const p = (id, firstName, gender, ageRange, languages, verified, avatar, extra = {}) => ({
  id,
  firstName,
  gender, // 'woman' | 'man' | 'nonbinary' | null
  ageRange,
  languages,
  verified,
  avatar,
  ...extra,
})

export const ME = 'me'

export const people = [
  // The tester
  p(ME, 'You', null, '25–29', ['Hebrew', 'English'], true,
    { skin: 3, hair: 'curly', hairColor: '#3b2a20', bg: '#f5b544', shirt: '#0f3b2d' },
    { bio: 'New-ish in town. Up for a drink, a game or a good table.', stats: { joined: 4, rating: 4.9 } }),

  // Haifa · trivia at The Lantern Bar
  p('maya', 'Maya', 'woman', '25–29', ['Hebrew', 'English'], true,
    { skin: 2, hair: 'long', hairColor: '#4a2f1d', bg: '#fadfd3', shirt: '#d5633b' }),
  p('omer', 'Omer', 'man', '25–29', ['Hebrew', 'English'], true,
    { skin: 3, hair: 'short', hairColor: '#231a15', bg: '#dcebe2', shirt: '#14503c', beard: true }),
  p('rana', 'Rana', 'woman', '25–29', ['Arabic', 'Hebrew', 'English'], true,
    { skin: 3, hair: 'bob', hairColor: '#1d1512', bg: '#fdecc8', shirt: '#7a4a06', glasses: true }),

  // Haifa · mezze dinner
  p('yousef', 'Yousef', 'man', '30–34', ['Arabic', 'Hebrew', 'English'], true,
    { skin: 3, hair: 'short', hairColor: '#1d1512', bg: '#fdecc8', shirt: '#b94a26', beard: true }),
  p('lina', 'Lina', 'woman', '25–29', ['Arabic', 'English'], true,
    { skin: 2, hair: 'hijab', hairColor: '#7c5c8e', bg: '#ecdff2', shirt: '#5b3a70' }),
  p('daniel', 'Daniel', 'man', '30–34', ['Hebrew', 'English'], true,
    { skin: 1, hair: 'short', hairColor: '#8a5a2b', bg: '#dcebe2', shirt: '#1b6a4e', glasses: true }),
  p('shira', 'Shira', 'woman', '30–34', ['Hebrew', 'English', 'French'], false,
    { skin: 2, hair: 'bun', hairColor: '#6b3d1e', bg: '#fadfd3', shirt: '#963a1c' }),

  // Haifa · board games
  p('itai', 'Itai', 'man', '20–24', ['Hebrew', 'English'], true,
    { skin: 2, hair: 'curly', hairColor: '#2c1e16', bg: '#ecdff2', shirt: '#5b3a70', glasses: true }),
  p('tamar', 'Tamar', 'woman', '20–24', ['Hebrew', 'English'], true,
    { skin: 2, hair: 'long', hairColor: '#b0672d', bg: '#fdecc8', shirt: '#ec9d24' }),
  p('sasha', 'Sasha', 'nonbinary', '20–24', ['Russian', 'Hebrew', 'English'], true,
    { skin: 1, hair: 'bob', hairColor: '#d8b25a', bg: '#dcebe2', shirt: '#23845f' }),

  // Haifa · beach volleyball
  p('gal', 'Gal', 'woman', '25–29', ['Hebrew', 'English'], true,
    { skin: 3, hair: 'bun', hairColor: '#3b2a20', bg: '#fdecc8', shirt: '#d5633b' }),
  p('amit', 'Amit', 'man', '25–29', ['Hebrew'], true,
    { skin: 3, hair: 'buzz', hairColor: '#231a15', bg: '#dcebe2', shirt: '#14503c' }),
  p('nour', 'Nour', 'woman', '25–29', ['Arabic', 'Hebrew', 'English'], true,
    { skin: 3, hair: 'long', hairColor: '#1d1512', bg: '#fadfd3', shirt: '#b94a26' }),
  p('ido', 'Ido', 'man', '30–34', ['Hebrew', 'English'], false,
    { skin: 2, hair: 'short', hairColor: '#5a3a22', bg: '#ecdff2', shirt: '#5b3a70' }),
  p('rotem', 'Rotem', 'woman', '25–29', ['Hebrew', 'English'], true,
    { skin: 2, hair: 'bob', hairColor: '#2c1e16', bg: '#dcebe2', shirt: '#1b6a4e' }),

  // Haifa · craft beer
  p('karim', 'Karim', 'man', '30–34', ['Arabic', 'Hebrew', 'English'], true,
    { skin: 4, hair: 'short', hairColor: '#1d1512', bg: '#dcebe2', shirt: '#0f3b2d', beard: true, glasses: true }),
  p('noa', 'Noa', 'woman', '30–34', ['Hebrew', 'English'], true,
    { skin: 2, hair: 'curly', hairColor: '#6b3d1e', bg: '#fdecc8', shirt: '#ec9d24' }),

  // Tel Aviv · wine night
  p('yael', 'Yael', 'woman', '25–29', ['Hebrew', 'English'], true,
    { skin: 2, hair: 'long', hairColor: '#231a15', bg: '#ecdff2', shirt: '#5b3a70' }),
  p('hila', 'Hila', 'woman', '25–29', ['Hebrew', 'English', 'Spanish'], true,
    { skin: 3, hair: 'curly', hairColor: '#1d1512', bg: '#fadfd3', shirt: '#d5633b' }),
  p('michal', 'Michal', 'woman', '30–34', ['Hebrew', 'English'], true,
    { skin: 1, hair: 'bob', hairColor: '#a35a2a', bg: '#dcebe2', shirt: '#14503c', glasses: true }),

  // Tel Aviv · dinner in the Kerem
  p('eitan', 'Eitan', 'man', '30–34', ['Hebrew', 'English'], true,
    { skin: 2, hair: 'short', hairColor: '#3b2a20', bg: '#fdecc8', shirt: '#7a4a06', beard: true }),
  p('dana', 'Dana', 'woman', '30–34', ['Hebrew', 'English'], true,
    { skin: 2, hair: 'long', hairColor: '#2c1e16', bg: '#fadfd3', shirt: '#963a1c' }),
  p('yonatan', 'Yonatan', 'man', '35–39', ['Hebrew', 'English'], true,
    { skin: 2, hair: 'buzz', hairColor: '#5a3a22', bg: '#dcebe2', shirt: '#1b6a4e', glasses: true }),
  p('layla', 'Layla', 'woman', '30–34', ['Arabic', 'Hebrew', 'English'], true,
    { skin: 3, hair: 'bun', hairColor: '#1d1512', bg: '#ecdff2', shirt: '#5b3a70' }),
  p('tal', 'Tal', 'man', '30–34', ['Hebrew', 'English'], false,
    { skin: 3, hair: 'curly', hairColor: '#231a15', bg: '#fdecc8', shirt: '#b94a26' }),

  // Tel Aviv · Codenames
  p('roni', 'Roni', 'woman', '20–24', ['Hebrew', 'English'], true,
    { skin: 2, hair: 'bun', hairColor: '#b0672d', bg: '#dcebe2', shirt: '#23845f', glasses: true }),
  p('adam', 'Adam', 'man', '25–29', ['Hebrew', 'English'], true,
    { skin: 4, hair: 'short', hairColor: '#1d1512', bg: '#fadfd3', shirt: '#d5633b' }),
  p('katya', 'Katya', 'woman', '25–29', ['Russian', 'Hebrew', 'English'], true,
    { skin: 1, hair: 'long', hairColor: '#d8b25a', bg: '#ecdff2', shirt: '#5b3a70' }),
  p('majd', 'Majd', 'man', '20–24', ['Arabic', 'Hebrew', 'English'], true,
    { skin: 3, hair: 'curly', hairColor: '#1d1512', bg: '#fdecc8', shirt: '#7a4a06' }),

  // Tel Aviv · sunset run
  p('adi', 'Adi', 'woman', '30–34', ['Hebrew', 'English'], true,
    { skin: 3, hair: 'bun', hairColor: '#2c1e16', bg: '#dcebe2', shirt: '#14503c' }),
  p('ben', 'Ben', 'man', '30–34', ['English', 'Hebrew'], true,
    { skin: 1, hair: 'short', hairColor: '#b0672d', bg: '#fdecc8', shirt: '#ec9d24', beard: true }),
  p('hadeel', 'Hadeel', 'woman', '25–29', ['Arabic', 'Hebrew', 'English'], true,
    { skin: 3, hair: 'hijab', hairColor: '#1b6a4e', bg: '#fadfd3', shirt: '#14503c' }),

  // Tel Aviv · cocktails & vinyl
  p('dima', 'Dima', 'man', '25–29', ['Russian', 'Hebrew', 'English'], true,
    { skin: 1, hair: 'short', hairColor: '#5a3a22', bg: '#ecdff2', shirt: '#5b3a70' }),
  p('lior', 'Lior', 'man', '25–29', ['Hebrew', 'English'], false,
    { skin: 2, hair: 'buzz', hairColor: '#231a15', bg: '#dcebe2', shirt: '#0f3b2d', beard: true }),
  p('guy', 'Guy', 'man', '30–34', ['Hebrew'], false,
    { skin: 3, hair: 'curly', hairColor: '#3b2a20', bg: '#fdecc8', shirt: '#b94a26' }),

  // The tester's own friends (host mode)
  p('tomer', 'Tomer', 'man', '25–29', ['Hebrew', 'English'], true,
    { skin: 2, hair: 'short', hairColor: '#2c1e16', bg: '#dcebe2', shirt: '#1b6a4e', glasses: true }),
  p('shir', 'Shir', 'woman', '25–29', ['Hebrew', 'English'], true,
    { skin: 2, hair: 'long', hairColor: '#6b3d1e', bg: '#fadfd3', shirt: '#d5633b' }),
  p('yara', 'Yara', 'woman', '25–29', ['Arabic', 'Hebrew', 'English'], true,
    { skin: 3, hair: 'bob', hairColor: '#1d1512', bg: '#ecdff2', shirt: '#5b3a70' }),
  p('alon', 'Alon', 'man', '25–29', ['Hebrew', 'English'], false,
    { skin: 3, hair: 'buzz', hairColor: '#231a15', bg: '#fdecc8', shirt: '#7a4a06' }),

  // People who ask to join the tester's spots (host mode)
  p('lia', 'Lia', 'woman', '25–29', ['Hebrew', 'English'], true,
    { skin: 2, hair: 'bob', hairColor: '#8a3b1e', bg: '#fdecc8', shirt: '#b94a26', glasses: true },
    { bio: 'Product designer, moved to Haifa in the spring. Competitive about board games, relaxed about everything else.',
      stats: { joined: 7, rating: 4.9 } }),
  p('ahmad', 'Ahmad', 'man', '25–29', ['Arabic', 'Hebrew', 'English'], true,
    { skin: 3, hair: 'short', hairColor: '#1d1512', bg: '#dcebe2', shirt: '#14503c', beard: true },
    { bio: 'Technion grad student. I bring snacks and I never remember the rules.',
      stats: { joined: 3, rating: 4.7 } }),
  p('jonny', 'Jonny', 'man', '35–39', ['English'], false,
    { skin: 1, hair: 'buzz', hairColor: '#8a5a2b', bg: '#ecdff2', shirt: '#5b3a70' },
    { bio: 'In town for work this week.', stats: { joined: 0, rating: null } }),
  p('michelle', 'Michelle', 'woman', '30–34', ['English', 'French', 'Hebrew'], true,
    { skin: 4, hair: 'curly', hairColor: '#1d1512', bg: '#fadfd3', shirt: '#963a1c' },
    { bio: 'Nurse at Rambam, off shift tonight. Happy to fill whatever seat is empty.',
      stats: { joined: 11, rating: 5.0 } }),
]

export const peopleById = Object.fromEntries(people.map((x) => [x.id, x]))

// Friends the tester can bring when creating a spot, in order.
export const MY_FRIENDS = ['tomer', 'shir', 'yara', 'alon']
