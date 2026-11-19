import { CalendarHeart, ChevronRight } from 'lucide-react'
import { TabHeader } from '../Profile.jsx'
import { Button, TypeTile } from '../../components/ui.jsx'
import { ME } from '../../data/people.js'
import { venuesById } from '../../data/venues.js'
import { useStore } from '../../state/store.jsx'

const STATUS = {
  pending: { label: 'Waiting for the host', tone: 'bg-cream-200 text-ink' },
  accepted: { label: 'You’re in', tone: 'bg-pine-900 text-cream-50' },
  declined: { label: 'Not this time', tone: 'bg-cream-200 text-ink-soft' },
  attended: { label: 'Rate the evening', tone: 'bg-honey-400 text-pine-950' },
  rated: { label: 'Rated', tone: 'bg-pine-100 text-pine-900' },
  cancelled: { label: 'Cancelled', tone: 'bg-cream-200 text-ink-soft' },
  left: { label: 'You left', tone: 'bg-cream-200 text-ink-soft' },
}
const ORDER = ['attended', 'accepted', 'pending', 'declined', 'rated', 'left', 'cancelled']

export default function MyPlans() {
  const { state, dispatch } = useStore()
  const mine = state.requests
    .filter((r) => r.personId === ME)
    .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status))

  return (
    <div className="flex h-full flex-col">
      <TabHeader title="My plans" subtitle="Spots you asked to join" />
      <main className="flex-1 overflow-y-auto px-4 py-4">
        {mine.length === 0 ? (
          <div className="mt-10 flex flex-col items-center px-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-honey-100 text-honey-800"><CalendarHeart size={30} aria-hidden="true" /></span>
            <h2 className="mt-4 font-display text-xl font-semibold text-pine-950">No plans yet</h2>
            <p className="mt-1 text-base text-ink-soft">When you ask to join a group, it shows up here.</p>
            <Button className="mt-5" onClick={() => dispatch({ type: 'TAB', tab: 'home' })}>See tonight’s spots</Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {mine.map((r) => {
              const spot = state.spots.find((s) => s.id === r.spotId)
              const st = STATUS[r.status]
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'PUSH', screen: r.status === 'attended' ? { name: 'rating', requestId: r.id } : { name: 'plan', requestId: r.id } })}
                    className="flex w-full items-center gap-3 rounded-3xl border border-cream-200 bg-white p-4 text-left active:bg-cream-100"
                  >
                    <TypeTile type={spot.type} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-lg font-semibold leading-snug text-pine-950">{spot.activity}</span>
                      <span className="block truncate text-[15px] text-ink-soft">{venuesById[spot.venueId].name} · {spot.startTime}</span>
                      <span className={`mt-1.5 inline-block rounded-full px-3 py-1 text-sm font-semibold ${st.tone}`}>{st.label}</span>
                    </span>
                    <ChevronRight size={22} className="shrink-0 text-ink-soft" aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
