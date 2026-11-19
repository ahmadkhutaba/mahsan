import { BatteryFull, CalendarHeart, Compass, Inbox, RotateCcw, Signal, Ticket, UserRound, Wifi } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ME } from '../data/people.js'
import { LanguageSwitch, useT } from '../i18n/index.jsx'
import { demoClock } from '../state/helpers.js'
import { useStore } from '../state/store.jsx'

export function Logo({ className = '' }) {
  return (
    <span dir="ltr" className={`font-display font-semibold tracking-tight ${className}`}>
      Pull<span className="text-honey-400"> Up</span>
    </span>
  )
}

export function RoleSwitch({ dark = false }) {
  const { state, dispatch } = useStore()
  const { t } = useT()
  const options = [
    { id: 'joiner', label: t('roles.joiner'), hint: t('roles.joinerHint') },
    { id: 'host', label: t('roles.host'), hint: t('roles.hostHint') },
  ]
  return (
    <div className={`grid grid-cols-2 gap-1 rounded-2xl p-1 ${dark ? 'bg-white/10' : 'bg-cream-200'}`} role="group" aria-label={t('roles.label')}>
      {options.map((o) => {
        const active = state.role === o.id
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
            onClick={() => dispatch({ type: 'ROLE', role: o.id })}
            className={`min-h-[56px] rounded-xl px-2 py-2 text-center transition-colors ${
              active
                ? dark ? 'bg-honey-400 text-pine-950' : 'bg-pine-900 text-cream-50'
                : dark ? 'text-cream-50 active:bg-white/10' : 'text-ink active:bg-cream-300'
            }`}
          >
            <span className="block text-base font-semibold">{o.label}</span>
            <span className={`block text-xs ${active ? 'opacity-80' : 'opacity-70'}`}>{o.hint}</span>
          </button>
        )
      })}
    </div>
  )
}

// Decorative only: shown inside the desktop phone frame, never on a real phone.
function StatusBar() {
  const [time, setTime] = useState(demoClock)
  useEffect(() => {
    const timer = setInterval(() => setTime(demoClock()), 10000)
    return () => clearInterval(timer)
  }, [])
  return (
    <div dir="ltr" aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-[60] hidden h-11 items-center justify-between px-7 text-[13px] font-semibold text-cream-50 sm:flex">
      <span>{time}</span>
      <span className="absolute left-1/2 top-2 h-[26px] w-[104px] -translate-x-1/2 rounded-full bg-black" />
      <span className="flex items-center gap-1.5">
        <Signal size={15} />
        <Wifi size={15} />
        <BatteryFull size={19} />
      </span>
    </div>
  )
}

/** Full screen on a phone; a phone-sized frame with a side panel on larger screens. */
export function PhoneFrame({ children }) {
  const { dispatch } = useStore()
  const { t, dir, lang } = useT()
  const reset = () => dispatch({ type: 'RESET' })

  return (
    <div className="stage flex h-full items-center justify-center sm:gap-12 sm:p-5">
      <aside className="hidden w-[300px] shrink-0 text-cream-50 lg:block">
        <Logo className="text-5xl" />
        <p className="mt-3 text-lg leading-snug text-pine-200">{t('app.tagline')}</p>
        <div className="mt-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-pine-200">{t('app.language')}</p>
          <div className="inline-block"><LanguageSwitch dark /></div>
        </div>
        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-pine-200">{t('roles.testAs')}</p>
          <RoleSwitch dark />
        </div>
        <button
          type="button"
          onClick={reset}
          className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-white/25 px-4 font-semibold text-cream-50 hover:bg-white/10"
        >
          <RotateCcw size={18} aria-hidden="true" /> {t('profile.reset')}
        </button>
        <p className="mt-6 text-sm leading-relaxed text-pine-200">{t('profile.note')}</p>
      </aside>

      <div
        dir={dir}
        lang={lang}
        className="phone relative h-full w-full overflow-hidden bg-cream-50 sm:h-[min(844px,calc(100dvh-40px))] sm:w-[390px] sm:shrink-0 sm:rounded-[46px] sm:shadow-[0_0_0_11px_#050f0b,0_0_0_13px_#2b3a33,0_30px_80px_rgba(0,0,0,0.55)]"
      >
        <StatusBar />
        {children}
      </div>
    </div>
  )
}

const TABS = {
  joiner: [
    { id: 'home', icon: Compass },
    { id: 'plans', icon: CalendarHeart },
    { id: 'profile', icon: UserRound },
  ],
  host: [
    { id: 'spots', icon: Ticket },
    { id: 'requests', icon: Inbox },
    { id: 'profile', icon: UserRound },
  ],
}

export function TabBar() {
  const { state, dispatch } = useStore()
  const { t } = useT()
  const current = state.tabs[state.role]
  const mySpotIds = state.spots.filter((s) => s.hostId === ME).map((s) => s.id)
  const badges = {
    requests: state.requests.filter((r) => r.status === 'pending' && mySpotIds.includes(r.spotId)).length,
    plans: state.requests.filter((r) => r.personId === ME && ['accepted', 'attended'].includes(r.status)).length,
  }

  return (
    <nav
      className="flex shrink-0 border-t border-cream-200 bg-white px-2 pt-1.5"
      style={{ paddingBottom: 'calc(var(--safe-bottom) + 6px)' }}
      aria-label={t('tabs.main')}
    >
      {TABS[state.role].map((tab) => {
        const active = current === tab.id
        const count = badges[tab.id]
        return (
          <button
            key={tab.id}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => dispatch({ type: 'TAB', tab: tab.id })}
            className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[13px] font-semibold ${
              active ? 'text-pine-900' : 'text-ink-soft'
            }`}
          >
            <span className={`relative flex h-8 w-14 items-center justify-center rounded-full ${active ? 'bg-honey-300' : ''}`}>
              <tab.icon size={22} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
              {count > 0 && (
                <span className="absolute -end-0.5 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-clay-600 px-1 text-[11px] font-bold text-white">
                  {count}
                </span>
              )}
            </span>
            {t(`tabs.${tab.id}`)}
          </button>
        )
      })}
    </nav>
  )
}

export function Toast() {
  const { state, dispatch } = useStore()
  const { t } = useT()
  const toast = state.toast

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => dispatch({ type: 'CLEAR_TOAST', id: toast.id }), 4500)
    return () => clearTimeout(timer)
  }, [toast, dispatch])

  if (!toast) return null

  const go = () => {
    dispatch({ type: 'CLEAR_TOAST', id: toast.id })
    if (!toast.go) return
    if (toast.go.tab) {
      dispatch({ type: 'ROLE', role: 'host', tab: toast.go.tab })
    } else {
      if (state.role !== 'joiner') dispatch({ type: 'ROLE', role: 'joiner' })
      dispatch({ type: 'PUSH', screen: toast.go })
    }
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 z-[70] flex justify-center px-4" style={{ top: 'calc(var(--safe-top) + 8px)' }}>
      <button
        type="button"
        onClick={go}
        role="status"
        className="anim-toast pointer-events-auto flex min-h-[52px] max-w-full items-center gap-3 rounded-2xl bg-pine-950 px-4 py-3 text-start text-[15px] font-medium text-cream-50 shadow-xl ring-1 ring-white/15"
      >
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-honey-400" />
        <span>{t(toast.key, toast.vars)}</span>
        {toast.go && <span className="shrink-0 font-semibold text-honey-400">{t('toast.view')}</span>}
      </button>
    </div>
  )
}
