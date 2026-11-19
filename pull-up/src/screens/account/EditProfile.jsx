import { LoaderCircle, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Button, Screen } from '../../components/ui.jsx'
import { useT } from '../../i18n/index.jsx'
import { useAuth } from '../../state/auth.jsx'
import { useStore } from '../../state/store.jsx'
import { AgeField, AvatarField, GenderField, InterestsField, LanguagesField, NameField, formFrom, missingBasics } from './fields.jsx'

export default function EditProfile() {
  const auth = useAuth()
  const { dispatch } = useStore()
  const { t } = useT()
  const [form, setForm] = useState(() => formFrom(auth.profile, auth.account))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const missing = missingBasics(form)

  const save = async () => {
    if (missing || saving) return
    setSaving(true)
    setError(null)
    try {
      await auth.saveProfile(form)
      dispatch({ type: 'POP' })
      dispatch({ type: 'TOAST', key: 'about.saved' })
    } catch (e) {
      setError(e.key || 'errors.generic')
      setSaving(false)
    }
  }

  return (
    <Screen
      title={t('about.edit')}
      footer={
        <Button variant="accent" icon={saving ? LoaderCircle : undefined} disabled={!!missing || saving} onClick={save} className={saving ? '[&>svg]:animate-spin' : ''}>
          {saving ? t('about.saving') : missing ? t(missing) : t('about.save')}
        </Button>
      }
    >
      <div className="px-5 py-5">
        {error && (
          <p role="alert" className="mb-4 flex items-start gap-2 rounded-2xl bg-clay-100 p-3 text-[15px] font-medium text-clay-700">
            <TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> {t(error)}
          </p>
        )}
        <NameField form={form} set={set} />
        <AvatarField form={form} set={set} />
        <AgeField form={form} set={set} />
        <LanguagesField form={form} set={set} />
        <GenderField form={form} set={set} />
        <InterestsField form={form} set={set} />
      </div>
    </Screen>
  )
}
