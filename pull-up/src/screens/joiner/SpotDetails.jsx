import { BadgeCheck, CalendarDays, Clock, DoorOpen, Flag, Languages, MapPin, ShieldCheck, Store, Users } from 'lucide-react'
import Avatar from '../../components/Avatar.jsx'
import { BackButton, Button, Card, SAFE_TOP, Screen, SectionTitle, Tag, TYPE_ICONS } from '../../components/ui.jsx'
import { ME } from '../../data/people.js'
import { TYPES, venuesById } from '../../data/venues.js'
import { groupLanguages, groupMix, km, myRequestFor, openLabel, possessive, verifiedSummary } from '../../state/helpers.js'
import { usePerson, useStore } from '../../state/store.jsx'

function Fact({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pine-50 text-pine-800">
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-ink-soft">{label}</p>
        <p className="text-base font-semibold text-ink">{children}</p>
      </div>
    </div>
  )
}

export default function SpotDetails({ spotId }) {
  const { state, dispatch } = useStore()
  const person = usePerson()
  const spot = state.spots.find((s) => s.id === spotId)
  const venue = venuesById[spot.venueId]
  const host = person(spot.hostId)
  const mine = spot.hostId === ME
  const request = myRequestFor(state.requests, spot.id)
  const v = verifiedSummary(spot.memberIds, person)
  const langs = groupLanguages(spot.memberIds)
  const TypeIcon = TYPE_ICONS[spot.type]

  const openPlan = () => dispatch({ type: 'PUSH', screen: { name: 'plan', requestId: request.id } })

  let footer
  if (mine) {
    footer = (
      <Button variant="outline" onClick={() => dispatch({ type: 'ROLE', role: 'host', tab: 'requests' })}>
        This is your spot · Manage requests
      </Button>
    )
  } else if (request?.status === 'pending') {
    footer = <Button variant="soft" onClick={openPlan}>Request sent · See status</Button>
  } else if (request?.status === 'accepted' || request?.status === 'attended') {
    footer = <Button onClick={openPlan}>You’re in · Open your plan</Button>
  } else if (request?.status === 'declined') {
    footer = <Button variant="soft" onClick={openPlan}>See {possessive(host.firstName)} answer</Button>
  } else if (spot.openSpots <= 0) {
    footer = <Button disabled>This group is full</Button>
  } else {
    footer = (
      <>
        <Button variant="accent" onClick={() => dispatch({ type: 'SHEET', sheet: { name: 'request', spotId: spot.id } })}>
          Ask to join · {openLabel(spot.openSpots)}
        </Button>
        <p className="mt-2 text-center text-sm text-ink-soft">{host.firstName} answers before you’re added. No payment.</p>
      </>
    )
  }

  return (
    <Screen
      footer={footer}
      header={
        <header className="glow shrink-0 rounded-b-[28px] px-4 pb-5 text-cream-50" style={SAFE_TOP}>
          <div className="flex items-center justify-between">
            <BackButton />
            <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold">
              <TypeIcon size={16} aria-hidden="true" /> {TYPES[spot.type].label}
            </span>
          </div>
          <div className="px-1">
            <h1 className="mt-2 font-display text-[28px] font-semibold leading-tight">{spot.activity}</h1>
            <p className="mt-1 text-base text-pine-200">
              {venue.name} · {venue.address}, {venue.neighborhood}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[15px] font-semibold">
              <span className="flex items-center gap-1.5"><Clock size={17} className="text-honey-400" aria-hidden="true" /> Tonight, {spot.startTime}</span>
              <span className="flex items-center gap-1.5"><MapPin size={17} className="text-honey-400" aria-hidden="true" /> {km(venue.distanceKm)} away</span>
            </div>
          </div>
        </header>
      }
    >
      <div className="space-y-6 px-5 py-5">
        {/* Who is at the table */}
        <section aria-labelledby="who">
          <div className="flex items-baseline justify-between">
            <SectionTitle><span id="who">Who’s at the table</span></SectionTitle>
            <span className="text-[15px] font-medium text-ink-soft">{spot.memberIds.length} people</span>
          </div>
          <ul className="mt-3 grid grid-cols-3 gap-x-2 gap-y-4">
            {spot.memberIds.map((id) => {
              const p = person(id)
              return (
                <li key={id} className="flex flex-col items-center text-center">
                  <span className="relative">
                    <Avatar id={id} size={76} />
                    {p.verified && (
                      <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-cream-50 p-0.5 text-pine-700">
                        <BadgeCheck size={22} strokeWidth={2.4} fill="#dcebe2" aria-hidden="true" />
                      </span>
                    )}
                  </span>
                  <span className="mt-1.5 text-base font-semibold text-ink">{p.firstName}</span>
                  <span className="text-sm text-ink-soft">
                    {id === spot.hostId ? 'Host · ' : ''}
                    {p.ageRange}
                  </span>
                  <span className={`text-[13px] font-semibold ${p.verified ? 'text-pine-700' : 'text-ink-soft'}`}>
                    {p.verified ? 'Verified' : 'Not verified'}
                  </span>
                </li>
              )
            })}
            {spot.openSpots > 0 && !request && !mine && (
              <li className="flex flex-col items-center text-center">
                <span className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-2 border-dashed border-honey-500 bg-honey-100 font-display text-lg font-semibold text-honey-800">
                  You?
                </span>
                <span className="mt-1.5 text-base font-semibold text-honey-800">{openLabel(spot.openSpots)}</span>
              </li>
            )}
          </ul>

          <Card className="mt-4 divide-y divide-cream-200 !py-1">
            <Fact icon={Users} label="Group mix">{groupMix(spot.memberIds)}</Fact>
            <Fact icon={CalendarDays} label="Age range">{spot.ageRange}</Fact>
            <Fact icon={Languages} label="Languages at the table">{langs.map((l) => l.lang).join(', ')}</Fact>
            <Fact icon={BadgeCheck} label="Verification">
              {v.label}
              <span className="block text-sm font-normal text-ink-soft">Verified means we checked a photo ID against a selfie.</span>
            </Fact>
          </Card>
        </section>

        {/* Vibe */}
        {spot.vibeTags.length > 0 && (
          <section>
            <SectionTitle>The vibe</SectionTitle>
            <div className="mt-3 flex flex-wrap gap-2">
              {spot.vibeTags.map((t) => (
                <Tag key={t} tone="honey">{t}</Tag>
              ))}
            </div>
          </section>
        )}

        {/* Host note */}
        {spot.hostNote && (
          <section>
            <SectionTitle>A note from {mine ? 'you' : host.firstName}</SectionTitle>
            <Card className="mt-3 flex gap-3">
              <Avatar id={spot.hostId} size={44} />
              <p className="text-base leading-relaxed text-ink">“{spot.hostNote}”</p>
            </Card>
          </section>
        )}

        {/* Safety, always on this screen */}
        <section aria-labelledby="safety" className="rounded-3xl bg-pine-50 p-4">
          <h2 id="safety" className="flex items-center gap-2 font-display text-xl font-semibold text-pine-950">
            <ShieldCheck size={22} className="text-pine-700" aria-hidden="true" /> Your safety
          </h2>
          <ul className="mt-3 space-y-3 text-[15px] leading-snug text-ink">
            <li className="flex gap-3"><Store size={20} className="mt-0.5 shrink-0 text-pine-700" aria-hidden="true" /><span><b>Public place.</b> You meet at {venue.name}, not at a private address.</span></li>
            <li className="flex gap-3"><BadgeCheck size={20} className="mt-0.5 shrink-0 text-pine-700" aria-hidden="true" /><span><b>{v.label}.</b> {v.all ? 'Everyone in this group passed the ID check.' : 'Members without a badge have not finished the ID check.'}</span></li>
            <li className="flex gap-3"><DoorOpen size={20} className="mt-0.5 shrink-0 text-pine-700" aria-hidden="true" /><span><b>Leave quietly, any time.</b> One tap, no explanation, the group only sees “can’t make it”.</span></li>
          </ul>
          {!mine && (
            <button
              type="button"
              onClick={() => dispatch({ type: 'SHEET', sheet: { name: 'safety', mode: 'report', spotId: spot.id } })}
              className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-clay-600 bg-white text-base font-semibold text-clay-700 active:bg-clay-50"
            >
              <Flag size={18} aria-hidden="true" /> Report this spot
            </button>
          )}
        </section>
      </div>
    </Screen>
  )
}
