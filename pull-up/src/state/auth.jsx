import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { errorKey, rpc, supabase } from '../lib/supabase.js'

// Who is signed in, and their saved profile.
//   status: 'unconfigured' | 'loading' | 'signedOut' | 'needsOnboarding' | 'ready' | 'error'

const AuthContext = createContext(null)
const RETURN_KEY = 'pullup.returnTo'

async function loadAccount(userId) {
  const [profile, account, config] = await Promise.all([
    supabase.from('profiles').select('id, first_name, avatar, age_range, languages, onboarded_at, deleted_at').eq('id', userId).maybeSingle(),
    supabase.from('account_private').select('gender, interests, locale, terms_version').eq('user_id', userId).maybeSingle(),
    supabase.rpc('app_config'),
  ])
  // app_config is refused until onboarding is done for brand-new users only if signed out; treat as optional
  const failed = profile.error || account.error
  if (failed) throw failed
  return { profile: profile.data, account: account.data, config: config.data || null }
}

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: supabase ? 'loading' : 'unconfigured', user: null, profile: null, account: null, config: null, errorKey: null })
  const current = useRef(null) // user id we last loaded, to ignore stale responses

  const refresh = useCallback(async (user) => {
    if (!user) {
      current.current = null
      setState({ status: 'signedOut', user: null, profile: null, account: null, config: null, errorKey: null })
      return
    }
    current.current = user.id
    try {
      const { profile, account, config } = await loadAccount(user.id)
      if (current.current !== user.id) return
      const onboarded = !!profile?.onboarded_at && !profile.deleted_at && !!account
      setState({ status: onboarded ? 'ready' : 'needsOnboarding', user, profile, account, config, errorKey: null })
    } catch (error) {
      if (current.current !== user.id) return
      setState((s) => ({ ...s, status: 'error', user, errorKey: errorKey(error) }))
    }
  }, [])

  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth.getSession().then(({ data }) => active && refresh(data.session?.user ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      // Token refreshes do not change who is signed in.
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') return
      // Defer: calling the client from inside this callback can deadlock it.
      setTimeout(() => active && refresh(session?.user ?? null), 0)
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [refresh])

  const value = useMemo(() => {
    const signInWithGoogle = async () => {
      // Come back to the page the person was on (for example a shared spot link).
      try {
        sessionStorage.setItem(RETURN_KEY, window.location.pathname + window.location.search)
      } catch { /* not essential */ }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + window.location.pathname + window.location.search },
      })
      if (error) throw Object.assign(new Error(error.message), { key: errorKey(error) })
    }

    const signInForTests = async (email, password) => {
      const first = await supabase.auth.signInWithPassword({ email, password })
      if (!first.error) return
      const created = await supabase.auth.signUp({ email, password })
      if (created.error) throw Object.assign(new Error(created.error.message), { key: 'errors.generic' })
    }

    const signOut = async () => {
      await supabase.auth.signOut()
    }

    const saveOnboarding = async (form, termsVersion) => {
      await rpc('complete_onboarding', {
        p_first_name: form.firstName,
        p_avatar: form.avatar,
        p_age_range: form.ageRange,
        p_languages: form.languages,
        p_gender: form.gender || null,
        p_interests: form.interests,
        p_locale: form.locale,
        p_is_adult: form.adult,
        p_terms_version: termsVersion,
      })
      await refresh(state.user)
    }

    const saveProfile = async (form) => {
      await rpc('update_profile', {
        p_first_name: form.firstName,
        p_avatar: form.avatar,
        p_age_range: form.ageRange,
        p_languages: form.languages,
        p_gender: form.gender || null,
        p_interests: form.interests,
      })
      await refresh(state.user)
    }

    const saveLocale = (locale) => (state.status === 'ready' ? rpc('set_locale', { p_locale: locale }).catch(() => {}) : undefined)

    return { ...state, signInWithGoogle, signInForTests, signOut, saveOnboarding, saveProfile, saveLocale, retry: () => refresh(state.user) }
  }, [state, refresh])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
