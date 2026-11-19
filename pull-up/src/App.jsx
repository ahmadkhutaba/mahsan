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
import { StoreProvider, useStore } from './state/store.jsx'

const TAB_VIEWS = { home: Home, plans: MyPlans, profile: Profile, spots: MySpots, requests: Requests }
const SCREENS = { spot: SpotDetails, plan: Plan, chat: Chat, rating: Rating, create: CreateSpot, joiner: JoinerProfile }
const SHEETS = { filters: FiltersSheet, request: RequestSheet, safety: SafetySheet }

function Router() {
  const { state } = useStore()
  if (!state.onboarded) return <Onboarding />

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
    <StoreProvider>
      <PhoneFrame>
        <Router />
        <Toast />
      </PhoneFrame>
    </StoreProvider>
  )
}
