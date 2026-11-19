import { Check } from 'lucide-react'
import Avatar from '../../components/Avatar.jsx'
import { ALL_TYPES, Chip, TYPE_ICONS } from '../../components/ui.jsx'
import { useT } from '../../i18n/index.jsx'

export const AVATARS = [
  { skin: 3, hair: 'curly', hairColor: '#3b2a20', bg: '#f5b544', shirt: '#0f3b2d' },
  { skin: 2, hair: 'long', hairColor: '#4a2f1d', bg: '#fadfd3', shirt: '#d5633b' },
  { skin: 2, hair: 'short', hairColor: '#231a15', bg: '#dcebe2', shirt: '#14503c', beard: true },
  { skin: 3, hair: 'hijab', hairColor: '#1b6a4e', bg: '#fdecc8', shirt: '#14503c' },
  { skin: 1, hair: 'bob', hairColor: '#d8b25a', bg: '#ecdff2', shirt: '#5b3a70', glasses: true },
  { skin: 4, hair: 'buzz', hairColor: '#1d1512', bg: '#fdecc8', shirt: '#b94a26' },
  { skin: 3, hair: 'bun', hairColor: '#1d1512', bg: '#dcebe2', shirt: '#23845f' },
  { skin: 1, hair: 'short', hairColor: '#b0672d', bg: '#fadfd3', shirt: '#963a1c', glasses: true },
]
export const AGE_RANGES = ['18-24', '25-29', '30-34', '35-39', '40-49', '50-59', '60+']
export const LANGUAGE_CODES = ['he', 'en', 'ar', 'ru', 'fr', 'es', 'de', 'am']
export const GENDERS = ['woman', 'man', 'nonbinary']

export const emptyForm = (locale) => ({
  firstName: '', avatar: AVATARS[0], ageRange: null, languages: [locale === 'he' ? 'he' : 'en'], gender: null, interests: [],
})

export const formFrom = (profile, account) => ({
  firstName: profile.first_name,
  avatar: profile.avatar,
  ageRange: profile.age_range,
  languages: profile.languages,
  gender: account?.gender ?? null,
  interests: account?.interests ?? [],
})

/** The first thing still missing, as a translation key, or null. */
export const missingBasics = (f) =>
  !f.firstName.trim() ? 'about.needName' : !f.ageRange ? 'about.needAge' : f.languages.length === 0 ? 'about.needLanguage' : null

const sameAvatar = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const toggle = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

export function FieldLabel({ children, hint, htmlFor, optional }) {
  const { t } = useT()
  return (
    <div className="mb-2 mt-6 first:mt-0">
      <label htmlFor={htmlFor} className="block text-base font-semibold text-pine-950">
        {children} {optional && <span className="font-normal text-ink-soft">{t('common.optional')}</span>}
      </label>
      {hint && <p className="text-sm text-ink-soft">{hint}</p>}
    </div>
  )
}

export function NameField({ form, set }) {
  const { t } = useT()
  return (
    <>
      <FieldLabel htmlFor="first-name">{t('onboarding.name')}</FieldLabel>
      <input
        id="first-name"
        dir={form.firstName ? 'auto' : undefined}
        value={form.firstName}
        onChange={(e) => set({ firstName: e.target.value })}
        maxLength={30}
        autoComplete="given-name"
        autoCapitalize="words"
        enterKeyHint="done"
        placeholder={t('onboarding.namePlaceholder')}
        className="min-h-[56px] w-full rounded-2xl border-2 border-cream-300 bg-white px-4 text-lg focus:border-pine-700 focus:outline-none"
      />
    </>
  )
}

export function AvatarField({ form, set }) {
  const { t } = useT()
  return (
    <>
      <FieldLabel>{t('onboarding.picture')}</FieldLabel>
      <div className="grid grid-cols-4 gap-3" role="radiogroup" aria-label={t('onboarding.avatar')}>
        {AVATARS.map((a, i) => {
          const on = sameAvatar(a, form.avatar)
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={t('onboarding.avatarN', { n: i + 1 })}
              onClick={() => set({ avatar: a })}
              className={`relative flex aspect-square items-center justify-center rounded-full ${on ? 'ring-4 ring-pine-900 ring-offset-2 ring-offset-cream-50' : ''}`}
            >
              <Avatar spec={a} size={68} />
              {on && (
                <span className="absolute -bottom-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full bg-pine-900 text-cream-50"><Check size={15} strokeWidth={3} aria-hidden="true" /></span>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}

export function AgeField({ form, set }) {
  const { t } = useT()
  return (
    <>
      <FieldLabel hint={t('about.ageHint')}>{t('about.age')}</FieldLabel>
      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={t('about.age')}>
        {AGE_RANGES.map((a) => (
          <Chip key={a} selected={form.ageRange === a} onClick={() => set({ ageRange: a })} className="px-0!"><bdi>{t(`ages.${a}`)}</bdi></Chip>
        ))}
      </div>
    </>
  )
}

export function LanguagesField({ form, set }) {
  const { t } = useT()
  return (
    <>
      <FieldLabel hint={t('about.languagesHint')}>{t('about.languages')}</FieldLabel>
      <div className="flex flex-wrap gap-2">
        {LANGUAGE_CODES.map((code) => (
          <Chip key={code} selected={form.languages.includes(code)} onClick={() => set({ languages: toggle(form.languages, code) })}>{t(`langs.${code}`)}</Chip>
        ))}
      </div>
    </>
  )
}

export function GenderField({ form, set }) {
  const { t } = useT()
  return (
    <>
      <FieldLabel optional hint={t('about.genderHint')}>{t('about.gender')}</FieldLabel>
      <div className="flex flex-wrap gap-2">
        {GENDERS.map((g) => (
          <Chip key={g} selected={form.gender === g} onClick={() => set({ gender: form.gender === g ? null : g })}>{t(`genders.${g}`)}</Chip>
        ))}
        <Chip selected={form.gender === null} onClick={() => set({ gender: null })}>{t('genders.none')}</Chip>
      </div>
    </>
  )
}

export function InterestsField({ form, set, large = false }) {
  const { t } = useT()
  if (!large) {
    return (
      <>
        <FieldLabel optional>{t('about.interests')}</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {ALL_TYPES.map((id) => (
            <Chip key={id} icon={TYPE_ICONS[id]} selected={form.interests.includes(id)} onClick={() => set({ interests: toggle(form.interests, id) })}>{t(`types.${id}`)}</Chip>
          ))}
        </div>
      </>
    )
  }
  return (
    <div className="space-y-2">
      {ALL_TYPES.map((id) => {
        const Icon = TYPE_ICONS[id]
        const on = form.interests.includes(id)
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            onClick={() => set({ interests: toggle(form.interests, id) })}
            className={`flex min-h-[64px] w-full items-center gap-3 rounded-2xl border-2 px-3 py-2 text-start ${on ? 'border-pine-900 bg-pine-50' : 'border-cream-300 bg-white'}`}
          >
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${on ? 'bg-pine-900 text-cream-50' : 'bg-cream-100 text-ink'}`}><Icon size={22} aria-hidden="true" /></span>
            <span className="flex-1">
              <span className="block text-base font-semibold text-pine-950">{t(`types.${id}`)}</span>
              <span className="block text-sm text-ink-soft">{t(`onboarding.h_${id}`)}</span>
            </span>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-pine-900 bg-pine-900 text-cream-50' : 'border-cream-300'}`}>{on && <Check size={14} strokeWidth={3} aria-hidden="true" />}</span>
          </button>
        )
      })}
    </div>
  )
}
