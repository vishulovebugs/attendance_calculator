import { useEffect, useState } from 'react'
import type { OnboardingInputs, UserProfile } from './types'
import { useAuthState, useProfile } from './lib/hooks'
import { createProfile } from './lib/profile'
import LoginScreen from './screens/LoginScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import DashboardScreen from './screens/DashboardScreen'
import SettingsScreen from './screens/SettingsScreen'

function LoadingScreen({ label }: { label: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <p role="status" className="text-gray-500">
        {label}
      </p>
    </main>
  )
}

function App() {
  const user = useAuthState()
  const { profile, loading } = useProfile(user?.uid ?? null)
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [view, setView] = useState<'dashboard' | 'settings'>('dashboard')

  useEffect(() => {
    if (user) {
      setAuthError(null)
    }
  }, [user])

  async function handleOnboard(uid: string, inputs: OnboardingInputs) {
    try {
      const created = await createProfile(uid, inputs, user?.email ?? null)
      setLocalProfile(created)
    } catch {
      setAuthError('Could not save your profile. Please try again.')
    }
  }

  if (user === undefined) {
    return <LoadingScreen label="Checking sign-in…" />
  }

  if (user === null) {
    return <LoginScreen error={authError} onError={setAuthError} />
  }

  if (loading) {
    return <LoadingScreen label="Loading profile…" />
  }

  const activeProfile = localProfile ?? profile

  if (!activeProfile) {
    return (
      <OnboardingScreen
        error={authError}
        onComplete={(inputs) => {
          void handleOnboard(user.uid, inputs)
        }}
      />
    )
  }

  if (view === 'settings') {
    return <SettingsScreen onBack={() => setView('dashboard')} />
  }

  return (
    <DashboardScreen
      profile={activeProfile}
      onOpenSettings={() => setView('settings')}
    />
  )
}

export default App