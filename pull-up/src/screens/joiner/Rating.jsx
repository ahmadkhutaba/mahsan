import { Check, Star } from 'lucide-react'
import { useState } from 'react'
import { AvatarStack } from '../../components/Avatar.jsx'
import { Button, Chip, Screen } from '../../components/ui.jsx'
import { venuesById } from '../../data/venues.js'
import { possessive } from '../../state/helpers.js'
import { usePerson, useStore } from '../../state/store.jsx'

const STAR_WORDS = ['', 'Bad', 'Not great', 'It was ok', 'Good', 'Great evening']
const TAGS = ['Welcoming', 'Easy to find', 'Good conversation', 'Felt a bit awkward', 'Would join them again']

const Question = ({ children }) => <h2 className="mb-2 mt-6 text-lg font-semibold text-pine-950">{children}</h2>

function Choice({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((o) => (
        <Chip key={o} selected={value === o} onClick={() => onChange(o)} className="rounded-2xl! px-2!">{o}</Chip>
      ))}
    </div>
  )
}

export default function Rating({ requestId }) {
  const { state, dispatch } = useStore()
  const person = usePerson()
  const request = state.requests.find((r) => r.id === requestId)
  const spot = state.spots.find((s) => s.id === request.spotId)
  const host = person(spot.hostId)
  const [stars, setStars] = useState(0)
  const [safe, setSafe] = useState(null)
  const [match, setMatch] = useState(null)
  const [tags, setTags] = useState([])
  const [comment, setComment] = useState('')
  const home = () => dispatch({ type: 'HOME', tab: 'home' })

  if (request.status === 'rated') {
    return (
      <Screen title="Thanks!" onBack={home}>
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <span className="anim-pop flex h-16 w-16 items-center justify-center rounded-full bg-honey-400 text-pine-950"><Check size={32} aria-hidden="true" /></span>
          <h2 className="mt-4 font-display text-[26px] font-semibold text-pine-950" role="status">Rating sent</h2>
          <p className="mt-2 text-base text-ink-soft">Your answers help the next person decide whether to pull up a chair.</p>
          <Button className="mt-7" onClick={home}>Find another spot</Button>
        </div>
      </Screen>
    )
  }

  return (
    <Screen
      title="How was your evening?"
      onBack={home}
      footer={
        <Button variant="accent" disabled={!stars} onClick={() => dispatch({ type: 'RATE', requestId, rating: { stars, safe, match, tags, comment } })}>
          {stars ? 'Send rating' : 'Pick a star rating to continue'}
        </Button>
      }
    >
      <div className="px-5 pb-6 pt-5">
        <div className="flex items-center gap-3 rounded-3xl bg-white p-3 ring-1 ring-cream-200">
          <AvatarStack ids={spot.memberIds} size={40} max={3} />
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold text-pine-950">{spot.activity}</p>
            <p className="truncate text-[15px] text-ink-soft">{possessive(host.firstName)} group · {venuesById[spot.venueId].name}</p>
          </div>
        </div>

        <Question>Overall, how was it?</Question>
        <div className="flex justify-between" role="radiogroup" aria-label="Star rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setStars(n)} className="flex h-14 w-14 items-center justify-center rounded-full active:bg-honey-100">
              <Star size={40} strokeWidth={1.8} className={n <= stars ? 'text-honey-500' : 'text-cream-300'} fill={n <= stars ? '#f5b544' : 'none'} aria-hidden="true" />
            </button>
          ))}
        </div>
        <p className="mt-1 h-6 text-center text-base font-semibold text-ink" aria-live="polite">{STAR_WORDS[stars]}</p>

        <Question>Did you feel safe?</Question>
        <Choice options={['Yes', 'Mostly', 'No']} value={safe} onChange={setSafe} />
        {safe === 'No' && (
          <p className="mt-2 rounded-2xl bg-clay-50 p-3 text-[15px] text-clay-700">
            We’re sorry. You can{' '}
            <button type="button" className="font-semibold underline underline-offset-2" onClick={() => dispatch({ type: 'SHEET', sheet: { name: 'safety', mode: 'report', spotId: spot.id } })}>
              report what happened
            </button>{' '}
            privately.
          </p>
        )}

        <Question>Was the group like its description?</Question>
        <Choice options={['Yes', 'Partly', 'No']} value={match} onChange={setMatch} />

        <Question>What fits? <span className="text-base font-normal text-ink-soft">(optional)</span></Question>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((t) => (
            <Chip key={t} selected={tags.includes(t)} onClick={() => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))}>{t}</Chip>
          ))}
        </div>

        <label htmlFor="rating-comment" className="mb-2 mt-6 block text-lg font-semibold text-pine-950">Anything else? <span className="text-base font-normal text-ink-soft">(optional)</span></label>
        <textarea id="rating-comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Only Pull Up sees this" className="w-full resize-none rounded-2xl border-2 border-cream-300 bg-white p-3 text-base focus:border-pine-700 focus:outline-none" />
      </div>
    </Screen>
  )
}
