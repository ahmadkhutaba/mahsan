import { createContext, useContext, useEffect, useReducer, useRef } from 'react'
import { ME, MY_FRIENDS, peopleById } from '../data/people.js'
import { initialRequests, initialSpots } from '../data/spots.js'
import { EMPTY_FILTERS, demoClock } from './helpers.js'

// Everything lives in memory. A page refresh, or the Reset button, starts over.

export const AUTO_ACCEPT_MS = 5000
const INCOMING_REQUEST_MS = 7000

const createInitialState = () => ({
  onboarded: false,
  me: { ...peopleById[ME], interests: [] }, // filled in during onboarding
  role: 'joiner', // 'joiner' | 'host'
  city: 'Haifa',
  filters: EMPTY_FILTERS,
  spots: structuredClone(initialSpots),
  requests: structuredClone(initialRequests),
  reports: [],
  ratings: [],
  tabs: { joiner: 'home', host: 'spots' },
  stack: [], // screens pushed on top of the current tab: [{ name, ...params }]
  sheet: null, // { name, ...params }
  toast: null, // { id, text, go? }
  seq: 1,
  simulatedRequestUsed: false,
})

const clockNow = demoClock

const patch = (list, id, fn) => list.map((x) => (x.id === id ? { ...x, ...fn(x) } : x))

