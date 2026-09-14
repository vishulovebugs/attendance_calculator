import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TimetableEntry } from '../lib/timetable'
import EditTimetableScreen from './EditTimetableScreen'

const firestoreState = vi.hoisted(() => {
  const store = new Map<string, unknown>()
  const calledPaths: string[] = []
  return { store, calledPaths }
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
  getDocs: vi.fn(async (ref: { path: string }) => {
    const prefix = `${ref.path}/`
    const docs = [...firestoreState.store.entries()]
      .filter(([path]) => path.startsWith(prefix))
      .map(([path, data]) => ({ id: path.slice(prefix.length), data: () => data }))
    return { docs }
  }),
  setDoc: vi.fn(async (ref: { path: string }, data: unknown) => {
    firestoreState.calledPaths.push(ref.path)
    firestoreState.store.set(ref.path, data)
  }),
  deleteDoc: vi.fn(async (ref: { path: string }) => {
    firestoreState.calledPaths.push(ref.path)
    firestoreState.store.delete(ref.path)
  }),
}))

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

function timetablePaths(uid: string, entries: TimetableEntry[]) {
  for (const e of entries) {
    firestoreState.store.set(
      `users/${uid}/timetable/${e.day}-${e.startTime}`,
      e,
    )
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
  firestoreState.calledPaths.length = 0
})

