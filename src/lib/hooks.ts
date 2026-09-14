import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import type { UserProfile } from '../types'
import { onAuthChange } from './auth'
import { getProfile } from './profile'

export function useAuthState(): User | null | undefined {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  useEffect(() => {
    const unsubscribe = onAuthChange((next) => setUser(next))
    return unsubscribe
  }, [])
  return user
}

export function useProfile(uid: string | null): {
  profile: UserProfile | null
  loading: boolean
} {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!uid) {
      setProfile(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    getProfile(uid)
      .then((result) => {
        if (!cancelled) setProfile(result)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [uid])

  return { profile, loading }
}