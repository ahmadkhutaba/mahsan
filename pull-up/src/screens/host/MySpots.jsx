import { Clock, Plus, Ticket } from 'lucide-react'
import Avatar from '../../components/Avatar.jsx'
import { TabHeader } from '../Profile.jsx'
import { Button, Card, TypeTile, useOpenLabel } from '../../components/ui.jsx'
import { ME } from '../../data/people.js'
import { venuesById } from '../../data/venues.js'
import { useT } from '../../i18n/index.jsx'
import { usePerson, useStore } from '../../state/store.jsx'

export default function MySpots() {
  const { state, dispatch } = useStore()
  const { t } = useT()
  const openLabel = useOpenLabel()
  const person = usePerson()
  const spots = state.spots.filter((s) => s.hostId === ME)

  return (
    <div className="flex h-full flex-col">
      <TabHeader title={t('host.title')} subtitle={t('host.subtitle')} />
      <main className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {spots.length === 0 && (
          <div className="mt-6 flex flex-col items-center px-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-honey-100 text-honey-800"><Ticket size={30} aria-hidden="true" /></span>
            <h2 className="mt-4 font-display text-xl font-semibold text-pine-950">{t('host.emptyTitle')}</h2>
            <p className="mt-1 text-base text-ink-soft">{t('host.emptyText')}</p>
          </div>
        )}
        {spots.map((spot) => {
          const venue = venuesById[spot.venueId]
          const pending = state.requests.filter((r) => r.spotId === spot.id && r.status === 'pending').length
          const joiners = spot.joinerIds || []
          return (
            <Card key={spot.id}>
              <div className="flex items-start gap-3">
                <TypeTile type={spot.type} />
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-[19px] font-semibold leading-snug text-pine-950"><bdi>{spot.activity}</bdi></h2>
                  <p className="text-[15px] text-ink-soft"><bdi>{venue.name}, {t(`cities.${venue.city}`)}</bdi></p>
                  <p className="mt-1 flex items-center gap-1.5 text-[15px] font-medium text-ink"><Clock size={16} className="text-pine-700" aria-hidden="true" /> {t('spot.tonightAt', { time: spot.startTime })}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${spot.openSpots > 0 ? 'bg-honey-400 text-pine-950' : 'bg-pine-900 text-cream-50'}`}>{openLabel(spot.openSpots)}</span>
              </div>
              {joiners.length > 0 && (
                <ul className="mt-3 space-y-2 border-t border-cream-200 pt-3">
                  {joiners.map((id) => (
                    <li key={id} className="flex items-center gap-2 text-[15px] font-medium text-ink"><Avatar id={id} size={30} /> {t('host.joining', { name: person(id).firstName })}</li>
                  ))}
                </ul>
              )}
              <Button variant={pending ? 'primary' : 'soft'} className="mt-3" onClick={() => dispatch({ type: 'TAB', tab: 'requests' })}>
                {pending ? t('host.waiting', { count: pending }) : t('host.noNew')}
              </Button>
            </Card>
          )
        })}
        <Button variant="accent" icon={Plus} onClick={() => dispatch({ type: 'PUSH', screen: { name: 'create' } })}>{t('host.post')}</Button>
      </main>
    </div>
  )
}
