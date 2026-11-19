import { ArrowRight, Check, DoorOpen, FastForward, Flag, ScanFace } from 'lucide-react'
import { useState } from 'react'
import Avatar from '../components/Avatar.jsx'
import { Logo } from '../components/Shell.jsx'
import { Button, DemoControl, SAFE_TOP, TYPE_ICONS } from '../components/ui.jsx'
import { TYPES } from '../data/venues.js'
import { LanguageSwitch, useT } from '../i18n/index.jsx'
import { useStore } from '../state/store.jsx'

const AVATARS = [
  { skin: 3, hair: 'curly', hairColor: '#3b2a20', bg: '#f5b544', shirt: '#0f3b2d' },
  { skin: 2, hair: 'long', hairColor: '#4a2f1d', bg: '#fadfd3', shirt: '#d5633b' },
  { skin: 2, hair: 'short', hairColor: '#231a15', bg: '#dcebe2', shirt: '#14503c', beard: true },
  { skin: 3, hair: 'hijab', hairColor: '#1b6a4e', bg: '#fdecc8', shirt: '#14503c' },
  { skin: 1, hair: 'bob', hairColor: '#d8b25a', bg: '#ecdff2', shirt: '#5b3a70', glasses: true },
  { skin: 4, hair: 'buzz', hairColor: '#1d1512', bg: '#fdecc8', shirt: '#b94a26' },
  { skin: 3, hair: 'bun', hairColor: '#1d1512', bg: '#dcebe2', shirt: '#23845f' },
  { skin: 1, hair: 'short', hairColor: '#b0672d', bg: '#fadfd3', shirt: '#963a1c', glasses: true },
]

function TrustPoint({ icon: Icon, title, children }) {
  return (
    <li className="flex gap-3">
      <Icon size={22} className="mt-0.5 shrink-0 text-pine-700" aria-hidden="true" />
      <span><b>{title}</b> {children}</span>
    </li>
  )
}

