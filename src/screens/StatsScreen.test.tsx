import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CALENDAR } from '../data/calendar'
import type { TimetableEntry } from '../lib/timetable'
import type { AttendanceRecord } from '../lib/attendance'
import MarkAttendanceScreen from './MarkAttendanceScreen'
import StatsScreen from './StatsScreen'
import SettingsScreen from './SettingsScreen'

const firestoreState = vi.hoisted(() => {
  const store = new Map<string, unknown>()
  return {
    store,
    snapshotFor(ref: { path: string; kind?: string }) {
      if (ref.kind === 'doc') {
        return {
          exists: () => store.has(ref.path),
          data: () => store.get(ref.path),
        }
      }
      const prefix = `${ref.path}/`
      return {
        docs: [...store.entries()]
          .filter(([p]) => p.startsWith(prefix))
          .map(([p, data]) => ({ id: p.slice(prefix.length), data: () => data })),
      }
    },
  }
})

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }))
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({})) }))
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn((_db: unknown, ...segments: string[]) => ({
    path: segments.join('/'),
    kind: 'collection',
  })),
  doc: vi.fn((_db: unknown, ...segments: string[]) => ({
    path: segments.join('/'),
    kind: 'doc',
  })),
  getDoc: vi.fn(async (ref: { path: string }) => firestoreState.snapshotFor(ref)),
  getDocs: vi.fn(async (ref: { path: string }) => firestoreState.snapshotFor(ref)),
  setDoc: vi.fn(async (ref: { path: string }, data: unknown) => {
    firestoreState.store.set(ref.path, data)
  }),
  onSnapshot: vi.fn((ref: Parameters<typeof firestoreState.snapshotFor>[0], next: (snap: unknown) => void) => {
    next(firestoreState.snapshotFor(ref))
    return vi.fn()
  }),
}))

function seedTimetable(entries: TimetableEntry[]) {
  for (const e of entries) {
    firestoreState.store.set(`users/u1/timetable/${e.day}-${e.startTime}`, e)
  }
}

function seedAttendance(records: AttendanceRecord[]) {
  for (const r of records) {
    firestoreState.store.set(`users/u1/attendance/${r.date}_${r.slotId}`, r)
  }
}

function entry(overrides: Partial<TimetableEntry> = {}): TimetableEntry {
  return {
    day: 'Monday',
    startTime: '09:00',
    endTime: '10:00',
    subjectCode: 'IT-301',
    subjectName: 'Data Structures',
    type: 'Lecture',
    units: 1,
    ...overrides,
  }
}

function rec(overrides: Partial<AttendanceRecord> = {}): AttendanceRecord {
  return {
    date: '2026-09-14',
    slotId: 'Monday-09:00',
    day: 'Monday',
    startTime: '09:00',
    endTime: '10:00',
    subjectCode: 'IT-301',
    subjectName: 'Data Structures',
    type: 'Lecture',
    status: 'Present',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  firestoreState.store.clear()
  firestoreState.store.set('config/academicCalendar', { ...DEFAULT_CALENDAR })
})

function cumulativeBlock(subjectCode: string) {
  return () => within(screen.getByLabelText(`${subjectCode} cumulative`))
}

