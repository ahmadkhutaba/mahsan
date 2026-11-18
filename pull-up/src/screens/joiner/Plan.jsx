import { Check, ChevronRight, Clock, DoorOpen, Flag, FastForward, HeartHandshake, MapPin, MessageCircle, Navigation, PartyPopper, ShieldCheck, Star, ThumbsDown } from 'lucide-react'
import Avatar, { AvatarStack } from '../../components/Avatar.jsx'
import SpotCard from '../../components/SpotCard.jsx'
import { Button, Card, DemoControl, Screen, SectionTitle } from '../../components/ui.jsx'
import { ME } from '../../data/people.js'
import { venuesById } from '../../data/venues.js'
import { km, myRequestFor, possessive, visibleSpots, EMPTY_FILTERS } from '../../state/helpers.js'
import { usePerson, useStore } from '../../state/store.jsx'

function Summary({ spot, venue }) {
  return (
    <Card>
      <p className="font-display text-lg font-semibold text-pine-950">{spot.activity}</p>
      <p className="text-[15px] text-ink-soft">{venue.name} · {venue.address}</p>
      <div className="mt-2 flex gap-4 text-[15px] font-semibold text-ink">
        <span className="flex items-center gap-1.5"><Clock size={17} className="text-pine-700" aria-hidden="true" /> Tonight, {spot.startTime}</span>
        <span className="flex items-center gap-1.5"><MapPin size={17} className="text-pine-700" aria-hidden="true" /> {km(venue.distanceKm)}</span>
      </div>
    </Card>
  )
}

function Waiting({ request, spot, venue, host }) {
  const { dispatch } = useStore()
  return (
    <div className="px-5 py-6">
      <div className="flex flex-col items-center text-center">
        <span className="relative flex h-28 w-28 items-center justify-center">
          <span className="anim-ring absolute h-24 w-24 rounded-full bg-honey-400" />
          <Avatar id={spot.hostId} size={96} className="relative" />
        </span>
        <h2 className="mt-4 font-display text-[26px] font-semibold leading-tight text-pine-950" role="status">
          Waiting for {host.firstName}
        </h2>
        <p className="mt-2 max-w-[280px] text-base text-ink-soft">
          Your request is with the host. Most hosts answer within a few minutes, and we’ll tell you right away.
        </p>
      </div>

      {request.message && (
        <div className="mt-6">
          <p className="mb-1 text-sm font-semibold text-ink-soft">Your message</p>
          <p className="rounded-2xl rounded-br-md bg-pine-100 p-3 text-base text-ink">{request.message}</p>
        </div>
      )}

      <div className="mt-5"><Summary spot={spot} venue={venue} /></div>

      <div className="mt-6 space-y-2">
        <Button variant="outline" onClick={() => dispatch({ type: 'HOME', tab: 'home' })}>Keep browsing</Button>
        <Button variant="ghost" className="text-clay-700!" onClick={() => dispatch({ type: 'CANCEL_REQUEST', requestId: request.id })}>
          Cancel request
        </Button>
        <DemoControl icon={ThumbsDown} onClick={() => dispatch({ type: 'RESOLVE_MINE', requestId: request.id, decline: true })}>
          Host declines instead
        </DemoControl>
      </div>
    </div>
  )
}

function Accepted({ request, spot, venue, host }) {
  const { dispatch } = useStore()
  const person = usePerson()
  const lastMessages = spot.chat.filter((m) => !m.system).slice(-2)
  const safety = (mode) => dispatch({ type: 'SHEET', sheet: { name: 'safety', mode, spotId: spot.id, requestId: request.id } })

  return (
    <div>
      <div className="glow rounded-b-[28px] px-5 pb-6 pt-2 text-center text-cream-50">
        <span className="anim-pop mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-honey-400 text-pine-950">
          <PartyPopper size={28} aria-hidden="true" />
        </span>
        <h2 className="mt-3 font-display text-[30px] font-semibold leading-tight" role="status">You’re in!</h2>
        <p className="mt-1 text-base text-pine-200">{host.firstName} accepted your request. The table is expecting you.</p>
        <div className="mt-4 flex justify-center"><AvatarStack ids={[...spot.memberIds, ME]} size={46} max={6} /></div>
      </div>

      <div className="space-y-4 px-5 py-5">
        <section className="rounded-3xl bg-honey-100 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-honey-800">
            <Navigation size={16} aria-hidden="true" /> How to find us
          </h3>
          <p className="mt-1 font-display text-[21px] font-semibold leading-snug text-pine-950">{spot.findUsHint || `Ask for ${host.firstName} when you arrive.`}</p>
        </section>

        <Card>
          <p className="font-display text-lg font-semibold text-pine-950">{spot.activity}</p>
          <p className="mt-1 flex items-center gap-2 text-base text-ink"><Clock size={18} className="text-pine-700" aria-hidden="true" /> Tonight at {spot.startTime}</p>
          <p className="mt-1 flex items-start gap-2 text-base text-ink"><MapPin size={18} className="mt-0.5 shrink-0 text-pine-700" aria-hidden="true" /> {venue.name}, {venue.address}, {venue.neighborhood}</p>
          <Button variant="soft" className="mt-3" icon={Navigation} onClick={() => dispatch({ type: 'TOAST', text: 'Directions would open in your maps app' })}>
            Get directions · {km(venue.distanceKm)}
          </Button>
        </Card>

        <section>
          <SectionTitle>Group chat</SectionTitle>
          <button
            type="button"
            onClick={() => dispatch({ type: 'PUSH', screen: { name: 'chat', spotId: spot.id, requestId: request.id } })}
            className="mt-2 block w-full rounded-3xl border border-cream-200 bg-white p-4 text-left active:bg-cream-100"
          >
            <ul className="space-y-3">
              {lastMessages.map((m, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <Avatar id={m.fromId} size={32} />
                  <p className="min-w-0 text-[15px] leading-snug text-ink">
                    <span className="font-semibold">{m.fromId === ME ? 'You' : person(m.fromId).firstName}</span>{' '}
                    <span className="text-ink-soft">{m.time}</span>
                    <span className="block">{m.text}</span>
                  </p>
                </li>
              ))}
            </ul>
            <span className="mt-3 flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-pine-900 text-base font-semibold text-cream-50">
              <MessageCircle size={19} aria-hidden="true" /> Open chat
            </span>
          </button>
        </section>

        <section className="rounded-3xl bg-pine-50 p-4" aria-labelledby="plan-safety">
          <h3 id="plan-safety" className="flex items-center gap-2 font-display text-xl font-semibold text-pine-950">
            <ShieldCheck size={22} className="text-pine-700" aria-hidden="true" /> Changed your mind? That’s fine.
          </h3>
          <p className="mt-1 text-[15px] text-ink">You can leave before or during the evening. Nobody is told why.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => safety('leave')} className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-white text-base font-semibold text-pine-900 ring-2 ring-pine-900 active:bg-pine-100">
              <DoorOpen size={19} aria-hidden="true" /> Leave quietly
            </button>
            <button type="button" onClick={() => safety('report')} className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-white text-base font-semibold text-clay-700 ring-2 ring-clay-600 active:bg-clay-50">
              <Flag size={19} aria-hidden="true" /> Report
            </button>
          </div>
        </section>

        <DemoControl icon={FastForward} onClick={() => dispatch({ type: 'END_EVENT', requestId: request.id })}>
          Skip to after the evening
        </DemoControl>
      </div>
    </div>
  )
}

