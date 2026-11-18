import { SendHorizontal, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Avatar from '../../components/Avatar.jsx'
import { Screen } from '../../components/ui.jsx'
import { ME } from '../../data/people.js'
import { venuesById } from '../../data/venues.js'
import { usePerson, useStore } from '../../state/store.jsx'

export default function Chat({ spotId, requestId }) {
  const { state, dispatch } = useStore()
  const person = usePerson()
  const spot = state.spots.find((s) => s.id === spotId)
  const [text, setText] = useState('')
  const scroller = useRef(null)

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight })
  }, [spot.chat.length])

  const send = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    dispatch({ type: 'SEND_CHAT', spotId, text })
    setText('')
  }

  return (
    <Screen
      title={spot.activity}
      subtitle={`${spot.memberIds.length + 1} people · ${venuesById[spot.venueId].name}`}
      scrollRef={scroller}
      right={
        <button
          type="button"
          onClick={() => dispatch({ type: 'SHEET', sheet: { name: 'safety', mode: 'menu', spotId, requestId } })}
          className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 text-sm font-semibold text-cream-50 active:bg-white/20"
        >
          <ShieldCheck size={18} aria-hidden="true" /> Safety
        </button>
      }
      footer={
        <form onSubmit={send} className="flex items-center gap-2">
          <label htmlFor="chat-input" className="sr-only">Message</label>
          <input
            id="chat-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message the group"
            autoComplete="off"
            className="min-h-[52px] flex-1 rounded-full border-2 border-cream-300 bg-white px-4 text-base focus:border-pine-700 focus:outline-none"
          />
          <button type="submit" aria-label="Send" disabled={!text.trim()} className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-pine-900 text-cream-50 disabled:bg-cream-300 disabled:text-ink-soft">
            <SendHorizontal size={22} aria-hidden="true" />
          </button>
        </form>
      }
    >
      <ul className="space-y-3 px-4 py-4">
        {spot.chat.map((m, i) => {
          if (m.system) {
            return <li key={i} className="py-1 text-center text-sm font-medium text-ink-soft">{m.text}</li>
          }
          const mine = m.fromId === ME
          return (
            <li key={i} className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
              {!mine && <Avatar id={m.fromId} size={34} />}
              <div className={`max-w-[76%] rounded-3xl px-4 py-2.5 ${mine ? 'rounded-br-lg bg-pine-900 text-cream-50' : 'rounded-bl-lg bg-white text-ink ring-1 ring-cream-200'}`}>
                {!mine && <p className="text-sm font-semibold text-pine-700">{person(m.fromId).firstName}</p>}
                <p className="text-base leading-snug">{m.text}</p>
                <p className={`mt-0.5 text-xs ${mine ? 'text-pine-200' : 'text-ink-soft'}`}>{m.time}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </Screen>
  )
}