describe('EditTimetableScreen', () => {
  it('round-trips a full Mon-Fri week through save and reload', async () => {
    const { unmount } = render(
      <EditTimetableScreen uid="u1" group="A" onBack={vi.fn()} />,
    )

    await screen.findByRole('button', { name: 'Add Monday 09:00' })

    await addClass('Monday', '09:00', 'IT-301', 'Data Structures')
    await addClass('Tuesday', '11:00', 'IT-302', 'Operating Systems')
    await addClass('Wednesday', '13:00', 'IT-303', 'Computer Networks')
    await addClass('Thursday', '15:00', 'IT-304', 'DBMS')
    await addClass('Friday', '16:00', 'IT-305', 'Software Engineering')

    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      expect(screen.getByText(`${day}`)).toBeInTheDocument()
    }

    fireEvent.click(screen.getByRole('button', { name: 'Save timetable' }))
    await screen.findByText('Timetable saved.')

    const timetablePrefix = 'users/u1/timetable/'
    const savedPaths = [...firestoreState.store.keys()].filter((p) =>
      p.startsWith(timetablePrefix),
    )
    expect(savedPaths).toHaveLength(5)

    unmount()
    render(<EditTimetableScreen uid="u1" group="A" onBack={vi.fn()} />)

    expect(await screen.findByRole('button', { name: 'Edit Monday 09:00' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Tuesday 11:00' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Wednesday 13:00' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Thursday 15:00' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Friday 16:00' })).toBeInTheDocument()
  })

  it('shows only the signed-in users own entries (group isolation)', async () => {
    timetablePaths('u1', [
      entry({ day: 'Tuesday', startTime: '11:00', endTime: '12:00', subjectCode: 'IT-301', group: 'A' }),
    ])
    timetablePaths('u2', [
      entry({ day: 'Tuesday', startTime: '11:00', endTime: '12:00', subjectCode: 'IT-355', group: 'B' }),
    ])

    render(<EditTimetableScreen uid="u1" group="A" onBack={vi.fn()} />)

    const cell = await screen.findByRole('button', { name: 'Edit Tuesday 11:00' })
    expect(within(cell).getByText('IT-301')).toBeInTheDocument()
    expect(screen.queryByText('IT-355')).not.toBeInTheDocument()
  })

  it('saves a lab as two consecutive hours tagged with the own group', async () => {
    render(<EditTimetableScreen uid="u1" group="A" onBack={vi.fn()} />)

    await screen.findByRole('button', { name: 'Add Tuesday 09:00' })
    await addClass('Tuesday', '09:00', 'IT-355', 'DBMS Lab', 'Lab')

    expect(within(screen.getByRole('button', { name: 'Edit Tuesday 09:00' })).getByText('IT-355')).toBeInTheDocument()
    expect(within(screen.getByRole('button', { name: 'Edit Tuesday 10:00' })).getByText('IT-355')).toBeInTheDocument()
    expect(screen.getAllByText('Lab')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'Save timetable' }))
    await screen.findByText('Timetable saved.')

    const stored = firestoreState.store.get('users/u1/timetable/Tuesday-09:00') as TimetableEntry
    expect(stored).toMatchObject({
      day: 'Tuesday',
      startTime: '09:00',
      endTime: '11:00',
      subjectCode: 'IT-355',
      type: 'Lab',
      units: 2,
      group: 'A',
    })
    expect(firestoreState.store.has('users/u1/timetable/Tuesday-10:00')).toBe(false)
  })

  it('editing only touches the timetable subcollection, never attendance', async () => {
    const attendance = { present: 4, absent: 1 }
    firestoreState.store.set('users/u1/attendance/Monday-09:00', attendance)
    timetablePaths('u1', [
      entry(),
      entry({ day: 'Tuesday', startTime: '11:00', endTime: '12:00', subjectCode: 'IT-302' }),
    ])

    render(<EditTimetableScreen uid="u1" group="A" onBack={vi.fn()} />)
    await screen.findByRole('button', { name: 'Edit Monday 09:00' })

    fireEvent.click(screen.getByRole('button', { name: 'Edit Monday 09:00' }))
    const editDialog = await screen.findByRole('dialog', { name: 'Edit class' })
    fireEvent.change(within(editDialog).getByLabelText('Subject code'), {
      target: { value: 'IT-311' },
    })
    fireEvent.click(within(editDialog).getByRole('button', { name: 'Save slot' }))

    fireEvent.click(screen.getByRole('button', { name: 'Edit Tuesday 11:00' }))
    const deleteDialog = await screen.findByRole('dialog', { name: 'Edit class' })
    fireEvent.click(within(deleteDialog).getByRole('button', { name: 'Delete slot' }))

    fireEvent.click(screen.getByRole('button', { name: 'Save timetable' }))
    await screen.findByText('Timetable saved.')

    expect(firestoreState.store.get('users/u1/attendance/Monday-09:00')).toEqual(attendance)
    expect(firestoreState.store.has('users/u1/timetable/Monday-09:00')).toBe(true)
    expect(firestoreState.store.has('users/u1/timetable/Tuesday-11:00')).toBe(false)
    const edited = firestoreState.store.get('users/u1/timetable/Monday-09:00') as TimetableEntry
    expect(edited.subjectCode).toBe('IT-311')

    for (const path of firestoreState.calledPaths) {
      expect(path).not.toContain('attendance')
    }
  })

  it('rejects a slot that overlaps an existing class', async () => {
    timetablePaths('u1', [
      entry(),
      entry({
        day: 'Monday',
        startTime: '11:00',
        endTime: '13:00',
        subjectCode: 'IT-355',
        subjectName: 'DBMS Lab',
        type: 'Lab',
        units: 2,
        group: 'A',
      }),
    ])

    render(<EditTimetableScreen uid="u1" group="A" onBack={vi.fn()} />)
    await screen.findByRole('button', { name: 'Add Monday 10:00' })

    fireEvent.click(screen.getByRole('button', { name: 'Add Monday 10:00' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add class' })
    fireEvent.change(within(dialog).getByLabelText('Type'), {
      target: { value: 'Lab' },
    })
    fireEvent.change(within(dialog).getByLabelText('Subject code'), {
      target: { value: 'IT-999' },
    })
    fireEvent.change(within(dialog).getByLabelText('Subject name'), {
      target: { value: 'Overlap Lab' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save slot' }))

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('This slot overlaps another class')
    expect(screen.getByRole('dialog', { name: 'Add class' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit Monday 10:00' })).not.toBeInTheDocument()
  })
})