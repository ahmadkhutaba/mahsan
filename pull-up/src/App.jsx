import { PhoneFrame, TabBar, Toast } from './components/Shell.jsx'
import Onboarding from './screens/Onboarding.jsx'
import Profile from './screens/Profile.jsx'
import CreateSpot from './screens/host/CreateSpot.jsx'
import JoinerProfile from './screens/host/JoinerProfile.jsx'
import MySpots from './screens/host/MySpots.jsx'
import Requests from './screens/host/Requests.jsx'
import Chat from './screens/joiner/Chat.jsx'
import FiltersSheet from './screens/joiner/FiltersSheet.jsx'
import Home from './screens/joiner/Home.jsx'
import MyPlans from './screens/joiner/MyPlans.jsx'
import Plan from './screens/joiner/Plan.jsx'
import Rating from './screens/joiner/Rating.jsx'
import RequestSheet from './screens/joiner/RequestSheet.jsx'
import SafetySheet from './screens/joiner/SafetySheet.jsx'
import SpotDetails from './screens/joiner/SpotDetails.jsx'
import { useEffect } from 'react'
import EditProfile from './screens/account/EditProfile.jsx'
import Legal from './screens/account/Legal.jsx'
import SignIn from './screens/account/SignIn.jsx'
import { I18nProvider, useT } from './i18n/index.jsx'
import { AuthProvider, useAuth } from './state/auth.jsx'
import { StoreProvider, useStore } from './state/store.jsx'

const LegalScreen = () => {
  const { dispatch } = useStore()
  return <Legal onBack={() => dispatch({ type: 'POP' })} />
}

const TAB_VIEWS = { home: Home, plans: MyPlans, profile: Profile, spots: MySpots, requests: Requests }
const SCREENS = { spot: SpotDetails, plan: Plan, chat: Chat, rating: Rating, create: CreateSpot, joiner: JoinerProfile, editProfile: EditProfile, legal: LegalScreen }
const SHEETS = { filters: FiltersSheet, request: RequestSheet, safety: SafetySheet }

function Router() {
  const { state, dispatch } = useStore()
  const auth = useAuth()
  const { t, lang } = useT()

  // The signed-in person's saved profile drives the "me" used across the screens.
  const profile = auth.status === 'ready' ? auth.profile : null
  useEffect(() => {
    if (!profile) return
    dispatch({
      type: 'ONBOARD',
      me: {
        firstName: profile.first_name,
        avatar: profile.avatar,
        ageRange: t(`ages.${profile.age_range}`),
        languages: profile.languages,
        interests: auth.account?.interests ?? [],
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, auth.account, dispatch])

  // Remember the chosen language on the account too.
  useEffect(() => {
    if (auth.status === 'ready' && auth.account?.locale !== lang) auth.saveLocale(lang)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, auth.status])

  if (auth.status === 'needsOnboarding') return <Onboarding />
  if (auth.status !== 'ready' || !state.onboarded) return <SignIn />

  const TabView = TAB_VIEWS[state.tabs[state.role]]
  const Sheet = state.sheet && SHEETS[state.sheet.name]

  // Layers under the top one stay mounted (so scroll positions survive) but are inert.
  const covered = (isCovered) => (isCovered ? { inert: true, 'aria-hidden': true } : {})
  const last = state.stack.length - 1

  return (
    <>
      <div className="flex h-full flex-col" {...covered(last >= 0 || !!Sheet)}>
        <div className="min-h-0 flex-1">
          <TabView />
        </div>
        <TabBar />
      </div>
      {state.stack.map((s, i) => {
        const View = SCREENS[s.name]
        const { name, ...params } = s
        return (
          <div key={`${i}-${name}-${params.spotId || params.requestId || ''}`} className="contents" {...covered(i < last || !!Sheet)}>
            <View {...params} />
          </div>
        )
      })}
      {Sheet && <Sheet key={state.sheet.name + (state.sheet.mode || '')} {...state.sheet} />}
    </>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
      <StoreProvider>
        <PhoneFrame>
          <Router />
          <Toast />
        </PhoneFrame>
      </StoreProvider>
      </AuthProvider>
    </I18nProvider>
  )
}
