import { CalendarHeart, ChevronRight } from 'lucide-react'
import { TabHeader } from '../Profile.jsx'
import { Button, TypeTile } from '../../components/ui.jsx'
import { ME } from '../../data/people.js'
import { venuesById } from '../../data/venues.js'
import { useT } from '../../i18n/index.jsx'
import { useStore } from '../../state/store.jsx'

const TONE = {
  pending: 'bg-cream-200 text-ink',
  accepted: 'bg-pine-900 text-cream-50',
  declined: 'bg-cream-200 text-ink-soft',
  attended: 'bg-honey-400 text-pine-950',
  rated: 'bg-pine-100 text-pine-900',
  cancelled: 'bg-cream-200 text-ink-soft',
  left: 'bg-cream-200 text-ink-soft',
}
const ORDER = ['attended', 'accepted', 'pending', 'declined', 'rated', 'left', 'cancelled']

export default function MyPlans() {
  const { state, dispatch } = useStore()
  const { t, list } = useT()
  const mine = state.requests
    .filter((r) => r.personId === ME)
    .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status))

  return (
    <div className="flex h-full flex-col">
      <TabHeader title={t('plans.title')} subtitle={t('plans.subtitle')} />
      <main className="flex-1 overflow-y-auto px-4 py-4">
        {mine.length === 0 ? (
          <div className="mt-10 flex flex-col items-center px-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-honey-100 text-honey-800"><CalendarHeart size={30} aria-hidden="true" /></span>
            <h2 className="mt-4 font-display text-xl font-semibold text-pine-950">{t('plans.emptyTitle')}</h2>
            <p className="mt-1 text-base text-ink-soft">{t('plans.emptyText')}</p>
            <Button className="mt-5" onClick={() => dispatch({ type: 'TAB', tab: 'home' })}>{t('plans.see')}</Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {mine.map((r) => {
              const spot = state.spots.find((s) => s.id === r.spotId)
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'PUSH', screen: r.status === 'attended' ? { name: 'rating', requestId: r.id } : { name: 'plan', requestId: r.id } })}
                    className="flex w-full items-center gap-3 rounded-3xl border border-cream-200 bg-white p-4 text-start active:bg-cream-100"
                  >
                    <TypeTile type={spot.type} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-lg font-semibold leading-snug text-pine-950"><bdi>{spot.activity}</bdi></span>
                      <span className="block truncate text-[15px] text-ink-soft">{list([venuesById[spot.venueId].name, spot.startTime])}</span>
                      <span className={`mt-1.5 inline-block rounded-full px-3 py-1 text-sm font-semibold ${TONE[r.status]}`}>{t(`plans.s_${r.status}`)}</span>
                    </span>
                    <ChevronRight size={22} className="shrink-0 text-ink-soft rtl:-scale-x-100" aria-hidden="true" />
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
