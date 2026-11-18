import { ME, peopleById } from '../data/people.js'
import { venuesById } from '../data/venues.js'

export const TIME_OPTIONS = [
  { id: 'any', label: 'Any time' },
  { id: 'early', label: 'Before 20:00' },
  { id: 'prime', label: '20:00 – 22:00' },
  { id: 'late', label: 'After 22:00' },
]

export const DISTANCE_OPTIONS = [
  { id: null, label: 'Any distance' },
  { id: 1, label: 'Up to 1 km' },
  { id: 3, label: 'Up to 3 km' },
  { id: 5, label: 'Up to 5 km' },
]

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

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

/** "2 women · 1 man", computed from the members so it always matches the avatars. */
export function groupMix(memberIds) {
  const others = memberIds.filter((id) => id !== ME).map((id) => peopleById[id])
  const women = others.filter((p) => p.gender === 'woman').length
  const men = others.filter((p) => p.gender === 'man').length
  const nb = others.filter((p) => p.gender === 'nonbinary').length
  const parts = []
  if (memberIds.includes(ME)) parts.push('You')
  if (women) parts.push(plural(women, 'woman', 'women'))
  if (men) parts.push(plural(men, 'man', 'men'))
  if (nb) parts.push(`${nb} non-binary`)
  return parts.join(' · ')
}

/** Languages spoken in the group, most common first. */
export function groupLanguages(memberIds) {
  const counts = {}
  memberIds.forEach((id) => peopleById[id].languages.forEach((l) => (counts[l] = (counts[l] || 0) + 1)))
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([lang, n]) => ({ lang, everyone: n === memberIds.length }))
}

export function verifiedSummary(memberIds, get = (id) => peopleById[id]) {
  const verified = memberIds.filter((id) => get(id).verified).length
  const total = memberIds.length
  return { verified, total, all: verified === total, label: verified === total ? 'All verified' : `${verified} of ${total} verified` }
}

export const ACTIVE_STATUSES = ['pending', 'accepted', 'attended', 'declined']

/** The tester's current request for a spot, if any. */
export function myRequestFor(requests, spotId) {
  return requests.find((r) => r.personId === ME && r.spotId === spotId && ACTIVE_STATUSES.includes(r.status))
}

export const openLabel = (n) => (n <= 0 ? 'Full' : n === 1 ? '1 spot open' : `${n} spots open`)

export const km = (d) => (d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`)

export const possessive = (name) => (name.endsWith('s') ? `${name}’` : `${name}’s`)

// The prototype always starts at 17:42 on the evening in question, so mock times stay believable
// whenever the test session really takes place.
const loadedAt = Date.now()
export function demoClock() {
  const total = 17 * 60 + 42 + Math.floor((Date.now() - loadedAt) / 60000)
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