export default function Onboarding() {
  const { dispatch } = useStore()
  const { t } = useT()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(0)
  const [interests, setInterests] = useState([])
  const [adult, setAdult] = useState(false)

  const finish = () =>
    dispatch({ type: 'ONBOARD', me: { firstName: name.trim() || t('common.you'), avatar: AVATARS[avatar], interests } })

  const toggle = (id) => setInterests((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]))

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-cream-50">
      <header className="glow shrink-0 rounded-b-[28px] px-5 pb-5 text-cream-50" style={SAFE_TOP}>
        <div className="flex items-center justify-between gap-3">
          <Logo className="text-2xl" />
          <LanguageSwitch dark />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex flex-1 gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-honey-400' : 'bg-white/20'}`} />
            ))}
          </div>
          <span className="shrink-0 text-sm font-semibold text-pine-200">{t('onboarding.step', { n: step + 1 })}</span>
        </div>
        <h1 className="mt-4 font-display text-[28px] font-semibold leading-tight">{t(`onboarding.t${step + 1}`)}</h1>
        <p className="mt-1 text-base text-pine-200">{t(`onboarding.s${step + 1}`)}</p>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-5">
        {step === 0 && (
          <>
            <label htmlFor="first-name" className="block text-base font-semibold text-pine-950">{t('onboarding.name')}</label>
            <input
              id="first-name"
              dir={name ? 'auto' : undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              autoComplete="given-name"
              enterKeyHint="next"
              placeholder={t('onboarding.namePlaceholder')}
              className="mt-2 min-h-[56px] w-full rounded-2xl border-2 border-cream-300 bg-white px-4 text-lg focus:border-pine-700 focus:outline-none"
            />
            <p className="mt-6 text-base font-semibold text-pine-950">{t('onboarding.picture')}</p>
            <div className="mt-3 grid grid-cols-4 gap-3" role="radiogroup" aria-label={t('onboarding.avatar')}>
              {AVATARS.map((a, i) => (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={avatar === i}
                  aria-label={t('onboarding.avatarN', { n: i + 1 })}
                  onClick={() => setAvatar(i)}
                  className={`relative flex aspect-square items-center justify-center rounded-full ${avatar === i ? 'ring-4 ring-pine-900 ring-offset-2 ring-offset-cream-50' : ''}`}
                >
                  <Avatar spec={a} size={68} />
                  {avatar === i && (
                    <span className="absolute -bottom-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full bg-pine-900 text-cream-50"><Check size={15} strokeWidth={3} aria-hidden="true" /></span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <div className="space-y-3">
            {Object.keys(TYPES).map((id) => {
              const Icon = TYPE_ICONS[id]
              const on = interests.includes(id)
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(id)}
                  className={`flex min-h-[76px] w-full items-center gap-4 rounded-3xl border-2 p-4 text-start ${on ? 'border-pine-900 bg-pine-50' : 'border-cream-300 bg-white'}`}
                >
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${on ? 'bg-pine-900 text-cream-50' : 'bg-cream-100 text-ink'}`}><Icon size={24} aria-hidden="true" /></span>
                  <span className="flex-1">
                    <span className="block text-lg font-semibold text-pine-950">{t(`types.${id}`)}</span>
                    <span className="block text-[15px] text-ink-soft">{t(`onboarding.h_${id}`)}</span>
                  </span>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-pine-900 bg-pine-900 text-cream-50' : 'border-cream-300'}`}>{on && <Check size={16} strokeWidth={3} aria-hidden="true" />}</span>
                </button>
              )
            })}
          </div>
        )}

        {step === 2 && (
          <>
            <ul className="space-y-4 text-base leading-snug text-ink">
              <TrustPoint icon={ScanFace} title={t('onboarding.trust1Title')}>{t('onboarding.trust1')}</TrustPoint>
              <TrustPoint icon={DoorOpen} title={t('onboarding.trust2Title')}>{t('onboarding.trust2')}</TrustPoint>
              <TrustPoint icon={Flag} title={t('onboarding.trust3Title')}>{t('onboarding.trust3')}</TrustPoint>
            </ul>
            <label className={`mt-6 flex min-h-[64px] cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 ${adult ? 'border-pine-900 bg-pine-50' : 'border-cream-300 bg-white'}`}>
              <input type="checkbox" className="h-6 w-6 shrink-0 accent-pine-900" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
              <span>
                <span className="block text-base font-semibold text-pine-950">{t('onboarding.adult')}</span>
                <span className="block text-sm text-ink-soft">{t('onboarding.adultHint')}</span>
              </span>
            </label>
          </>
        )}
      </main>

      <footer className="shrink-0 space-y-2 border-t border-cream-200 px-5 pt-3" style={{ paddingBottom: 'calc(var(--safe-bottom) + 14px)' }}>
        {step === 0 && (
          <>
            <Button variant="accent" icon={ArrowRight} flipIcon disabled={!name.trim()} onClick={() => setStep(1)}>
              {name.trim() ? t('common.continue') : t('onboarding.enterName')}
            </Button>
            <DemoControl icon={FastForward} onClick={finish}>{t('onboarding.skip')}</DemoControl>
          </>
        )}
        {step === 1 && (
          <>
            <Button variant="accent" icon={ArrowRight} flipIcon onClick={() => setStep(2)}>
              {interests.length ? t('common.continue') : t('onboarding.continueNone')}
            </Button>
            <Button variant="ghost" onClick={() => setStep(0)}>{t('common.back')}</Button>
          </>
        )}
        {step === 2 && (
          <>
            <Button variant="accent" icon={ArrowRight} flipIcon disabled={!adult} onClick={finish}>
              {adult ? t('onboarding.finish') : t('onboarding.confirmAdult')}
            </Button>
            <Button variant="ghost" onClick={() => setStep(1)}>{t('common.back')}</Button>
          </>
        )}
      </footer>
    </div>
  )
}
