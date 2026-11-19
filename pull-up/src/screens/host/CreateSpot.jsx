import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import SpotCard from '../../components/SpotCard.jsx'
import { Button, Chip, Screen, TYPE_ICONS } from '../../components/ui.jsx'
import { ME, MY_FRIENDS } from '../../data/people.js'
import { CITIES, TYPES, venues } from '../../data/venues.js'
import { useT } from '../../i18n/index.jsx'
import { useStore } from '../../state/store.jsx'

const TIMES = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30']

function Label({ children, optional, htmlFor }) {
  const { t } = useT()
  return (
    <label htmlFor={htmlFor} className="mb-2 mt-6 block text-lg font-semibold text-pine-950">
      {children} {optional && <span className="text-base font-normal text-ink-soft">{t('common.optional')}</span>}
    </label>
  )
}

function Stepper({ label, hint, value, min, max, onChange }) {
  const { t } = useT()
  const btn = 'flex h-12 w-12 items-center justify-center rounded-full bg-pine-100 text-pine-900 active:bg-pine-200 disabled:bg-cream-100 disabled:text-cream-300'
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-cream-200 bg-white p-3">
      <div>
        <p className="text-base font-semibold text-ink">{label}</p>
        <p className="text-sm text-ink-soft">{hint}</p>
      </div>
      <div dir="ltr" className="flex shrink-0 items-center gap-2">
        <button type="button" aria-label={t('create.fewer', { label })} disabled={value <= min} onClick={() => onChange(value - 1)} className={btn}><Minus size={20} aria-hidden="true" /></button>
        <span className="w-7 text-center font-display text-2xl font-semibold text-pine-950" aria-live="polite">{value}</span>
        <button type="button" aria-label={t('create.more', { label })} disabled={value >= max} onClick={() => onChange(value + 1)} className={btn}><Plus size={20} aria-hidden="true" /></button>
      </div>
    </div>
  )
}

const field = 'w-full rounded-2xl border-2 border-cream-300 bg-white p-3 text-base focus:border-pine-700 focus:outline-none'

export default function CreateSpot({ type: initialType }) {
  const { state, dispatch } = useStore()
  const { t, list } = useT()
  const [city, setCity] = useState(state.city)
  const [d, setD] = useState({ type: initialType || null, activity: '', venueId: null, startTime: null, groupSize: 3, openSpots: 1, note: '', findUs: '' })
  const set = (patch) => setD((x) => ({ ...x, ...patch }))
  const options = venues.filter((v) => v.city === city && v.type === d.type)
  const missing = !d.type ? 'm_type' : !d.activity.trim() ? 'm_name' : !d.venueId ? 'm_place' : !d.startTime ? 'm_time' : null

  const preview = { ...d, hostId: ME, memberIds: [ME, ...MY_FRIENDS.slice(0, d.groupSize - 1)] }

  return (
    <Screen
      title={t('create.title')}
      footer={
        <Button variant="accent" disabled={!!missing} onClick={() => dispatch({ type: 'CREATE_SPOT', draft: d })}>
          {missing ? t(`create.${missing}`) : t('create.post')}
        </Button>
      }
    >
      <div className="px-5 pb-6">
        <Label>{t('create.doing')}</Label>
        <div className="grid grid-cols-2 gap-2">
          {Object.keys(TYPES).map((id) => (
            <Chip key={id} icon={TYPE_ICONS[id]} selected={d.type === id} onClick={() => set({ type: id, venueId: null })} className="justify-start! rounded-2xl!">{t(`types.${id}`)}</Chip>
          ))}
        </div>

        <Label htmlFor="activity">{t('create.nameIt')}</Label>
        <input id="activity" dir={d.activity ? 'auto' : undefined} value={d.activity} maxLength={40} onChange={(e) => set({ activity: e.target.value })} placeholder={t(`create.ph_${d.type || 'default'}`)} autoComplete="off" className={`${field} min-h-[52px]`} />

        <Label>{t('create.where')}</Label>
        <div className="mb-2 flex rounded-full bg-cream-200 p-1" role="group" aria-label={t('home.city')}>
          {CITIES.map((c) => (
            <button key={c} type="button" aria-pressed={city === c} onClick={() => { setCity(c); set({ venueId: null }) }} className={`min-h-[40px] flex-1 rounded-full text-[15px] font-semibold ${city === c ? 'bg-pine-900 text-cream-50' : 'text-ink'}`}>{t(`cities.${c}`)}</button>
          ))}
        </div>
        {!d.type ? (
          <p className="rounded-2xl bg-cream-100 p-3 text-[15px] text-ink-soft">{t('create.chooseType')}</p>
        ) : (
          <div className="space-y-2">
            {options.map((v) => (
              <button key={v.id} type="button" aria-pressed={d.venueId === v.id} onClick={() => set({ venueId: v.id })} className={`flex min-h-[60px] w-full flex-col justify-center rounded-2xl border-2 px-4 py-2 text-start ${d.venueId === v.id ? 'border-pine-900 bg-pine-50' : 'border-cream-300 bg-white'}`}>
                <span className="text-base font-semibold text-ink"><bdi>{v.name}</bdi></span>
                <span className="text-sm text-ink-soft"><bdi>{list([v.address, v.neighborhood])}</bdi></span>
              </button>
            ))}
          </div>
        )}

        <Label>{t('create.time')}</Label>
        <div className="grid grid-cols-4 gap-2">
          {TIMES.map((time) => (
            <Chip key={time} selected={d.startTime === time} onClick={() => set({ startTime: time })} className="px-0!">{time}</Chip>
          ))}
        </div>

        <Label>{t('create.group')}</Label>
        <div className="space-y-2">
          <Stepper label={t('create.already')} hint={t('create.alreadyHint')} value={d.groupSize} min={2} max={5} onChange={(groupSize) => set({ groupSize })} />
          <Stepper label={t('create.open')} hint={t('create.openHint')} value={d.openSpots} min={1} max={4} onChange={(openSpots) => set({ openSpots })} />
        </div>

        <Label htmlFor="note" optional>{t('create.note')}</Label>
        <textarea id="note" dir={d.note ? 'auto' : undefined} rows={3} maxLength={200} value={d.note} onChange={(e) => set({ note: e.target.value })} placeholder={t('create.notePh')} className={`${field} resize-none`} />

        <Label htmlFor="findus" optional>{t('create.findUs')}</Label>
        <input id="findus" dir={d.findUs ? 'auto' : undefined} value={d.findUs} maxLength={80} onChange={(e) => set({ findUs: e.target.value })} placeholder={t('create.findUsPh')} autoComplete="off" className={`${field} min-h-[52px]`} />
        <p className="mt-1 text-sm text-ink-soft">{t('create.findUsHint')}</p>

        <p className="mb-2 mt-6 text-lg font-semibold text-pine-950">{t('create.preview')}</p>
        <SpotCard spot={preview} preview />
      </div>
    </Screen>
  )
}
