import { useState } from 'react'
import { Button, Chip, Sheet, TYPE_ICONS } from '../../components/ui.jsx'
import { TYPES } from '../../data/venues.js'
import { DISTANCE_OPTIONS, EMPTY_FILTERS, TIME_OPTIONS, visibleSpots } from '../../state/helpers.js'
import { useStore } from '../../state/store.jsx'

const Label = ({ children }) => <h3 className="mb-2 mt-5 text-base font-semibold text-pine-950">{children}</h3>

export default function FiltersSheet() {
  const { state, dispatch } = useStore()
  const [draft, setDraft] = useState(state.filters)
  const count = visibleSpots(state.spots, state.city, draft).length

  const toggleType = (id) =>
    setDraft((d) => ({ ...d, types: d.types.includes(id) ? d.types.filter((t) => t !== id) : [...d.types, id] }))

  const apply = () => {
    dispatch({ type: 'FILTERS', filters: draft })
    dispatch({ type: 'CLOSE_SHEET' })
  }

  return (
    <Sheet
      title="Filter spots"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" className="!w-auto shrink-0 px-4" onClick={() => setDraft(EMPTY_FILTERS)}>
            Clear all
          </Button>
          <Button onClick={apply}>{count === 0 ? 'No spots match' : `Show ${count} ${count === 1 ? 'spot' : 'spots'}`}</Button>
        </div>
      }
    >
      <Label>What kind of evening?</Label>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(TYPES).map(([id, t]) => (
          <Chip key={id} icon={TYPE_ICONS[id]} selected={draft.types.includes(id)} onClick={() => toggleType(id)} className="!justify-start !rounded-2xl">
            {t.label}
          </Chip>
        ))}
      </div>

      <Label>Starting when?</Label>
      <div className="grid grid-cols-2 gap-2">
        {TIME_OPTIONS.map((o) => (
          <Chip key={o.id} selected={draft.time === o.id} onClick={() => setDraft((d) => ({ ...d, time: o.id }))} className="!rounded-2xl">
            {o.label}
          </Chip>
        ))}
      </div>

      <Label>How far from you?</Label>
      <div className="grid grid-cols-2 gap-2">
        {DISTANCE_OPTIONS.map((o) => (
          <Chip key={String(o.id)} selected={draft.maxKm === o.id} onClick={() => setDraft((d) => ({ ...d, maxKm: o.id }))} className="!rounded-2xl">
            {o.label}
          </Chip>
        ))}
      </div>
    </Sheet>
  )
}
