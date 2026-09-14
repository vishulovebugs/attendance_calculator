import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CALENDAR } from './data/calendar'
import type { TimetableEntry } from './lib/timetable'
import type { AttendanceRecord } from './lib/attendance'
import { weekdayForDate } from './lib/dates'
import EditTimetableScreen from './screens/EditTimetableScreen'
import MarkAttendanceScreen from './screens/MarkAttendanceScreen'
import StatsScreen from './screens/StatsScreen'
import SettingsScreen from './screens/SettingsScreen'

const firestoreState = vi.hoisted(() => {
  const store = new Map<string, unknown>()
  const listeners: Array<{
    ref: { path: string; kind?: string }
    next: (snap: unknown) => void
  }> = []
  function snapshotFor(ref: { path: string; kind?: string }) {
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
  }
  return {
    store,
    listeners,
    snapshotFor,
    refire(path: string) {
      for (const l of listeners) {
        if (l.ref.path === path) l.next(snapshotFor(l.ref))
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
  deleteDoc: vi.fn(async (ref: { path: string }) => {
    firestoreState.store.delete(ref.path)
  }),
  onSnapshot: vi.fn((ref: { path: string; kind?: string }, next: (snap: unknown) => void) => {
    firestoreState.listeners.push({ ref, next })
    next(firestoreState.snapshotFor(ref))
    return vi.fn()
  }),
}))

function seedTimetable(uid: string, entries: TimetableEntry[]) {
  for (const e of entries) {
    firestoreState.store.set(`users/${uid}/timetable/${e.day}-${e.startTime}`, e)
  }
}

function seedAttendance(uid: string, records: AttendanceRecord[]) {
  for (const r of records) {
    firestoreState.store.set(`users/${uid}/attendance/${r.date}_${r.slotId}`, r)
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

async function addClass(
  day: string,
  start: string,
  code: string,
  name: string,
  type: 'Lecture' | 'Lab' = 'Lecture',
) {
  fireEvent.click(screen.getByRole('button', { name: `Add ${day} ${start}` }))
  const dialog = await screen.findByRole('dialog', { name: 'Add class' })
  if (type === 'Lab') {
    fireEvent.change(within(dialog).getByLabelText('Type'), {
      target: { value: 'Lab' },
    })
  }
  fireEvent.change(within(dialog).getByLabelText('Subject code'), {
    target: { value: code },
  })
  fireEvent.change(within(dialog).getByLabelText('Subject name'), {
    target: { value: name },
  })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save slot' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
}

beforeEach(() => {
  vi.clearAllMocks()
  firestoreState.store.clear()
  firestoreState.listeners.length = 0
  firestoreState.store.set('config/academicCalendar', { ...DEFAULT_CALENDAR })
})

describe('Phase 6 cross-phase regression suite', () => {
  it('editing a timetable slot mid-semester leaves logged attendance untouched and Stats correct', async () => {
    const edit1 = render(
      <EditTimetableScreen uid="u1" group="A" onBack={vi.fn()} />,
    )
    await screen.findByRole('button', { name: 'Add Monday 09:00' })
    await addClass('Monday', '09:00', 'IT-301', 'Data Structures')
    fireEvent.click(screen.getByRole('button', { name: 'Save timetable' }))
    await screen.findByText('Timetable saved.')
    edit1.unmount()

    const mark = render(
      <MarkAttendanceScreen uid="u1" group="A" onBack={vi.fn()} initialDate="2026-09-14" />,
    )
    const slot = await screen.findByLabelText('Monday-09:00')
    fireEvent.click(within(slot).getByRole('button', { name: 'Present' }))
    await waitFor(() => {
      const stored = firestoreState.store.get(
        'users/u1/attendance/2026-09-14_Monday-09:00',
      ) as AttendanceRecord
      expect(stored.status).toBe('Present')
    })
    mark.unmount()

    const edit2 = render(
      <EditTimetableScreen uid="u1" group="A" onBack={vi.fn()} />,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Monday 09:00' }))
    const editDialog = await screen.findByRole('dialog', { name: 'Edit class' })
    fireEvent.change(within(editDialog).getByLabelText('Start time'), {
      target: { value: '11:00' },
    })
    fireEvent.click(within(editDialog).getByRole('button', { name: 'Save slot' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save timetable' }))
    await screen.findByText('Timetable saved.')
    edit2.unmount()

    const stored = firestoreState.store.get(
      'users/u1/attendance/2026-09-14_Monday-09:00',
    ) as AttendanceRecord
    expect(stored.status).toBe('Present')
    expect(stored.startTime).toBe('09:00')
    expect(stored.subjectCode).toBe('IT-301')
    expect(firestoreState.store.has('users/u1/timetable/Monday-09:00')).toBe(false)
    expect(firestoreState.store.has('users/u1/timetable/Monday-11:00')).toBe(true)

    render(<StatsScreen uid="u1" onBack={vi.fn()} />)
    const block = within(await screen.findByLabelText('IT-301 cumulative'))
    expect(block.getByText(/Attended: 1/)).toBeInTheDocument()
    expect(block.getByText(/Conducted: 1/)).toBeInTheDocument()
    expect(block.getByText(/100\.0%/)).toBeInTheDocument()
  })

  it('changing Minor 1 end date in Settings reflows the stats split without leaving the page', async () => {
    seedAttendance('u1', [
      rec({ date: '2026-09-24', status: 'Present' }),
      rec({
        date: '2026-10-05',
        day: 'Thursday',
        slotId: 'Thursday-09:00',
        status: 'Absent',
      }),
    ])

    const stats = render(<StatsScreen uid="u1" onBack={vi.fn()} />)
    const beforeTill = within(await screen.findByLabelText('IT-301 till minor1'))
    expect(beforeTill.getByText(/Conducted: 1/)).toBeInTheDocument()
    expect(beforeTill.getByText(/100\.0%/)).toBeInTheDocument()
    const beforeCumulative = within(screen.getByLabelText('IT-301 cumulative'))
    expect(beforeCumulative.getByText(/Conducted: 2/)).toBeInTheDocument()

    const settings = render(<SettingsScreen onBack={vi.fn()} />)
    const minor1End = await settings.findByLabelText('Minor 1 end')
    fireEvent.change(minor1End, { target: { value: '2026-10-10' } })
    fireEvent.click(settings.getByRole('button', { name: 'Save changes' }))
    await settings.findByText('Calendar saved.')

    firestoreState.refire('config/academicCalendar')

    await waitFor(() => {
      const afterTill = within(screen.getByLabelText('IT-301 till minor1'))
      expect(afterTill.getByText(/Conducted: 2/)).toBeInTheDocument()
      expect(afterTill.getByText(/50\.0%/)).toBeInTheDocument()
    })
    const afterCumulative = within(screen.getByLabelText('IT-301 cumulative'))
    expect(afterCumulative.getByText(/Conducted: 2/)).toBeInTheDocument()

    settings.unmount()
    stats.unmount()
  })

  it('two users in different groups never see each others Lab slot on any screen', async () => {
    const t1 = render(
      <EditTimetableScreen uid="u1" group="A" onBack={vi.fn()} />,
    )
    await screen.findByRole('button', { name: 'Add Tuesday 09:00' })
    await addClass('Tuesday', '09:00', 'IT-355', 'DBMS Lab', 'Lab')
    fireEvent.click(screen.getByRole('button', { name: 'Save timetable' }))
    await screen.findByText('Timetable saved.')
    t1.unmount()

    const t2 = render(
      <EditTimetableScreen uid="u2" group="B" onBack={vi.fn()} />,
    )
    await screen.findByRole('button', { name: 'Add Tuesday 09:00' })
    await addClass('Tuesday', '09:00', 'IT-390', 'AI Lab', 'Lab')
    fireEvent.click(screen.getByRole('button', { name: 'Save timetable' }))
    await screen.findByText('Timetable saved.')
    t2.unmount()

    const e1 = render(
      <EditTimetableScreen uid="u1" group="A" onBack={vi.fn()} />,
    )
    const cell1 = await screen.findByRole('button', { name: 'Edit Tuesday 09:00' })
    expect(within(cell1).getByText('IT-355')).toBeInTheDocument()
    expect(screen.queryByText('IT-390')).not.toBeInTheDocument()
    e1.unmount()

    const e2 = render(
      <EditTimetableScreen uid="u2" group="B" onBack={vi.fn()} />,
    )
    const cell2 = await screen.findByRole('button', { name: 'Edit Tuesday 09:00' })
    expect(within(cell2).getByText('IT-390')).toBeInTheDocument()
    expect(screen.queryByText('IT-355')).not.toBeInTheDocument()
    e2.unmount()

    const m1 = render(
      <MarkAttendanceScreen uid="u1" group="A" onBack={vi.fn()} initialDate="2026-09-15" />,
    )
    await screen.findByLabelText('Tuesday-09:00')
    expect(screen.getAllByText(/DBMS Lab/)).toHaveLength(2)
    expect(screen.queryAllByText(/AI Lab/)).toHaveLength(0)
    fireEvent.click(
      within(screen.getByLabelText('Tuesday-09:00')).getByRole('button', { name: 'Present' }),
    )
    await waitFor(() => {
      expect(
        (
          firestoreState.store.get(
            'users/u1/attendance/2026-09-15_Tuesday-09:00',
          ) as AttendanceRecord
        ).status,
      ).toBe('Present')
    })
    m1.unmount()

    const m2 = render(
      <MarkAttendanceScreen uid="u2" group="B" onBack={vi.fn()} initialDate="2026-09-15" />,
    )
    await screen.findByLabelText('Tuesday-09:00')
    expect(screen.getAllByText(/AI Lab/)).toHaveLength(2)
    expect(screen.queryAllByText(/DBMS Lab/)).toHaveLength(0)
    fireEvent.click(
      within(screen.getByLabelText('Tuesday-09:00')).getByRole('button', { name: 'Absent' }),
    )
    await waitFor(() => {
      expect(
        (
          firestoreState.store.get(
            'users/u2/attendance/2026-09-15_Tuesday-09:00',
          ) as AttendanceRecord
        ).status,
      ).toBe('Absent')
    })
    m2.unmount()

    const s1 = render(<StatsScreen uid="u1" onBack={vi.fn()} />)
    expect(await screen.findByLabelText('IT-355 cumulative')).toBeInTheDocument()
    expect(screen.queryByLabelText('IT-390 cumulative')).not.toBeInTheDocument()
    expect(screen.queryByText(/AI Lab/)).not.toBeInTheDocument()
    s1.unmount()

    const s2 = render(<StatsScreen uid="u2" onBack={vi.fn()} />)
    expect(await screen.findByLabelText('IT-390 cumulative')).toBeInTheDocument()
    expect(screen.queryByLabelText('IT-355 cumulative')).not.toBeInTheDocument()
    expect(screen.queryByText(/DBMS Lab/)).not.toBeInTheDocument()
    s2.unmount()
  })

  it('holiday prefill can be overridden to Present and persists after reload', async () => {
    seedHoliday('2026-10-26')
    seedTimetable('u1', [
      entry({ day: 'Monday', startTime: '11:00', endTime: '12:00' }),
    ])

    const mark = render(
      <MarkAttendanceScreen uid="u1" group="A" onBack={vi.fn()} initialDate="2026-10-26" />,
    )
    const slot = await screen.findByLabelText('Monday-11:00')
    expect(
      within(slot).getByRole('button', { name: 'Holiday' }),
    ).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(within(slot).getByRole('button', { name: 'Present' }))
    expect(
      within(slot).getByRole('button', { name: 'Present' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      within(slot).getByRole('button', { name: 'Holiday' }),
    ).toHaveAttribute('aria-pressed', 'false')

    await waitFor(() => {
      const stored = firestoreState.store.get(
        'users/u1/attendance/2026-10-26_Monday-11:00',
      ) as AttendanceRecord
      expect(stored.status).toBe('Present')
    })
    mark.unmount()

    render(
      <MarkAttendanceScreen uid="u1" group="A" onBack={vi.fn()} initialDate="2026-10-26" />,
    )
    const reloaded = await screen.findByLabelText('Monday-11:00')
    expect(
      within(reloaded).getByRole('button', { name: 'Present' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      within(reloaded).getByRole('button', { name: 'Holiday' }),
    ).toHaveAttribute('aria-pressed', 'false')
  })
})