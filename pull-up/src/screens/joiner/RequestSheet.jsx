import { Send } from 'lucide-react'
import { useState } from 'react'
import Avatar from '../../components/Avatar.jsx'
import { Button, Sheet, VerifiedMark } from '../../components/ui.jsx'
import { TYPES } from '../../data/venues.js'
import { possessive } from '../../state/helpers.js'
import { usePerson, useStore } from '../../state/store.jsx'

const MAX = 160

export default function RequestSheet({ spotId }) {
  const { state, dispatch } = useStore()
  const person = usePerson()
  const spot = state.spots.find((s) => s.id === spotId)
  const host = person(spot.hostId)
  const me = state.me
  const [message, setMessage] = useState('')
  const starters = ['Hi! I’d love to join 👋', `I can be there by ${spot.startTime}`, 'It’s my first time on Pull Up']

  return (
    <Sheet
      title={`Ask to join ${possessive(host.firstName)} group`}
      footer={
        <Button variant="accent" icon={Send} onClick={() => dispatch({ type: 'REQUEST_JOIN', spotId, message })}>
          Send request
        </Button>
      }
    >
      <p className="text-[15px] text-ink-soft">
        {spot.activity}, tonight at {spot.startTime}. {host.firstName} decides before you are added.
      </p>

      <label htmlFor="join-message" className="mt-5 block text-base font-semibold text-pine-950">
        Say hi <span className="font-normal text-ink-soft">(optional)</span>
      </label>
      <textarea
        id="join-message"
        value={message}
        maxLength={MAX}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder={`A short message for ${host.firstName}`}
        className="mt-2 w-full resize-none rounded-2xl border-2 border-cream-300 bg-white p-3 text-base text-ink placeholder:text-ink-soft/70 focus:border-pine-700 focus:outline-none"
      />
      <div className="mt-1 flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {starters.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setMessage(s)}
              className="min-h-[40px] rounded-full bg-cream-100 px-3 text-sm font-medium text-ink active:bg-cream-200"
            >
              {s}
            </button>
          ))}
        </div>
        <span className="shrink-0 pt-2 text-sm text-ink-soft">{message.length}/{MAX}</span>
      </div>

      <p className="mt-5 text-base font-semibold text-pine-950">What {host.firstName} sees about you</p>
      <div className="mt-2 flex items-center gap-3 rounded-2xl border border-cream-200 bg-white p-3">
        <Avatar id="me" size={52} />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-base font-semibold text-ink">
            {me.firstName} <VerifiedMark verified={me.verified} />
          </p>
          <p className="text-sm text-ink-soft">
            {me.ageRange} · {me.languages.join(', ')}
            {!me.verified && ' · Not verified yet'}
          </p>
          {me.interests.length > 0 && (
            <p className="truncate text-sm text-ink-soft">Into {me.interests.map((t) => TYPES[t].plural.toLowerCase()).join(', ')}</p>
          )}
        </div>
      </div>
      <p className="mt-2 text-sm text-ink-soft">No last name, phone number or location is shared.</p>
    </Sheet>
  )
}