describe('StatsScreen', () => {
  it('marking a slot Present in Phase 4 updates stats without a page refresh', async () => {
    seedTimetable([entry()])

    render(<MarkAttendanceScreen uid="u1" group="A" onBack={vi.fn()} initialDate="2026-09-14" />)
    const slot = await screen.findByLabelText('Monday-09:00')
    fireEvent.click(within(slot).getByRole('button', { name: 'Present' }))

    await waitFor(() => {
      const stored = firestoreState.store.get(
        'users/u1/attendance/2026-09-14_Monday-09:00',
      ) as AttendanceRecord
      expect(stored.status).toBe('Present')
    })

    render(<StatsScreen uid="u1" onBack={vi.fn()} />)

    const block = cumulativeBlock('IT-301')
    expect(await screen.findByLabelText('IT-301 cumulative')).toBeInTheDocument()
    expect(block().getByText(/Attended: 1/)).toBeInTheDocument()
    expect(block().getByText(/Conducted: 1/)).toBeInTheDocument()
    expect(block().getByText(/100\.0%/)).toBeInTheDocument()

    const overall = cumulativeBlock('overall')
    expect(overall().getByText(/Attended: 1/)).toBeInTheDocument()
    expect(overall().getByText(/Conducted: 1/)).toBeInTheDocument()
  })

  it('changing Minor 1 end date in Settings recalculates Till Minor 1 on next render', async () => {
    seedAttendance([
      rec({ date: '2026-09-24', status: 'Present' }),
      rec({
        date: '2026-10-05',
        day: 'Thursday',
        slotId: 'Thursday-09:00',
        status: 'Absent',
      }),
      rec({
        date: '2026-11-10',
        day: 'Monday',
        slotId: 'Monday-11:00',
        status: 'Present',
      }),
    ])

    const first = render(<StatsScreen uid="u1" onBack={vi.fn()} />)

    const before = cumulativeBlock('IT-301')
    const beforeTill = within(await screen.findByLabelText('IT-301 till minor1'))
    expect(beforeTill.getByText(/Attended: 1/)).toBeInTheDocument()
    expect(beforeTill.getByText(/Conducted: 1/)).toBeInTheDocument()
    expect(beforeTill.getByText(/100\.0%/)).toBeInTheDocument()
    expect(before().getByText(/Attended: 2/)).toBeInTheDocument()
    expect(before().getByText(/Conducted: 3/)).toBeInTheDocument()
    expect(before().getByText(/66\.7%/)).toBeInTheDocument()

    first.unmount()

    const settings = render(
      <SettingsScreen onBack={vi.fn()} />,
    )
    const minor1End = await settings.findByLabelText('Minor 1 end')
    fireEvent.change(minor1End, { target: { value: '2026-10-10' } })
    fireEvent.click(settings.getByRole('button', { name: 'Save changes' }))
    await settings.findByText('Calendar saved.')
    settings.unmount()

    render(<StatsScreen uid="u1" onBack={vi.fn()} />)

    const after = within(await screen.findByLabelText('IT-301 till minor1'))
    expect(after.getByText(/Attended: 1/)).toBeInTheDocument()
    expect(after.getByText(/Conducted: 2/)).toBeInTheDocument()
    expect(after.getByText(/50\.0%/)).toBeInTheDocument()

    const cumulative = cumulativeBlock('IT-301')
    expect(cumulative().getByText(/Attended: 2/)).toBeInTheDocument()
    expect(cumulative().getByText(/Conducted: 3/)).toBeInTheDocument()
    expect(cumulative().getByText(/66\.7%/)).toBeInTheDocument()
  })

  it('No Class and Holiday records for a subject do not change its Conducted count', async () => {
    seedAttendance([
      rec({ slotId: 'Monday-09:00', status: 'Present' }),
      rec({ slotId: 'Monday-10:00', status: 'Present' }),
      rec({ slotId: 'Monday-11:00', status: 'Absent' }),
      rec({ slotId: 'Monday-12:00', status: 'No Class' }),
      rec({ slotId: 'Monday-13:00', status: 'Holiday' }),
    ])

    render(<StatsScreen uid="u1" onBack={vi.fn()} />)

    const block = cumulativeBlock('IT-301')
    expect(await screen.findByLabelText('IT-301 cumulative')).toBeInTheDocument()
    expect(block().getByText(/Attended: 2/)).toBeInTheDocument()
    expect(block().getByText(/Conducted: 3/)).toBeInTheDocument()
    expect(block().getByText(/66\.7%/)).toBeInTheDocument()
    expect(block().getByText('< 75%')).toBeInTheDocument()

    const overall = cumulativeBlock('overall')
    expect(overall().getByText(/Attended: 2/)).toBeInTheDocument()
    expect(overall().getByText(/Conducted: 3/)).toBeInTheDocument()
  })

  it('a subject with only No Class records renders N/A without crashing', async () => {
    seedAttendance([
      rec({ subjectCode: 'IT-302', subjectName: 'OS', slotId: 'Monday-09:00', status: 'No Class' }),
      rec({ subjectCode: 'IT-302', subjectName: 'OS', slotId: 'Monday-10:00', status: 'Holiday' }),
    ])

    render(<StatsScreen uid="u1" onBack={vi.fn()} />)

    const block = cumulativeBlock('IT-302')
    expect(await screen.findByLabelText('IT-302 cumulative')).toBeInTheDocument()
    expect(block().getByText('N/A')).toBeInTheDocument()
    expect(block().getByText('No classes logged yet.')).toBeInTheDocument()
    expect(block().getAllByRole('progressbar').length).toBeGreaterThan(0)
  })
})