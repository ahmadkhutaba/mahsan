import { ArrowRight, DoorOpen, Flag, LoaderCircle, ScanFace, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Logo } from '../components/Shell.jsx'
import { Button, SAFE_TOP } from '../components/ui.jsx'
import { LanguageSwitch, useT } from '../i18n/index.jsx'
import { useAuth } from '../state/auth.jsx'
import Legal from './account/Legal.jsx'
import { AgeField, AvatarField, GenderField, InterestsField, LanguagesField, NameField, emptyForm, missingBasics } from './account/fields.jsx'

function TrustPoint({ icon: Icon, title, children }) {
  return (
    <li className="flex gap-3">
      <Icon size={22} className="mt-0.5 shrink-0 text-pine-700" aria-hidden="true" />
      <span><b>{title}</b> {children}</span>
    </li>
  )
}

/** Three steps: who you are, what you are up for, and how trust works. Saved only at the end. */
export default function Onboarding() {
  const auth = useAuth()
  const { t, lang } = useT()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(() => emptyForm(lang))
  const [adult, setAdult] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [legal, setLegal] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const step1Missing = !form.firstName.trim() ? 'about.needName' : !form.ageRange ? 'about.needAge' : null
  const step2Missing = form.languages.length === 0 ? 'about.needLanguage' : null

  const finish = async () => {
    if (missingBasics(form) || !adult || saving) return
    setSaving(true)
    setError(null)
    try {
      await auth.saveOnboarding({ ...form, locale: lang, adult }, auth.config?.terms_version)
    } catch (e) {
      setError(e.key || 'errors.generic')
      setSaving(false)
    }
  }

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
            <NameField form={form} set={set} />
            <AvatarField form={form} set={set} />
            <AgeField form={form} set={set} />
          </>
        )}

        {step === 1 && (
          <>
            <InterestsField form={form} set={set} large />
            <LanguagesField form={form} set={set} />
            <GenderField form={form} set={set} />
          </>
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
            <p className="mt-3 text-sm text-ink-soft">
              {t('legal.accept')}{' '}
              <button type="button" onClick={() => setLegal(true)} className="min-h-[32px] font-semibold text-pine-800 underline underline-offset-4">{t('auth.legal')}</button>
            </p>
            {error && (
              <p role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-clay-100 p-3 text-[15px] font-medium text-clay-700">
                <TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> {t(error)}
              </p>
            )}
          </>
        )}
      </main>

      <footer className="shrink-0 space-y-2 border-t border-cream-200 px-5 pt-3" style={{ paddingBottom: 'calc(var(--safe-bottom) + 14px)' }}>
        {step === 0 && (
          <>
            <Button variant="accent" icon={ArrowRight} flipIcon disabled={!!step1Missing} onClick={() => setStep(1)}>
              {step1Missing ? t(step1Missing) : t('common.continue')}
            </Button>
            <Button variant="ghost" onClick={auth.signOut}>{t('auth.signOut')}</Button>
          </>
        )}
        {step === 1 && (
          <>
            <Button variant="accent" icon={ArrowRight} flipIcon disabled={!!step2Missing} onClick={() => setStep(2)}>
              {step2Missing ? t(step2Missing) : t('common.continue')}
            </Button>
            <Button variant="ghost" onClick={() => setStep(0)}>{t('common.back')}</Button>
          </>
        )}
        {step === 2 && (
          <>
            <Button variant="accent" icon={saving ? LoaderCircle : ArrowRight} flipIcon={!saving} disabled={!adult || saving} onClick={finish} className={saving ? '[&>svg]:animate-spin' : ''}>
              {saving ? t('about.saving') : adult ? t('onboarding.finish') : t('onboarding.confirmAdult')}
            </Button>
            <Button variant="ghost" disabled={saving} onClick={() => setStep(1)}>{t('common.back')}</Button>
          </>
        )}
      </footer>

      {legal && <Legal onBack={() => setLegal(false)} />}
    </div>
  )
}
