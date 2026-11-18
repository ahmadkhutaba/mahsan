import { ArrowRight, BadgeCheck, Camera, Check, FastForward, IdCard, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import Avatar from '../components/Avatar.jsx'
import { Logo } from '../components/Shell.jsx'
import { Button, DemoControl, SAFE_TOP, TYPE_ICONS } from '../components/ui.jsx'
import { TYPES } from '../data/venues.js'
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

const INTEREST_HINTS = {
  bar: 'A drink, trivia, live music',
  restaurant: 'A shared table and good food',
  boardgames: 'Catan, Codenames, cards',
  sports: 'Volleyball, a run, a kickabout',
}

export default function Onboarding() {
  const { dispatch } = useStore()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(0)
  const [interests, setInterests] = useState([])
  const [verify, setVerify] = useState('idle') // idle | checking | done

  useEffect(() => {
    if (verify !== 'checking') return
    const t = setTimeout(() => setVerify('done'), 1800)
    return () => clearTimeout(t)
  }, [verify])

  const finish = (verified) =>
    dispatch({ type: 'ONBOARD', me: { firstName: name.trim() || 'You', avatar: AVATARS[avatar], interests, verified } })

  const toggle = (id) => setInterests((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]))

  const titles = ['First, who’s pulling up?', 'What are you up for?', 'One last thing: trust']
  const subtitles = [
    'Groups see your first name and picture. Never your last name.',
    'Pick as many as you like. You can change this later.',
    'People are meeting strangers here. A verified badge is what makes a group say yes.',
  ]

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-cream-50">
      <header className="glow shrink-0 rounded-b-[28px] px-5 pb-5 text-cream-50" style={SAFE_TOP}>
        <div className="flex items-center justify-between">
          <Logo className="text-2xl" />
          <span className="text-[15px] font-semibold text-pine-200">Step {step + 1} of 3</span>
        </div>
        <div className="mt-3 flex gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-honey-400' : 'bg-white/20'}`} />
          ))}
        </div>
        <h1 className="mt-4 font-display text-[28px] font-semibold leading-tight">{titles[step]}</h1>
        <p className="mt-1 text-base text-pine-200">{subtitles[step]}</p>
      </header>

      <main key={step} className="anim-screen flex-1 overflow-y-auto px-5 py-5">
        {step === 0 && (
          <>
            <label htmlFor="first-name" className="block text-base font-semibold text-pine-950">Your first name</label>
            <input
              id="first-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              autoComplete="off"
              placeholder="e.g. Noa"
              className="mt-2 min-h-[56px] w-full rounded-2xl border-2 border-cream-300 bg-white px-4 text-lg focus:border-pine-700 focus:outline-none"
            />
            <p className="mt-6 text-base font-semibold text-pine-950">Pick a picture</p>
            <div className="mt-3 grid grid-cols-4 gap-3" role="radiogroup" aria-label="Avatar">
              {AVATARS.map((a, i) => (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={avatar === i}
                  aria-label={`Avatar ${i + 1}`}
                  onClick={() => setAvatar(i)}
                  className={`relative flex aspect-square items-center justify-center rounded-full ${avatar === i ? 'ring-4 ring-pine-900 ring-offset-2 ring-offset-cream-50' : ''}`}
                >
                  <Avatar spec={a} size={68} />
                  {avatar === i && (
                    <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-pine-900 text-cream-50"><Check size={15} strokeWidth={3} aria-hidden="true" /></span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <div className="space-y-3">
            {Object.entries(TYPES).map(([id, t]) => {
              const Icon = TYPE_ICONS[id]
              const on = interests.includes(id)
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(id)}
                  className={`flex min-h-[76px] w-full items-center gap-4 rounded-3xl border-2 p-4 text-left ${on ? 'border-pine-900 bg-pine-50' : 'border-cream-300 bg-white'}`}
                >
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${on ? 'bg-pine-900 text-cream-50' : 'bg-cream-100 text-ink'}`}><Icon size={24} aria-hidden="true" /></span>
                  <span className="flex-1">
                    <span className="block text-lg font-semibold text-pine-950">{t.label}</span>
                    <span className="block text-[15px] text-ink-soft">{INTEREST_HINTS[id]}</span>
                  </span>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-pine-900 bg-pine-900 text-cream-50' : 'border-cream-300'}`}>{on && <Check size={16} strokeWidth={3} aria-hidden="true" />}</span>
                </button>
              )
            })}
          </div>
        )}

        {step === 2 && (
          <>
            <div className="flex items-center gap-4 rounded-3xl bg-white p-4 ring-1 ring-cream-200">
              <span className="relative">
                <Avatar spec={AVATARS[avatar]} size={72} />
                {verify === 'done' && (
                  <span className="anim-pop absolute -bottom-0.5 -right-0.5 rounded-full bg-cream-50 p-0.5 text-pine-700"><BadgeCheck size={24} strokeWidth={2.4} fill="#dcebe2" aria-hidden="true" /></span>
                )}
              </span>
              <div>
                <p className="font-display text-2xl font-semibold text-pine-950">{name.trim() || 'You'}</p>
                <p className={`text-[15px] font-semibold ${verify === 'done' ? 'text-pine-700' : 'text-ink-soft'}`} role="status">
                  {verify === 'done' ? 'Verified' : verify === 'checking' ? 'Checking…' : 'Not verified yet'}
                </p>
              </div>
            </div>

            <ul className="mt-5 space-y-4 text-base text-ink">
              <li className="flex gap-3"><IdCard size={22} className="mt-0.5 shrink-0 text-pine-700" aria-hidden="true" /><span><b>Photo of your ID.</b> Used once for the check, then deleted.</span></li>
              <li className="flex gap-3"><Camera size={22} className="mt-0.5 shrink-0 text-pine-700" aria-hidden="true" /><span><b>A quick selfie.</b> So we know the ID is yours.</span></li>
              <li className="flex gap-3"><ShieldCheck size={22} className="mt-0.5 shrink-0 text-pine-700" aria-hidden="true" /><span><b>Others only see the badge.</b> Never your ID, last name or age.</span></li>
            </ul>
          </>
        )}
      </main>

      <footer className="shrink-0 space-y-2 border-t border-cream-200 px-5 pt-3" style={{ paddingBottom: 'calc(var(--safe-bottom) + 14px)' }}>
        {step === 0 && (
          <>
            <Button variant="accent" icon={ArrowRight} disabled={!name.trim()} onClick={() => setStep(1)}>
              {name.trim() ? 'Continue' : 'Enter your first name'}
            </Button>
            <DemoControl icon={FastForward} onClick={() => finish(true)}>Skip the intro</DemoControl>
          </>
        )}
        {step === 1 && (
          <>
            <Button variant="accent" icon={ArrowRight} onClick={() => setStep(2)}>{interests.length ? 'Continue' : 'Continue without choosing'}</Button>
            <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
          </>
        )}
        {step === 2 && verify === 'idle' && (
          <>
            <Button variant="accent" icon={BadgeCheck} onClick={() => setVerify('checking')}>Verify me now</Button>
            <Button variant="ghost" onClick={() => finish(false)}>Not now, I’ll browse unverified</Button>
          </>
        )}
        {step === 2 && verify === 'checking' && (
          <Button disabled><LoaderCircle size={20} className="animate-spin" aria-hidden="true" /> Checking your ID…</Button>
        )}
        {step === 2 && verify === 'done' && (
          <Button variant="accent" icon={ArrowRight} onClick={() => finish(true)}>See tonight’s spots</Button>
        )}
      </footer>
    </div>
  )
}
