import { CalendarDays, Check, Info, Languages, Star, X } from 'lucide-react'
import Avatar from '../../components/Avatar.jsx'
import { Button, Card, Screen } from '../../components/ui.jsx'
import { useT } from '../../i18n/index.jsx'
import { usePerson, useStore } from '../../state/store.jsx'

const Row = ({ icon: Icon, children }) => (
  <p className="flex items-center gap-3 py-2.5 text-base text-ink"><Icon size={20} className="shrink-0 text-pine-700" aria-hidden="true" /> {children}</p>
)

export default function JoinerProfile({ requestId }) {
  const { state, dispatch } = useStore()
  const { t, list } = useT()
  const person = usePerson()
  const request = state.requests.find((r) => r.id === requestId)
  const spot = state.spots.find((s) => s.id === request.spotId)
  const p = person(request.personId)
  const name = p.firstName
  const full = spot.openSpots <= 0
  const decide = (decision) => dispatch({ type: 'HOST_DECIDE', requestId, decision })

  let footer = null
  if (request.status === 'pending') {
    footer = (
      <>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" icon={X} onClick={() => decide('declined')}>{t('joiner.decline')}</Button>
          <Button variant="accent" icon={Check} disabled={full} onClick={() => decide('accepted')}>{t('joiner.accept')}</Button>
        </div>
        <p className="mt-2 text-center text-sm text-ink-soft">{full ? t('joiner.fullHint') : t('joiner.declineHint', { name })}</p>
      </>
    )
  }

  return (
    <Screen title={t('joiner.title', { name })} subtitle={list([spot.activity, spot.startTime])} footer={footer}>
      <div className="px-5 py-5">
        <div className="flex flex-col items-center text-center">
          <Avatar id={p.id} size={112} />
          <h2 className="mt-3 font-display text-[28px] font-semibold text-pine-950"><bdi>{name}</bdi></h2>
          {request.status !== 'pending' && (
            <span className={`mt-1 rounded-full px-3 py-1 text-sm font-semibold ${request.status === 'accepted' ? 'bg-pine-900 text-cream-50' : 'bg-cream-200 text-ink-soft'}`}>
              {request.status === 'accepted' ? t('joiner.youAccepted') : t('joiner.youDeclined')}
            </span>
          )}
        </div>

        {request.message ? (
          <div className="mt-5">
            <p className="mb-1 text-sm font-semibold text-ink-soft">{t('joiner.messageToYou')}</p>
            <p className="rounded-3xl rounded-es-lg bg-white p-4 text-base leading-relaxed text-ink ring-1 ring-cream-200"><bdi>{request.message}</bdi></p>
          </div>
        ) : (
          <p className="mt-5 rounded-2xl bg-cream-100 p-3 text-[15px] text-ink-soft">{t('joiner.noMessage', { name })}</p>
        )}

        <Card className="mt-5 divide-y divide-cream-200 py-1!">
          <Row icon={CalendarDays}>{t('joiner.age', { age: p.ageRange })}</Row>
          <Row icon={Languages}>{t('joiner.speaks', { langs: p.languages.map((l) => t(`langs.${l}`)).join(', ') })}</Row>
          <Row icon={Star}>
            {p.stats?.joined ? t('joiner.stats', { n: p.stats.joined, rating: p.stats.rating.toFixed(1) }) : t('joiner.statsNew')}
          </Row>
        </Card>

        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-pine-50 p-3 text-[15px] text-ink">
          <Info size={18} className="mt-0.5 shrink-0 text-pine-700" aria-hidden="true" /> {t('joiner.notChecked')}
        </p>

        {p.bio && (
          <div className="mt-5">
            <p className="mb-1 text-sm font-semibold text-ink-soft">{t('joiner.about', { name })}</p>
            <p className="text-base leading-relaxed text-ink"><bdi>{p.bio}</bdi></p>
          </div>
        )}
      </div>
    </Screen>
  )
}
