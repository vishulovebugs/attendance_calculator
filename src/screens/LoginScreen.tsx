import { useState, type FormEvent } from 'react'
import { createAccount, signInWithEmail, signInWithGoogle } from '../lib/auth'

interface LoginScreenProps {
  error?: string | null
  onError?: (message: string) => void
}

export default function LoginScreen({ error, onError }: LoginScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    onError?.('')
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password)
      } else {
        await createAccount(email, password)
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogle = async () => {
    setSubmitting(true)
    onError?.('')
    try {
      await signInWithGoogle()
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Google sign-in failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-3xl font-bold text-indigo-600">
          USICT Attendance
        </h1>
        <p className="mt-1 text-center text-sm text-gray-500">
          {mode === 'login'
            ? 'Welcome back — sign in to continue'
            : 'Create an account to get started'}
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          {error ? (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="mt-4 flex items-center gap-3 text-xs text-gray-400">
          <span className="h-px flex-1 bg-gray-200" />
          or
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={submitting}
          className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
        >
          Continue with Google
        </button>

        <p className="mt-4 text-center text-sm text-gray-600">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            disabled={submitting}
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="font-semibold text-indigo-600"
          >
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </div>
    </main>
  )
}