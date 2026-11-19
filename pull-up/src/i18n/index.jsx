import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DICTS, isolate, translate } from './translate.js'

// All copy lives in en.js and he.js. Components never hold their own text.

export const LANGUAGES = [
  { id: 'en', label: 'English', dir: 'ltr', locale: 'en-GB' },
  { id: 'he', label: 'עברית', dir: 'rtl', locale: 'he-IL' },
]
const TIME_ZONE = 'Asia/Jerusalem'
const STORAGE_KEY = 'pullup.lang'

function translateOrWarn(lang, key, vars) {
  const text = translate(lang, key, vars)
  if (text === null) {
    if (import.meta.env?.DEV) console.warn(`[i18n] missing key: ${key}`)
    return key
  }
  return text
}

function initialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && DICTS[saved]) return saved
  } catch {
    /* private mode: fall through */
  }
  const browser = typeof navigator !== 'undefined' ? navigator.language || '' : ''
  return browser.toLowerCase().startsWith('he') ? 'he' : 'en'
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initialLanguage)
  const meta = LANGUAGES.find((l) => l.id === lang)

  const setLang = useCallback((next) => {
    if (!DICTS[next]) return
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* not saved; the choice still applies for this visit */
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = meta.dir
  }, [lang, meta.dir])

  const value = useMemo(() => {
    const t = (key, vars) => translateOrWarn(lang, key, vars)
    const fmt = (options) => new Intl.DateTimeFormat(meta.locale, { timeZone: TIME_ZONE, ...options })
    return {
      lang,
      dir: meta.dir,
      setLang,
      t,
      /** Join short facts with a middle dot, in reading order. Each part keeps its own direction. */
      list: (parts) => parts.filter(Boolean).map(isolate).join(' · '),
      /** Keep a value (a name, "25–29", "20:30") intact inside text of the other direction. */
      iso: isolate,
      formatDate: (date) => fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(date),
      formatDistance: (kmValue) =>
        kmValue < 1 ? t('common.m', { n: Math.round(kmValue * 1000) }) : t('common.km', { n: kmValue.toFixed(1) }),
    }
  }, [lang, meta, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useT() {
  return useContext(I18nContext)
}

export function LanguageSwitch({ dark = false }) {
  const { lang, setLang, t } = useT()
  return (
    <div className={`flex rounded-full p-1 ${dark ? 'bg-white/10' : 'bg-cream-200'}`} role="group" aria-label={t('app.language')}>
      {LANGUAGES.map((l) => (
        <button
          key={l.id}
          type="button"
          lang={l.id}
          aria-pressed={lang === l.id}
          onClick={() => setLang(l.id)}
          className={`min-h-[40px] rounded-full px-3 text-[15px] font-semibold ${
            lang === l.id
              ? dark ? 'bg-cream-50 text-pine-950' : 'bg-pine-900 text-cream-50'
              : dark ? 'text-cream-50' : 'text-ink'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
