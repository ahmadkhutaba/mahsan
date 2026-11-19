import { Check, Star } from 'lucide-react'
import { useState } from 'react'
import { AvatarStack } from '../../components/Avatar.jsx'
import { Button, Chip, Screen } from '../../components/ui.jsx'
import { venuesById } from '../../data/venues.js'
import { useT } from '../../i18n/index.jsx'
import { usePerson, useStore } from '../../state/store.jsx'

const TAGS = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5']

const Question = ({ children }) => <h2 className="mb-2 mt-6 text-lg font-semibold text-pine-950">{children}</h2>

function Choice({ options, value, onChange }) {
  const { t } = useT()
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((o) => (
        <Chip key={o} selected={value === o} onClick={() => onChange(o)} className="rounded-2xl! px-2!">{t(`rating.${o}`)}</Chip>
      ))}
    </div>
  )
}

export default function Rating({ requestId }) {
  const { state, dispatch } = useStore()
  const { t } = useT()
  const person = usePerson()
  const request = state.requests.find((r) => r.id === requestId)
  const spot = state.spots.find((s) => s.id === request.spotId)
  const host = person(spot.hostId)
  const [stars, setStars] = useState(0)
  const [safe, setSafe] = useState(null)
  const [match, setMatch] = useState(null)
  const [tags, setTags] = useState([])
  const home = () => dispatch({ type: 'HOME', tab: 'home' })

  if (request.status === 'rated') {
    return (
      <Screen title={t('rating.thanks')} onBack={home}>
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <span className="anim-pop flex h-16 w-16 items-center justify-center rounded-full bg-honey-400 text-pine-950"><Check size={32} aria-hidden="true" /></span>
          <h2 className="mt-4 font-display text-[26px] font-semibold text-pine-950" role="status">{t('rating.sent')}</h2>
          <p className="mt-2 text-base text-ink-soft">{t('rating.sentText')}</p>
          <Button className="mt-7" onClick={home}>{t('rating.another')}</Button>
        </div>
      </Screen>
    )
  }

  return (
    <Screen
      title={t('rating.title')}
      onBack={home}
      footer={
        <Button variant="accent" disabled={!stars} onClick={() => dispatch({ type: 'RATE', requestId, rating: { stars, safe, match, tags } })}>
          {stars ? t('rating.send') : t('rating.pick')}
        </Button>
      }
    >
      <div className="px-5 pb-6 pt-5">
        <div className="flex items-center gap-3 rounded-3xl bg-white p-3 ring-1 ring-cream-200">
          <AvatarStack ids={spot.memberIds} size={40} max={3} />
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold text-pine-950"><bdi>{spot.activity}</bdi></p>
            <p className="truncate text-[15px] text-ink-soft">{t('rating.group', { name: host.firstName, venue: venuesById[spot.venueId].name })}</p>
          </div>
        </div>

        <Question>{t('rating.overall')}</Question>
        <div className="flex justify-between" role="radiogroup" aria-label={t('rating.stars')}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={t('rating.star', { count: n })} onClick={() => setStars(n)} className="flex h-14 w-14 items-center justify-center rounded-full active:bg-honey-100">
              <Star size={40} strokeWidth={1.8} className={n <= stars ? 'text-honey-500' : 'text-cream-300'} fill={n <= stars ? '#f5b544' : 'none'} aria-hidden="true" />
            </button>
          ))}
        </div>
        <p className="mt-1 h-6 text-center text-base font-semibold text-ink" aria-live="polite">{stars ? t(`rating.w${stars}`) : ''}</p>

        <Question>{t('rating.safe')}</Question>
        <Choice options={['yes', 'mostly', 'no']} value={safe} onChange={setSafe} />
        {safe === 'no' && (
          <p className="mt-2 rounded-2xl bg-clay-50 p-3 text-[15px] text-clay-700">
            {t('rating.sorry')}{' '}
            <button type="button" className="font-semibold underline underline-offset-2" onClick={() => dispatch({ type: 'SHEET', sheet: { name: 'safety', mode: 'report', spotId: spot.id } })}>
              {t('rating.reportLink')}
            </button>
            . {t('rating.privately')}
          </p>
        )}

        <Question>{t('rating.match')}</Question>
        <Choice options={['yes', 'partly', 'no']} value={match} onChange={setMatch} />

        <Question>{t('rating.fits')} <span className="text-base font-normal text-ink-soft">{t('common.optional')}</span></Question>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((tag) => (
            <Chip key={tag} selected={tags.includes(tag)} onClick={() => setTags((x) => (x.includes(tag) ? x.filter((y) => y !== tag) : [...x, tag]))}>{t(`rating.${tag}`)}</Chip>
          ))}
        </div>
      </div>
    </Screen>
  )
}
