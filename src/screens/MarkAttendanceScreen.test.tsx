import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CALENDAR } from '../data/calendar'
import type { TimetableEntry } from '../lib/timetable'
import type { AttendanceRecord } from '../lib/attendance'
import { weekdayForDate } from '../lib/dates'
import MarkAttendanceScreen from './MarkAttendanceScreen'

const firestoreState = vi.hoisted(() => {
  const store = new Map<string, unknown>()
  return { store }
})

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }))
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({})) }))
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
  getDocs: vi.fn(async (ref: { path: string }) => {
    const prefix = `${ref.path}/`
    const docs = [...firestoreState.store.entries()]
      .filter(([p]) => p.startsWith(prefix))
      .map(([p, data]) => ({ id: p.slice(prefix.length), data: () => data }))
    return { docs }
  }),
  setDoc: vi.fn(async (ref: { path: string }, data: unknown) => {
    firestoreState.store.set(ref.path, data)
  }),
}))

function seedTimetable(entries: TimetableEntry[]) {
  for (const e of entries) {
    firestoreState.store.set(`users/u1/timetable/${e.day}-${e.startTime}`, e)
  }
}

function seedHoliday(date: string) {
  firestoreState.store.set(`config/holidays/${date}`, {
    date,
    day: weekdayForDate(date),
    name: 'Test Holiday',
    fallsOnWeekend: false,
  })
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

beforeEach(() => {
  vi.clearAllMocks()
  firestoreState.store.clear()
  firestoreState.store.set('config/academicCalendar', { ...DEFAULT_CALENDAR })
})

describe('MarkAttendanceScreen', () => {
  it('normal day: all slots default to unset with no pre-fill', async () => {
    seedTimetable([entry()])
    render(<MarkAttendanceScreen uid="u1" group="A" onBack={vi.fn()} initialDate="2026-09-14" />)

    const slot = await screen.findByLabelText('Monday-09:00')
    expect(within(slot).getByText(/IT-301/)).toBeInTheDocument()
    expect(within(slot).getByText(/Data Structures/)).toBeInTheDocument()

    for (const status of ['Present', 'Absent', 'No Class', 'Holiday']) {
      expect(within(slot).getByRole('button', { name: status })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
    }
  })

  it('holiday date: all slots pre-fill Holiday and remain tappable to override', async () => {
    seedHoliday('2026-10-26')
    seedTimetable([entry({ day: 'Monday', startTime: '11:00', endTime: '12:00' })])
    render(<MarkAttendanceScreen uid="u1" group="A" onBack={vi.fn()} initialDate="2026-10-26" />)

    const slot = await screen.findByLabelText('Monday-11:00')
    expect(within(slot).getByRole('button', { name: 'Holiday' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(slot).getByRole('button', { name: 'Present' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    fireEvent.click(within(slot).getByRole('button', { name: 'Present' }))

    expect(within(slot).getByRole('button', { name: 'Present' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(slot).getByRole('button', { name: 'Holiday' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    await waitFor(() => {
      const stored = firestoreState.store.get(
        'users/u1/attendance/2026-10-26_Monday-11:00',
      ) as AttendanceRecord
      expect(stored.status).toBe('Present')
    })
  })

  it('lab produces exactly 2 slots scoped to the own group, other-group lab excluded', async () => {
    seedTimetable([
      entry({
        day: 'Tuesday',
        startTime: '09:00',
        endTime: '11:00',
        type: 'Lab',
        units: 2,
        group: 'A',
      }),
      entry({
        day: 'Tuesday',
        startTime: '14:00',
        endTime: '16:00',
        subjectCode: 'IT-356',
        subjectName: 'OS Lab',
        type: 'Lab',
        units: 2,
        group: 'B',
      }),
    ])

    render(<MarkAttendanceScreen uid="u1" group="A" onBack={vi.fn()} initialDate="2026-09-15" />)

    expect(await screen.findByLabelText('Tuesday-09:00')).toBeInTheDocument()
    expect(screen.getByLabelText('Tuesday-10:00')).toBeInTheDocument()

    expect(screen.queryByLabelText(/Tuesday-14:00/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Tuesday-15:00/)).not.toBeInTheDocument()

    expect(screen.queryByText('OS Lab')).not.toBeInTheDocument()
  })

  it('mark one slot Present and another Absent; reload confirms both persisted', async () => {
    seedTimetable([
      entry({ day: 'Monday', startTime: '09:00', endTime: '10:00' }),
      entry({ day: 'Monday', startTime: '11:00', endTime: '12:00', subjectCode: 'IT-302', subjectName: 'OS' }),
    ])

    const { unmount } = render(
      <MarkAttendanceScreen uid="u1" group="A" onBack={vi.fn()} initialDate="2026-09-14" />,
    )

    const slotA = await screen.findByLabelText('Monday-09:00')
    const slotB = screen.getByLabelText('Monday-11:00')

    fireEvent.click(within(slotA).getByRole('button', { name: 'Present' }))
    fireEvent.click(within(slotB).getByRole('button', { name: 'Absent' }))

    await waitFor(() => {
      const rA = firestoreState.store.get(
        'users/u1/attendance/2026-09-14_Monday-09:00',
      ) as AttendanceRecord
      const rB = firestoreState.store.get(
        'users/u1/attendance/2026-09-14_Monday-11:00',
      ) as AttendanceRecord
      expect(rA.status).toBe('Present')
      expect(rB.status).toBe('Absent')
    })

    unmount()

    render(<MarkAttendanceScreen uid="u1" group="A" onBack={vi.fn()} initialDate="2026-09-14" />)

    expect(
      within(await screen.findByLabelText('Monday-09:00')).getByRole('button', {
        name: 'Present',
      }),
    ).toHaveAttribute('aria-pressed', 'true')

    expect(
      within(screen.getByLabelText('Monday-11:00')).getByRole('button', {
        name: 'Absent',
      }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('navigate to a past date, log a status, and confirm it writes to that dates record', async () => {
    seedTimetable([
      entry({ day: 'Monday', startTime: '09:00', endTime: '10:00' }),
      entry({ day: 'Thursday', startTime: '09:00', endTime: '10:00', subjectCode: 'IT-303', subjectName: 'CN' }),
    ])

    render(<MarkAttendanceScreen uid="u1" group="A" onBack={vi.fn()} initialDate="2026-09-14" />)

    const mondaySlot = await screen.findByLabelText('Monday-09:00')
    expect(mondaySlot).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Select date'), {
      target: { value: '2026-09-10' },
    })

    const thuSlot = await screen.findByLabelText('Thursday-09:00')
    fireEvent.click(within(thuSlot).getByRole('button', { name: 'Present' }))

    await waitFor(() => {
      const stored = firestoreState.store.get(
        'users/u1/attendance/2026-09-10_Thursday-09:00',
      ) as AttendanceRecord
      expect(stored.status).toBe('Present')
      expect(stored.date).toBe('2026-09-10')
    })

    expect(firestoreState.store.has('users/u1/attendance/2026-09-14_Monday-09:00')).toBe(
      false,
    )
  })
})