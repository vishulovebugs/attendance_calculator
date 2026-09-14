import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

interface MockUser {
  uid: string
  email: string | null
}

const mockState = vi.hoisted(() => ({
  currentUser: null as MockUser | null,
  authListener: null as ((user: MockUser | null) => void) | null,
  profileDoc: {
    exists: (): boolean => false,
    data: (): Record<string, unknown> => ({}),
  },
  setDocCalls: [] as { path: string; data: Record<string, unknown> }[],
}))

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}))

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  GoogleAuthProvider: vi.fn(() => ({})),
  onAuthStateChanged: vi.fn((_auth: unknown, cb: (user: MockUser | null) => void) => {
    mockState.authListener = cb
    cb(mockState.currentUser)
    return () => undefined
  }),
  createUserWithEmailAndPassword: vi.fn(async (_auth: unknown, email: string, _pw: string) => {
    const user = { uid: 'new-user-uid', email }
    mockState.authListener?.(user)
    return { user }
  }),
  signInWithEmailAndPassword: vi.fn(async () => ({ user: { uid: 'existing-uid', email: null } })),
  signInWithPopup: vi.fn(async () => ({ user: { uid: 'existing-uid', email: null } })),
  signOut: vi.fn(async () => undefined),
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn((_db: unknown, col: string, id: string) => ({ col, id, path: `${col}/${id}` })),
  getDoc: vi.fn(async () => mockState.profileDoc),
  setDoc: vi.fn(async (ref: { path: string }, data: Record<string, unknown>) => {
    mockState.setDocCalls.push({ path: ref.path, data })
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockState.currentUser = null
  mockState.authListener = null
  mockState.profileDoc = { exists: () => false, data: () => ({}) }
  mockState.setDocCalls = []
})

describe('App auth flow', () => {
  it('new user signs up, onboard, and profile is written to users/{uid}', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(
      await screen.findByRole('button', { name: /sign in/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create one' }))
    await user.type(screen.getByLabelText('Email'), 'new@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Set up your profile')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Name'), 'Aarav Sharma')
    await user.type(screen.getByLabelText('Section'), 'A')
    await user.selectOptions(screen.getByLabelText('Branch'), 'CSE-AI')

    await user.click(screen.getByRole('button', { name: 'Finish setup' }))

    await waitFor(() => expect(mockState.setDocCalls.length).toBe(1))

    expect(mockState.setDocCalls[0].path).toBe('users/new-user-uid')
    expect(mockState.setDocCalls[0].data).toMatchObject({
      name: 'Aarav Sharma',
      semester: 1,
      branch: 'CSE-AI',
      section: 'A',
      group: 'A',
      email: 'new@example.com',
    })
    expect(mockState.setDocCalls[0].data.createdAt).toBeDefined()

    expect(await screen.findByText(/Welcome back, Aarav Sharma!/)).toBeInTheDocument()
  })

  it('returning user with an existing profile skips onboarding', async () => {
    mockState.currentUser = { uid: 'existing-uid', email: 'student@example.com' }
    mockState.profileDoc = {
      exists: () => true,
      data: () => ({
        name: 'Priya Mehta',
        semester: 4,
        branch: 'IT',
        section: 'C',
        group: 'B',
        email: 'student@example.com',
        createdAt: '2026-05-01T10:00:00.000Z',
      }),
    }

    render(<App />)

    expect(await screen.findByText(/Welcome back, Priya Mehta!/)).toBeInTheDocument()
    expect(screen.queryByText('Set up your profile')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create one' })).not.toBeInTheDocument()
    expect(mockState.setDocCalls.length).toBe(0)
  })
})