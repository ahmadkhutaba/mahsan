import { Armchair, Plus, SlidersHorizontal } from 'lucide-react'
import SpotCard from '../../components/SpotCard.jsx'
import { Logo } from '../../components/Shell.jsx'
import { Button, SAFE_TOP, TYPE_ICONS } from '../../components/ui.jsx'
import { ME } from '../../data/people.js'
import { CITIES, TYPES } from '../../data/venues.js'
import { useT } from '../../i18n/index.jsx'
import { EMPTY_FILTERS, activeFilterCount, myRequestFor, visibleSpots } from '../../state/helpers.js'
import { useStore } from '../../state/store.jsx'

export default function Home() {
  const { state, dispatch } = useStore()
  const { t, formatDate } = useT()
  const { city, filters } = state
  const spots = visibleSpots(state.spots, city, filters)
  const filterCount = activeFilterCount(filters)
  const onlyType = filters.types.length === 1 ? filters.types[0] : undefined
  const cityName = t(`cities.${city}`)

  const toggleType = (type) => {
    const types = filters.types.includes(type) ? filters.types.filter((x) => x !== type) : [...filters.types, type]
    dispatch({ type: 'FILTERS', filters: { ...filters, types } })
  }

  const typeChip = (selected) =>
    `flex min-h-[44px] shrink-0 items-center gap-2 rounded-full px-4 text-[15px] font-semibold transition-colors ${
      selected ? 'bg-honey-400 text-pine-950' : 'bg-white/10 text-cream-50 active:bg-white/20'
    }`

  return (
    <div className="flex h-full flex-col">
      <header className="glow shrink-0 rounded-b-[28px] px-5 pb-4 text-cream-50" style={SAFE_TOP}>
        <div className="flex items-center justify-between">
          <Logo className="text-2xl" />
          <div className="flex rounded-full bg-white/10 p-1" role="group" aria-label={t('home.city')}>
            {CITIES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={city === c}
                onClick={() => dispatch({ type: 'CITY', city: c })}
                className={`min-h-[40px] rounded-full px-4 text-[15px] font-semibold ${
                  city === c ? 'bg-cream-50 text-pine-950' : 'text-cream-50'
                }`}
              >
                {t(`cities.${c}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[15px] text-pine-200">{formatDate(new Date())}</p>
            <h1 className="font-display text-[30px] font-semibold leading-tight">{t('home.title')}</h1>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SHEET', sheet: { name: 'filters' } })}
            className="relative flex h-12 shrink-0 items-center gap-2 rounded-full bg-cream-50 px-4 text-[15px] font-semibold text-pine-950 active:bg-cream-200"
          >
            <SlidersHorizontal size={19} aria-hidden="true" />
            {t('home.filters')}
            {filterCount > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-clay-600 px-1 text-xs font-bold text-white">
                {filterCount}
              </span>
            )}
          </button>
        </div>

        <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5">
          <button
            type="button"
            aria-pressed={filters.types.length === 0}
            onClick={() => dispatch({ type: 'FILTERS', filters: { ...filters, types: [] } })}
            className={typeChip(filters.types.length === 0)}
          >
            {t('home.all')}
          </button>
          {Object.keys(TYPES).map((id) => {
            const Icon = TYPE_ICONS[id]
            const selected = filters.types.includes(id)
            return (
              <button key={id} type="button" aria-pressed={selected} onClick={() => toggleType(id)} className={typeChip(selected)}>
                <Icon size={18} aria-hidden="true" />
                {t(`types.${id}_plural`)}
              </button>
            )
          })}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4">
        <p className="mb-3 px-1 text-[15px] font-medium text-ink-soft" aria-live="polite">
          {spots.length === 0 ? t('home.noMatch') : t('home.count', { count: spots.length, city: cityName })}
        </p>

        {spots.length === 0 ? (
          <div className="mt-4 flex flex-col items-center px-4 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-honey-100 text-honey-800">
              <Armchair size={30} aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-display text-2xl font-semibold text-pine-950">{t('home.emptyTitle')}</h2>
            <p className="mt-1 text-base text-ink-soft">{t('home.emptyText', { city: cityName })}</p>
            <Button variant="accent" icon={Plus} className="mt-5" onClick={() => dispatch({ type: 'START_HOSTING', spotType: onlyType })}>
              {t('home.openOwn')}
            </Button>
            {filterCount > 0 && (
              <Button variant="ghost" className="mt-2" onClick={() => dispatch({ type: 'FILTERS', filters: EMPTY_FILTERS })}>
                {t('home.clear')}
              </Button>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {spots.map((spot) => (
              <li key={spot.id}>
                <SpotCard
                  spot={spot}
                  status={spot.hostId === ME ? 'mine' : myRequestFor(state.requests, spot.id)?.status}
                  onClick={() => dispatch({ type: 'PUSH', screen: { name: 'spot', spotId: spot.id } })}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
