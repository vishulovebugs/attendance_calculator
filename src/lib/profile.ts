import { doc, getDoc, setDoc } from 'firebase/firestore'
import type { OnboardingInputs, UserProfile } from '../types'
import { db } from './firebase'

const USERS_COLLECTION = 'users'

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, USERS_COLLECTION, uid))
  if (!snapshot.exists()) {
    return null
  }
  return snapshot.data() as UserProfile
}

export async function createProfile(
  uid: string,
  inputs: OnboardingInputs,
  email: string | null,
): Promise<UserProfile> {
  const profile: UserProfile = {
    ...inputs,
    email,
    createdAt: new Date().toISOString(),
  }
  await setDoc(doc(db, USERS_COLLECTION, uid), profile)
  return profile
}