import { ME, peopleById } from '../data/people.js'
import { venuesById } from '../data/venues.js'

export const TIME_OPTIONS = ['any', 'early', 'prime', 'late']
export const DISTANCE_OPTIONS = [null, 1, 3, 5]

export const EMPTY_FILTERS = { types: [], time: 'any', maxKm: null }

const minutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function timeMatches(startTime, bucket) {
  const t = minutes(startTime)
  if (bucket === 'early') return t < 20 * 60
  if (bucket === 'prime') return t >= 20 * 60 && t < 22 * 60
  if (bucket === 'late') return t >= 22 * 60
  return true
}

export function activeFilterCount(filters) {
  return filters.types.length + (filters.time !== 'any' ? 1 : 0) + (filters.maxKm ? 1 : 0)
}

/** Spots a joiner can see in a city, filtered and sorted by start time. */
export function visibleSpots(spots, city, filters) {
  return spots
    .filter((s) => !s.seeded) // the tester's pre-made host spot stays out of the joiner list
    .filter((s) => venuesById[s.venueId].city === city)
    .filter((s) => filters.types.length === 0 || filters.types.includes(s.type))
    .filter((s) => timeMatches(s.startTime, filters.time))
    .filter((s) => !filters.maxKm || venuesById[s.venueId].distanceKm <= filters.maxKm)
    .sort((a, b) => minutes(a.startTime) - minutes(b.startTime))
}

/** Counts behind "2 women · 1 man". Computed from the members so it always matches the avatars. */
export function groupMix(memberIds) {
  const others = memberIds.filter((id) => id !== ME).map((id) => peopleById[id])
  return {
    you: memberIds.includes(ME),
    women: others.filter((p) => p.gender === 'woman').length,
    men: others.filter((p) => p.gender === 'man').length,
    nonbinary: others.filter((p) => p.gender === 'nonbinary').length,
  }
}

/** Languages spoken in the group, most common first. */
export function groupLanguages(memberIds) {
  const counts = {}
  memberIds.forEach((id) => peopleById[id].languages.forEach((l) => (counts[l] = (counts[l] || 0) + 1)))
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([lang, n]) => ({ lang, everyone: n === memberIds.length }))
}

export const ACTIVE_STATUSES = ['pending', 'accepted', 'attended', 'declined']

/** The tester's current request for a spot, if any. */
export function myRequestFor(requests, spotId) {
  return requests.find((r) => r.personId === ME && r.spotId === spotId && ACTIVE_STATUSES.includes(r.status))
}

// The prototype always starts at 17:42 on the evening in question, so mock times stay believable
// whenever the test session really takes place.
const loadedAt = Date.now()
export function demoClock() {
  const total = 17 * 60 + 42 + Math.floor((Date.now() - loadedAt) / 60000)
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