function reducer(state, action) {
  const toast = (text, go) => ({ id: state.seq, text, go })
  const next = { ...state, seq: state.seq + 1 }

  switch (action.type) {
    // ── navigation ──
    case 'PUSH':
      return { ...state, stack: [...state.stack, action.screen], sheet: null }
    case 'POP':
      return { ...state, stack: state.stack.slice(0, -1), sheet: null }
    case 'REPLACE':
      return { ...state, stack: [...state.stack.slice(0, -1), action.screen], sheet: null }
    case 'HOME':
      return { ...state, stack: [], sheet: null, tabs: { ...state.tabs, [state.role]: action.tab ?? state.tabs[state.role] } }
    case 'TAB':
      return { ...state, stack: [], sheet: null, tabs: { ...state.tabs, [state.role]: action.tab } }
    case 'SHEET':
      return { ...state, sheet: action.sheet }
    case 'CLOSE_SHEET':
      return { ...state, sheet: null }
    case 'ROLE':
      return { ...state, role: action.role, stack: [], sheet: null, tabs: action.tab ? { ...state.tabs, [action.role]: action.tab } : state.tabs }
    case 'START_HOSTING': // jump straight into "create a spot" from the joiner side
      return { ...state, role: 'host', sheet: null, stack: [{ name: 'create', type: action.spotType }], tabs: { ...state.tabs, host: 'spots' } }
    case 'CITY':
      return { ...state, city: action.city }
    case 'FILTERS':
      return { ...state, filters: action.filters }
    case 'TOAST':
      return { ...next, toast: toast(action.text) }
    case 'CLEAR_TOAST':
      return state.toast?.id === action.id ? { ...state, toast: null } : state

    // ── onboarding ──
    case 'ONBOARD':
      return { ...state, onboarded: true, me: { ...state.me, ...action.me } }

    // ── joiner ──
    case 'REQUEST_JOIN': {
      const id = `r-me-${state.seq}`
      const request = { id, spotId: action.spotId, personId: ME, message: action.message.trim(), status: 'pending' }
      return {
        ...next,
        requests: [...state.requests, request],
        sheet: null,
        stack: [...state.stack, { name: 'plan', requestId: id }],
      }
    }
    case 'RESOLVE_MINE': {
      // The host's answer. Accepts, unless the spot is set up to decline or the facilitator forces it.
      const req = state.requests.find((r) => r.id === action.requestId)
      if (!req || req.status !== 'pending') return state
      const spot = state.spots.find((s) => s.id === req.spotId)
      const host = peopleById[spot.hostId]
      const top = state.stack[state.stack.length - 1]
      const watching = state.role === 'joiner' && top?.name === 'plan' && top.requestId === req.id
      const go = { name: 'plan', requestId: req.id }
      if (action.decline || spot.autoDecline) {
        return {
          ...next,
          requests: patch(state.requests, req.id, () => ({ status: 'declined' })),
          toast: watching ? state.toast : toast(`${host.firstName} answered your request`, go),
        }
      }
      return {
        ...next,
        requests: patch(state.requests, req.id, () => ({ status: 'accepted' })),
        spots: patch(state.spots, spot.id, (s) => ({
          openSpots: Math.max(0, s.openSpots - 1),
          chat: [
            ...s.chat,
            { system: true, text: 'You joined the group' },
            { fromId: spot.hostId, text: `Welcome! See you at ${spot.startTime} 👋`, time: clockNow() },
          ],
        })),
        toast: watching ? state.toast : toast(`${host.firstName} accepted your request`, go),
      }
    }
    case 'CANCEL_REQUEST':
      return { ...state, requests: patch(state.requests, action.requestId, () => ({ status: 'cancelled' })) }
    case 'LEAVE': {
      const req = state.requests.find((r) => r.id === action.requestId)
      if (!req || req.status !== 'accepted') return state
      return {
        ...state,
        requests: patch(state.requests, req.id, () => ({ status: 'left' })),
        spots: patch(state.spots, req.spotId, (s) => ({ openSpots: s.openSpots + 1 })),
      }
    }
    case 'END_EVENT':
      return {
        ...state,
        requests: patch(state.requests, action.requestId, () => ({ status: 'attended' })),
        sheet: null,
        stack: [{ name: 'rating', requestId: action.requestId }],
        tabs: { ...state.tabs, joiner: 'plans' },
      }
    case 'RATE':
      return {
        ...state,
        requests: patch(state.requests, action.requestId, () => ({ status: 'rated' })),
        ratings: [...state.ratings, { requestId: action.requestId, ...action.rating }],
      }
    case 'REPORT':
      return { ...state, reports: [...state.reports, action.report] }
    case 'SEND_CHAT':
      return {
        ...state,
        spots: patch(state.spots, action.spotId, (s) => ({
          chat: [...s.chat, { fromId: ME, text: action.text.trim(), time: clockNow() }],
        })),
      }

    // ── host ──
    case 'CREATE_SPOT': {
      const d = action.draft
      const spot = {
        id: `s-new-${state.seq}`,
        venueId: d.venueId,
        type: d.type,
        activity: d.activity.trim(),
        startTime: d.startTime,
        hostId: ME,
        memberIds: [ME, ...MY_FRIENDS.slice(0, d.groupSize - 1)],
        openSpots: d.openSpots,
        ageRange: '25–29',
        vibeTags: [],
        hostNote: d.note.trim(),
        findUsHint: d.findUs.trim(),
        chat: [],
        createdHere: true,
      }
      return {
        ...next,
        spots: [...state.spots, spot],
        stack: [],
        sheet: null,
        tabs: { ...state.tabs, host: 'spots' },
        toast: toast('Your spot is live'),
      }
    }
    case 'INCOMING_REQUEST': {
      const spot = state.spots.find((s) => s.id === action.spotId)
      if (!spot || state.simulatedRequestUsed) return state
      const person = peopleById.michelle
      return {
        ...next,
        simulatedRequestUsed: true,
        requests: [
          ...state.requests,
          {
            id: `r-in-${state.seq}`,
            spotId: spot.id,
            personId: person.id,
            message: `Hi! Saw your spot at ${spot.startTime}. I’m nearby and would love to join if it’s still open.`,
            status: 'pending',
            sentAt: 'Just now',
          },
        ],
        toast: state.role === 'host' ? toast(`${person.firstName} asked to join your spot`, { tab: 'requests' }) : state.toast,
      }
    }
    case 'HOST_DECIDE': {
      const req = state.requests.find((r) => r.id === action.requestId)
      if (!req || req.status !== 'pending') return state
      const person = peopleById[req.personId]
      const accepted = action.decision === 'accepted'
      return {
        ...next,
        requests: patch(state.requests, req.id, () => ({ status: action.decision })),
        spots: accepted
          ? patch(state.spots, req.spotId, (s) => ({
              openSpots: Math.max(0, s.openSpots - 1),
              joinerIds: [...(s.joinerIds || []), req.personId],
            }))
          : state.spots,
        stack: state.stack.slice(0, -1),
        toast: toast(accepted ? `${person.firstName} is in. They can now see the group chat.` : `Request from ${person.firstName} declined`),
      }
    }

    case 'RESET':
      return { ...createInitialState(), seq: state.seq + 1, toast: { id: state.seq, text: 'Demo reset. Ready for the next session.' } }
    default:
      return state
  }
}

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)
  const timers = useRef({})

  // Simulated "other side": hosts accept the tester's request after a few seconds,
  // and the first spot the tester creates receives one join request.
  const pendingMine = state.requests.filter((r) => r.personId === ME && r.status === 'pending').map((r) => r.id)
  const awaitingRequest = state.simulatedRequestUsed
    ? []
    : state.spots.filter((s) => s.createdHere).slice(0, 1).map((s) => s.id)
  const wanted = [
    ...pendingMine.map((id) => `accept|${id}`),
    ...awaitingRequest.map((id) => `incoming|${id}`),
  ]
  const wantedKey = wanted.join(',')

  useEffect(() => {
    const keys = wantedKey ? wantedKey.split(',') : []
    Object.keys(timers.current).forEach((k) => {
      if (!keys.includes(k)) {
        clearTimeout(timers.current[k])
        delete timers.current[k]
      }
    })
    keys.forEach((k) => {
      if (timers.current[k]) return
      const [kind, id] = k.split('|')
      timers.current[k] = setTimeout(
        () => {
          delete timers.current[k]
          dispatch(kind === 'accept' ? { type: 'RESOLVE_MINE', requestId: id } : { type: 'INCOMING_REQUEST', spotId: id })
        },
        kind === 'accept' ? AUTO_ACCEPT_MS : INCOMING_REQUEST_MS,
      )
    })
  }, [wantedKey])

  useEffect(
    () => () => {
      Object.values(timers.current).forEach(clearTimeout)
      timers.current = {}
    },
    [],
  )

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>
}

export function useStore() {
  return useContext(StoreContext)
}

/** Look up a person by id. The tester's own profile comes from state (set in onboarding). */
export function usePerson() {
  const { state } = useContext(StoreContext)
  return (id) => (id === ME ? state.me : peopleById[id])
}