function Declined({ spot, host }) {
  const { state, dispatch } = useStore()
  const venue = venuesById[spot.venueId]
  const others = visibleSpots(state.spots, venue.city, EMPTY_FILTERS)
    .filter((s) => s.id !== spot.id && s.hostId !== ME && s.openSpots > 0 && !myRequestFor(state.requests, s.id))
    .sort((a, b) => (b.type === spot.type) - (a.type === spot.type))
    .slice(0, 2)

  return (
    <div className="px-5 py-6">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-honey-100 text-honey-800">
          <HeartHandshake size={32} aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-display text-[26px] font-semibold leading-tight text-pine-950" role="status">
          Not this table, this time
        </h2>
        <p className="mt-2 max-w-[300px] text-base text-ink-soft">
          {possessive(host.firstName)} group went another way for tonight. Hosts often have a single seat and several
          requests, so this says nothing about you.
        </p>
      </div>

      {others.length > 0 ? (
        <section className="mt-7">
          <SectionTitle>Still open near you</SectionTitle>
          <ul className="mt-3 space-y-3">
            {others.map((s) => (
              <li key={s.id}>
                <SpotCard spot={s} onClick={() => dispatch({ type: 'REPLACE', screen: { name: 'spot', spotId: s.id } })} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6 space-y-2">
        <Button onClick={() => dispatch({ type: 'HOME', tab: 'home' })}>See all spots tonight</Button>
        <Button variant="ghost" onClick={() => dispatch({ type: 'START_HOSTING', spotType: spot.type })}>Or open a spot of your own</Button>
      </div>
    </div>
  )
}

function Closed({ icon: Icon, title, text, action }) {
  const { dispatch } = useStore()
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-pine-100 text-pine-800"><Icon size={30} aria-hidden="true" /></span>
      <h2 className="mt-4 font-display text-2xl font-semibold text-pine-950">{title}</h2>
      <p className="mt-2 text-base text-ink-soft">{text}</p>
      {action}
      <Button variant={action ? 'ghost' : 'primary'} className="mt-3" onClick={() => dispatch({ type: 'HOME', tab: 'home' })}>
        Back to tonight’s spots
      </Button>
    </div>
  )
}

export default function Plan({ requestId }) {
  const { state, dispatch } = useStore()
  const person = usePerson()
  const request = state.requests.find((r) => r.id === requestId)
  const spot = state.spots.find((s) => s.id === request.spotId)
  const venue = venuesById[spot.venueId]
  const host = person(spot.hostId)
  const props = { request, spot, venue, host }

  const titles = {
    pending: 'Request sent',
    accepted: 'Your plan tonight',
    declined: 'Request update',
    attended: 'How was it?',
    rated: 'Thanks for rating',
    cancelled: 'Request cancelled',
    left: 'You left the group',
  }

  return (
    <Screen title={titles[request.status]} subtitle={request.status === 'accepted' ? undefined : spot.activity}>
      {request.status === 'pending' && <Waiting {...props} />}
      {request.status === 'accepted' && <Accepted {...props} />}
      {request.status === 'declined' && <Declined {...props} />}
      {request.status === 'attended' && (
        <Closed
          icon={Star}
          title="The evening is over"
          text={`Tell us how it went with ${possessive(host.firstName)} group. It takes under a minute.`}
          action={<Button variant="accent" className="mt-6" icon={ChevronRight} onClick={() => dispatch({ type: 'REPLACE', screen: { name: 'rating', requestId } })}>Rate the evening</Button>}
        />
      )}
      {request.status === 'rated' && <Closed icon={Check} title="Rating sent" text="Thanks. Your answers help the next person decide." />}
      {request.status === 'cancelled' && <Closed icon={Check} title="Request cancelled" text={`${host.firstName} won’t see it anymore. You can ask again or pick another spot.`} />}
      {request.status === 'left' && <Closed icon={DoorOpen} title="You’ve left the group" text="They only see that you can’t make it. Take care tonight." />}
    </Screen>
  )
}
