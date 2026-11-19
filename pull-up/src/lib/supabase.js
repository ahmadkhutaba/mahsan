import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** null when the build has no backend configured. The app then shows a clear error, never sample data. */
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null

export const TEST_LOGIN_ENABLED = import.meta.env.VITE_ENABLE_TEST_LOGIN === 'true'

// Codes the database raises (SQLSTATE P0001, message = code). Anything else is "generic".
const KNOWN = new Set([
  'not_signed_in', 'not_onboarded', 'adult_required', 'terms_outdated', 'invalid_profile', 'account_deleted',
  'invalid_time', 'starts_too_soon', 'starts_too_far', 'invalid_duration', 'too_many_open_spots', 'daily_limit',
  'spot_not_found', 'spot_cancelled', 'spot_started', 'spot_ended', 'places_below_joined', 'own_spot',
  'already_member', 'cannot_rejoin', 'already_requested', 'already_answered', 'too_many_requests', 'spot_full',
  'too_many_pending', 'request_not_pending', 'request_not_found', 'not_member', 'invalid_message', 'chat_closed',
  'slow_down', 'rating_not_allowed', 'rating_not_open', 'rating_closed', 'already_rated', 'user_not_found',
  'invalid_report',
])

/** Turn any failure into a translation key under "errors.". */
export function errorKey(error) {
  if (!error) return 'errors.generic'
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'errors.offline'
  const message = String(error.message || '')
  if (error.code === 'P0001' && KNOWN.has(message)) return `errors.${message}`
  if (error.code === '23514' || error.code === '23502') return 'errors.invalid_input'
  if (/fetch|network|load failed/i.test(message)) return 'errors.offline'
  return 'errors.generic'
}

/** Call a database function. Resolves to its data, or throws an Error carrying `.key`. */
export async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) {
    const failure = new Error(error.message)
    failure.code = error.code
    failure.key = errorKey(error)
    throw failure
  }
  return data
}
