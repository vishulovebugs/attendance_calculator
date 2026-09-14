import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AcademicCalendar } from '../data/calendar'
import { DEFAULT_CALENDAR } from '../data/calendar'
import SettingsScreen from './SettingsScreen'

const firestoreState = vi.hoisted(() => {
  const store = new Map<string, Record<string, unknown>>()
  return { store }
})

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}))

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn((_db: unknown, ...segments: string[]) => ({
    path: segments.join('/'),
  })),
  doc: vi.fn((_db: unknown, ...segments: string[]) => ({
    path: segments.join('/'),
  })),
  getDoc: vi.fn(async (ref: { path: string }) => ({
    exists: () => firestoreState.store.has(ref.path),
    data: () => firestoreState.store.get(ref.path),
  })),
  getDocs: vi.fn(async () => ({ docs: [] as unknown[] })),
  setDoc: vi.fn(async (ref: { path: string }, data: Record<string, unknown>) => {
    firestoreState.store.set(ref.path, data)
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  firestoreState.store.clear()
  firestoreState.store.set('config/academicCalendar', { ...DEFAULT_CALENDAR })
})

describe('SettingsScreen', () => {
  it('editing Minor 1 end persists the new value and is re-readable', async () => {
    const { unmount } = render(<SettingsScreen onBack={vi.fn()} />)

    const minor1End = (await screen.findByLabelText('Minor 1 end')) as HTMLInputElement
    expect(minor1End.value).toBe('2026-09-27')

    fireEvent.change(minor1End, { target: { value: '2026-09-30' } })
    expect(minor1End.value).toBe('2026-09-30')

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      const stored = firestoreState.store.get(
        'config/academicCalendar',
      ) as unknown as AcademicCalendar
      expect(stored.minor1.end).toBe('2026-09-30')
    })

    unmount()

    render(<SettingsScreen onBack={vi.fn()} />)
    const reloaded = (await screen.findByLabelText('Minor 1 end')) as HTMLInputElement
    expect(reloaded.value).toBe('2026-09-30')
  })

  it('renders Minor 2 as blank/unset by default without crashing', async () => {
    render(<SettingsScreen onBack={vi.fn()} />)

    await screen.findByLabelText('Minor 2 start')

    const minor2Start = screen.getByLabelText('Minor 2 start') as HTMLInputElement
    const minor2End = screen.getByLabelText('Minor 2 end') as HTMLInputElement

    expect(minor2Start.value).toBe('')
    expect(minor2End.value).toBe('')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
    expect(screen.getByText('Academic calendar')).toBeInTheDocument()
  })
})