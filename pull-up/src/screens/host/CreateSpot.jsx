import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import SpotCard from '../../components/SpotCard.jsx'
import { Button, Chip, Screen, TYPE_ICONS } from '../../components/ui.jsx'
import { ME, MY_FRIENDS } from '../../data/people.js'
import { CITIES, TYPES, venues } from '../../data/venues.js'
import { useStore } from '../../state/store.jsx'

const TIMES = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30']
const PLACEHOLDER = {
  bar: 'e.g. Drinks and trivia',
  restaurant: 'e.g. Sushi dinner for four',
  boardgames: 'e.g. Catan night',
  sports: 'e.g. Padel doubles',
}

const Label = ({ children, optional, htmlFor }) => (
  <label htmlFor={htmlFor} className="mb-2 mt-6 block text-lg font-semibold text-pine-950">
    {children} {optional && <span className="text-base font-normal text-ink-soft">(optional)</span>}
  </label>
)

function Stepper({ label, hint, value, min, max, onChange }) {
  const btn = 'flex h-12 w-12 items-center justify-center rounded-full bg-pine-100 text-pine-900 active:bg-pine-200 disabled:bg-cream-100 disabled:text-cream-300'
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-cream-200 bg-white p-3">
      <div>
        <p className="text-base font-semibold text-ink">{label}</p>
        <p className="text-sm text-ink-soft">{hint}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" aria-label={`Fewer: ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className={btn}><Minus size={20} aria-hidden="true" /></button>
        <span className="w-7 text-center font-display text-2xl font-semibold text-pine-950" aria-live="polite">{value}</span>
        <button type="button" aria-label={`More: ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className={btn}><Plus size={20} aria-hidden="true" /></button>
      </div>
    </div>
  )
}

const field = 'w-full rounded-2xl border-2 border-cream-300 bg-white p-3 text-base focus:border-pine-700 focus:outline-none'

export default function CreateSpot({ type: initialType }) {
  const { state, dispatch } = useStore()
  const [city, setCity] = useState(state.city)
  const [d, setD] = useState({ type: initialType || null, activity: '', venueId: null, startTime: null, groupSize: 3, openSpots: 1, note: '', findUs: '' })
  const set = (patch) => setD((x) => ({ ...x, ...patch }))
  const options = venues.filter((v) => v.city === city && v.type === d.type)
  const missing = !d.type ? 'Choose a type' : !d.activity.trim() ? 'Name your plan' : !d.venueId ? 'Choose a place' : !d.startTime ? 'Choose a time' : null

  const preview = { ...d, hostId: ME, memberIds: [ME, ...MY_FRIENDS.slice(0, d.groupSize - 1)] }

  return (
    <Screen
      title="Post an open spot"
      footer={
        <Button variant="accent" disabled={!!missing} onClick={() => dispatch({ type: 'CREATE_SPOT', draft: d })}>
          {missing ? `${missing} to continue` : 'Post spot'}
        </Button>
      }
    >
      <div className="px-5 pb-6">
        <Label>What are you doing?</Label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(TYPES).map(([id, t]) => (
            <Chip key={id} icon={TYPE_ICONS[id]} selected={d.type === id} onClick={() => set({ type: id, venueId: null })} className="justify-start! rounded-2xl!">{t.label}</Chip>
          ))}
        </div>

        <Label htmlFor="activity">Give it a name</Label>
        <input id="activity" value={d.activity} maxLength={40} onChange={(e) => set({ activity: e.target.value })} placeholder={PLACEHOLDER[d.type] || 'e.g. Trivia night'} autoComplete="off" className={`${field} min-h-[52px]`} />

        <Label>Where?</Label>
        <div className="mb-2 flex rounded-full bg-cream-200 p-1" role="group" aria-label="City">
          {CITIES.map((c) => (
            <button key={c} type="button" aria-pressed={city === c} onClick={() => { setCity(c); set({ venueId: null }) }} className={`min-h-[40px] flex-1 rounded-full text-[15px] font-semibold ${city === c ? 'bg-pine-900 text-cream-50' : 'text-ink'}`}>{c}</button>
          ))}
        </div>
        {!d.type ? (
          <p className="rounded-2xl bg-cream-100 p-3 text-[15px] text-ink-soft">Choose a type first to see places.</p>
        ) : (
          <div className="space-y-2">
            {options.map((v) => (
              <button key={v.id} type="button" aria-pressed={d.venueId === v.id} onClick={() => set({ venueId: v.id })} className={`flex min-h-[60px] w-full flex-col justify-center rounded-2xl border-2 px-4 py-2 text-left ${d.venueId === v.id ? 'border-pine-900 bg-pine-50' : 'border-cream-300 bg-white'}`}>
                <span className="text-base font-semibold text-ink">{v.name}</span>
                <span className="text-sm text-ink-soft">{v.address} · {v.neighborhood}</span>
              </button>
            ))}
          </div>
        )}

        <Label>What time tonight?</Label>
        <div className="grid grid-cols-4 gap-2">
          {TIMES.map((t) => (
            <Chip key={t} selected={d.startTime === t} onClick={() => set({ startTime: t })} className="px-0!">{t}</Chip>
          ))}
        </div>

        <Label>Your group</Label>
        <div className="space-y-2">
          <Stepper label="People already coming" hint="Including you" value={d.groupSize} min={2} max={5} onChange={(groupSize) => set({ groupSize })} />
          <Stepper label="Open spots" hint="How many can join" value={d.openSpots} min={1} max={4} onChange={(openSpots) => set({ openSpots })} />
        </div>

        <Label htmlFor="note" optional>Note for people joining</Label>
        <textarea id="note" rows={3} maxLength={200} value={d.note} onChange={(e) => set({ note: e.target.value })} placeholder="Who are you, what’s the plan, what does it cost?" className={`${field} resize-none`} />

        <Label htmlFor="findus" optional>How will they find you?</Label>
        <input id="findus" value={d.findUs} maxLength={80} onChange={(e) => set({ findUs: e.target.value })} placeholder="e.g. Table by the window, ask for me" autoComplete="off" className={`${field} min-h-[52px]`} />
        <p className="mt-1 text-sm text-ink-soft">Only shown to people you accept.</p>

        <p className="mb-2 mt-6 text-lg font-semibold text-pine-950">This is how it will look</p>
        <SpotCard spot={preview} preview />
      </div>
    </Screen>
  )
}
