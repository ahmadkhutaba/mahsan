import { Send } from 'lucide-react'
import { useState } from 'react'
import Avatar from '../../components/Avatar.jsx'
import { Button, Sheet } from '../../components/ui.jsx'
import { useT } from '../../i18n/index.jsx'
import { usePerson, useStore } from '../../state/store.jsx'

const MAX = 160

export default function RequestSheet({ spotId }) {
  const { state, dispatch } = useStore()
  const { t, list } = useT()
  const person = usePerson()
  const spot = state.spots.find((s) => s.id === spotId)
  const host = person(spot.hostId)
  const me = state.me
  const [message, setMessage] = useState('')
  const name = host.firstName
  const starters = [t('request.starter1'), t('request.starter2', { time: spot.startTime }), t('request.starter3')]

  return (
    <Sheet
      title={t('request.title', { name })}
      footer={
        <Button variant="accent" icon={Send} flipIcon onClick={() => dispatch({ type: 'REQUEST_JOIN', spotId, message })}>
          {t('request.send')}
        </Button>
      }
    >
      <p className="text-[15px] text-ink-soft">{t('request.intro', { activity: spot.activity, time: spot.startTime, name })}</p>

      <label htmlFor="join-message" className="mt-5 block text-base font-semibold text-pine-950">
        {t('request.sayHi')} <span className="font-normal text-ink-soft">{t('common.optional')}</span>
      </label>
      <textarea
        id="join-message"
        dir={message ? 'auto' : undefined}
        value={message}
        maxLength={MAX}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder={t('request.placeholder', { name })}
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
        <span dir="ltr" className="shrink-0 pt-2 text-sm text-ink-soft">{message.length}/{MAX}</span>
      </div>

      <p className="mt-5 text-base font-semibold text-pine-950">{t('request.whatSees', { name })}</p>
      <div className="mt-2 flex items-center gap-3 rounded-2xl border border-cream-200 bg-white p-3">
        <Avatar id="me" size={52} />
        <div className="min-w-0">
          <p className="text-base font-semibold text-ink"><bdi>{me.firstName}</bdi></p>
          <p className="text-sm text-ink-soft">{list([me.ageRange, me.languages.map((l) => t(`langs.${l}`)).join(', ')])}</p>
        </div>
      </div>
      <p className="mt-2 text-sm text-ink-soft">{t('request.notShared')}</p>
    </Sheet>
  )
}
