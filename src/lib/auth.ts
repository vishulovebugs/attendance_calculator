import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { auth } from './firebase'

export function onAuthChange(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb)
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return credential.user
}

export async function createAccount(email: string, password: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  return credential.user
}

export async function signInWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(auth, new GoogleAuthProvider())
  return credential.user
}

export function logOut(): Promise<void> {
  return signOut(auth)
}