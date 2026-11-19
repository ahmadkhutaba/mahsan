import { useState } from 'react'
import { Button, Chip, Sheet, TYPE_ICONS } from '../../components/ui.jsx'
import { TYPES } from '../../data/venues.js'
import { useT } from '../../i18n/index.jsx'
import { DISTANCE_OPTIONS, EMPTY_FILTERS, TIME_OPTIONS, visibleSpots } from '../../state/helpers.js'
import { useStore } from '../../state/store.jsx'

const Label = ({ children }) => <h3 className="mb-2 mt-5 text-base font-semibold text-pine-950">{children}</h3>

export default function FiltersSheet() {
  const { state, dispatch } = useStore()
  const { t } = useT()
  const [draft, setDraft] = useState(state.filters)
  const count = visibleSpots(state.spots, state.city, draft).length

  const toggleType = (id) =>
    setDraft((d) => ({ ...d, types: d.types.includes(id) ? d.types.filter((x) => x !== id) : [...d.types, id] }))

  const apply = () => {
    dispatch({ type: 'FILTERS', filters: draft })
    dispatch({ type: 'CLOSE_SHEET' })
  }

  return (
    <Sheet
      title={t('filters.title')}
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" className="w-auto! shrink-0 px-4" onClick={() => setDraft(EMPTY_FILTERS)}>
            {t('filters.clearAll')}
          </Button>
          <Button onClick={apply}>{count === 0 ? t('filters.none') : t('filters.show', { count })}</Button>
        </div>
      }
    >
      <Label>{t('filters.kind')}</Label>
      <div className="grid grid-cols-2 gap-2">
        {Object.keys(TYPES).map((id) => (
          <Chip key={id} icon={TYPE_ICONS[id]} selected={draft.types.includes(id)} onClick={() => toggleType(id)} className="justify-start! rounded-2xl!">
            {t(`types.${id}`)}
          </Chip>
        ))}
      </div>

      <Label>{t('filters.when')}</Label>
      <div className="grid grid-cols-2 gap-2">
        {TIME_OPTIONS.map((id) => (
          <Chip key={id} selected={draft.time === id} onClick={() => setDraft((d) => ({ ...d, time: id }))} className="rounded-2xl!">
            {t(`filters.time_${id}`)}
          </Chip>
        ))}
      </div>

      <Label>{t('filters.far')}</Label>
      <div className="grid grid-cols-2 gap-2">
        {DISTANCE_OPTIONS.map((km) => (
          <Chip key={String(km)} selected={draft.maxKm === km} onClick={() => setDraft((d) => ({ ...d, maxKm: km }))} className="rounded-2xl!">
            {km === null ? t('filters.dist_any') : t('filters.dist_km', { n: km })}
          </Chip>
        ))}
      </div>
    </Sheet>
  )
}
