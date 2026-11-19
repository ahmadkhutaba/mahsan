import { LoaderCircle, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Logo } from '../../components/Shell.jsx'
import { Button } from '../../components/ui.jsx'
import { LanguageSwitch, useT } from '../../i18n/index.jsx'
import { TEST_LOGIN_ENABLED } from '../../lib/supabase.js'
import { useAuth } from '../../state/auth.jsx'
import Legal from './Legal.jsx'

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.5 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.500-4.800 7.200l7.600 5.900c4.500-4.100 7-10.200 7-17.600z" />
      <path fill="#FBBC05" d="M10.500 28.600A14.500 14.500 0 0 1 9.500 24c0-1.600.300-3.200.800-4.600l-7.900-6.200A24 24 0 0 0 0 24c0 3.900.900 7.500 2.600 10.800l7.900-6.200z" />
      <path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.600-5.900c-2.100 1.400-4.900 2.300-8.300 2.300-6.300 0-11.600-4.200-13.500-9.900l-7.900 6.200C6.500 42.600 14.600 48 24 48z" />
    </svg>
  )
}

/** Shown while loading, when signed out, and when the account could not be loaded. */
export default function SignIn() {
  const auth = useAuth()
  const { t } = useT()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [legal, setLegal] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const run = async (action) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(e.key || 'errors.generic')
      setBusy(false)
    }
  }

  const problem = error || (auth.status === 'error' ? auth.errorKey : null)

  return (
    <div className="glow absolute inset-0 z-30 flex flex-col text-cream-50" style={{ paddingTop: 'calc(var(--safe-top) + 10px)', paddingBottom: 'calc(var(--safe-bottom) + 16px)' }}>
      <div className="flex items-center justify-between px-5">
        <Logo className="text-2xl" />
        <LanguageSwitch dark />
      </div>

      <div className="flex flex-1 flex-col justify-center px-6">
        <h1 className="font-display text-[34px] font-semibold leading-tight">{t('auth.title')}</h1>
        <p className="mt-3 text-lg leading-snug text-pine-200">{t('auth.text')}</p>
      </div>

      <div className="space-y-3 px-5">
        {problem && (
          <p role="alert" className="flex items-start gap-2 rounded-2xl bg-clay-100 p-3 text-[15px] font-medium text-clay-700">
            <TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> {t(problem)}
          </p>
        )}

        {auth.status === 'unconfigured' ? (
          <p role="alert" className="rounded-2xl bg-clay-100 p-3 text-[15px] font-medium text-clay-700">{t('auth.unconfigured')}</p>
        ) : auth.status === 'loading' || auth.status === 'ready' ? (
          <p role="status" className="flex min-h-[52px] items-center justify-center gap-2 text-base text-pine-200">
            <LoaderCircle size={20} className="animate-spin" aria-hidden="true" /> {t('auth.loading')}
          </p>
        ) : auth.status === 'error' ? (
          <>
            <Button variant="accent" onClick={auth.retry}>{t('auth.retry')}</Button>
            <Button variant="ghost" className="text-cream-50!" onClick={auth.signOut}>{t('auth.signOut')}</Button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(auth.signInWithGoogle)}
              className="flex min-h-[56px] w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 text-base font-semibold text-ink active:bg-cream-100 disabled:opacity-70"
            >
              {busy ? <LoaderCircle size={20} className="animate-spin" aria-hidden="true" /> : <GoogleMark />}
              {t('auth.google')}
            </button>
            <p className="text-center text-sm leading-snug text-pine-200">{t('auth.why')}</p>

            {TEST_LOGIN_ENABLED && (
              <form
                className="space-y-2 rounded-2xl border border-dashed border-white/30 p-3"
                onSubmit={(e) => { e.preventDefault(); run(() => auth.signInForTests(email, password)) }}
              >
                <p className="text-sm font-semibold text-pine-200">{t('auth.testTitle')}</p>
                <input aria-label={t('auth.testEmail')} type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('auth.testEmail')} autoComplete="off" className="min-h-[44px] w-full rounded-xl bg-white px-3 text-base text-ink" />
                <input aria-label={t('auth.testPassword')} type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('auth.testPassword')} autoComplete="off" className="min-h-[44px] w-full rounded-xl bg-white px-3 text-base text-ink" />
                <Button variant="soft" type="submit" disabled={busy || !email || !password}>{t('auth.testGo')}</Button>
              </form>
            )}
          </>
        )}

        <button type="button" onClick={() => setLegal(true)} className="mx-auto block min-h-[44px] text-sm font-semibold text-pine-200 underline underline-offset-4">
          {t('auth.legal')}
        </button>
      </div>

      {legal && <div className="text-ink"><Legal onBack={() => setLegal(false)} /></div>}
    </div>
  )
}
