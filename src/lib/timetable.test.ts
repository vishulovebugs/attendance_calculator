import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TimetableEntry } from './timetable'
import {
  HOUR_STARTS,
  LAB_MAX_START,
  addHours,
  clickableSlotsFor,
  conflictsWith,
  entryCoversHour,
  entryId,
  expandEntry,
  getTimetable,
  hourSlotsForDay,
  saveTimetable,
} from './timetable'

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

beforeEach(() => {
  vi.clearAllMocks()
  firestoreState.store.clear()
  firestoreState.calledPaths.length = 0
})

describe('addHours', () => {
  it('adds one hour', () => {
    expect(addHours('09:00', 1)).toBe('10:00')
    expect(addHours('16:00', 1)).toBe('17:00')
  })

  it('adds multiple hours', () => {
    expect(addHours('09:00', 2)).toBe('11:00')
  })
})

describe('grid constants', () => {
  it('builds hourly starts from 09:00 to 16:00', () => {
    expect(HOUR_STARTS).toHaveLength(8)
    expect(HOUR_STARTS[0]).toBe('09:00')
    expect(HOUR_STARTS[7]).toBe('16:00')
  })

  it('returns one slot per grid hour for a day', () => {
    const slots = hourSlotsForDay('Monday')
    expect(slots).toHaveLength(8)
    expect(slots[0]).toEqual({ start: '09:00', end: '10:00' })
    expect(slots[7]).toEqual({ start: '16:00', end: '17:00' })
  })

  it('allows labs to start up to 15:00 only', () => {
    expect(LAB_MAX_START).toBe('15:00')
    expect(clickableSlotsFor('Lecture')).toHaveLength(8)
    const labSlots = clickableSlotsFor('Lab')
    expect(labSlots).toHaveLength(7)
    expect(labSlots[labSlots.length - 1].start).toBe('15:00')
  })
})

describe('expandEntry', () => {
  it('expands a lecture into a single one-hour record', () => {
    expect(expandEntry(entry())).toEqual([{ start: '09:00', end: '10:00' }])
  })

  it('expands a lab into two consecutive one-hour records', () => {
    const lab = entry({
      startTime: '09:00',
      endTime: '11:00',
      type: 'Lab',
      units: 2,
      group: 'A',
    })
    expect(expandEntry(lab)).toEqual([
      { start: '09:00', end: '10:00' },
      { start: '10:00', end: '11:00' },
    ])
  })

  it('never emits a multi-hour record for a lab', () => {
    const lab = entry({
      startTime: '10:00',
      endTime: '12:00',
      type: 'Lab',
      units: 2,
      group: 'B',
    })
    for (const slot of expandEntry(lab)) {
      expect(addHours(slot.start, 1)).toBe(slot.end)
    }
  })
})

describe('entryCoversHour', () => {
  const lab = entry({
    startTime: '09:00',
    endTime: '11:00',
    type: 'Lab',
    units: 2,
    group: 'A',
  })

  it('covers both expanded hours of a lab', () => {
    expect(entryCoversHour(lab, { start: '09:00', end: '10:00' })).toBe(true)
    expect(entryCoversHour(lab, { start: '10:00', end: '11:00' })).toBe(true)
  })

  it('does not cover hours outside its range', () => {
    expect(entryCoversHour(lab, { start: '08:00', end: '09:00' })).toBe(false)
    expect(entryCoversHour(lab, { start: '11:00', end: '12:00' })).toBe(false)
  })
})

describe('conflictsWith', () => {
  it('flags an overlapping candidate', () => {
    const existing = [entry({ day: 'Monday', startTime: '09:00', endTime: '10:00' })]
    const candidate = entry({
      day: 'Monday',
      startTime: '09:00',
      endTime: '11:00',
      type: 'Lab',
      units: 2,
    })
    expect(conflictsWith(existing, candidate)).toBe(true)
  })

  it('allows a non-overlapping candidate', () => {
    const existing = [entry({ day: 'Monday', startTime: '09:00', endTime: '10:00' })]
    const candidate = entry({ day: 'Monday', startTime: '10:00', endTime: '11:00' })
    expect(conflictsWith(existing, candidate)).toBe(false)
  })

  it('ignores entries on other days', () => {
    const existing = [entry({ day: 'Monday', startTime: '09:00', endTime: '10:00' })]
    const candidate = entry({
      day: 'Tuesday',
      startTime: '09:00',
      endTime: '11:00',
      type: 'Lab',
      units: 2,
    })
    expect(conflictsWith(existing, candidate)).toBe(false)
  })
})

describe('entryId', () => {
  it('derives the doc id from day and start time', () => {
    expect(entryId(entry())).toBe('Monday-09:00')
  })
})

describe('timetable store', () => {
  it('writes only under users/{uid}/timetable and never attendance', async () => {
    firestoreState.store.set('users/u1/attendance/Monday-09:00', { present: true })

    await saveTimetable('u1', [
      entry(),
      entry({ day: 'Tuesday', startTime: '11:00', endTime: '12:00' }),
      entry({
        day: 'Monday',
        startTime: '14:00',
        endTime: '16:00',
        subjectCode: 'IT-355',
        subjectName: 'DBMS Lab',
        type: 'Lab',
        units: 2,
        group: 'A',
      }),
    ])

    expect(firestoreState.calledPaths.length).toBeGreaterThan(0)
    for (const path of firestoreState.calledPaths) {
      expect(path.startsWith('users/u1/timetable')).toBe(true)
      expect(path).not.toContain('attendance')
    }
    expect(firestoreState.store.has('users/u1/attendance/Monday-09:00')).toBe(true)
    expect(firestoreState.store.get('users/u1/timetable/Monday-09:00')).toMatchObject({
      day: 'Monday',
      startTime: '09:00',
      endTime: '10:00',
      subjectCode: 'IT-301',
      type: 'Lecture',
      units: 1,
    })
  })

  it('deletes docs that are no longer present', async () => {
    firestoreState.store.set('users/u1/timetable/Monday-09:00', entry())
    firestoreState.store.set('users/u1/timetable/Tuesday-11:00', entry({ day: 'Tuesday' }))

    await saveTimetable('u1', [entry()])

    expect(firestoreState.store.has('users/u1/timetable/Monday-09:00')).toBe(true)
    expect(firestoreState.store.has('users/u1/timetable/Tuesday-11:00')).toBe(false)
  })

  it('groups records by user (group isolation across uids)', async () => {
    firestoreState.store.set(
      'users/u1/timetable/Monday-09:00',
      entry({ subjectCode: 'IT-301', group: 'A' }),
    )
    firestoreState.store.set(
      'users/u2/timetable/Monday-09:00',
      entry({ subjectCode: 'IT-355', type: 'Lab', units: 2, endTime: '11:00', group: 'B' }),
    )

    const forA = await getTimetable('u1')
    const forB = await getTimetable('u2')

    expect(forA).toHaveLength(1)
    expect(forA[0].subjectCode).toBe('IT-301')
    expect(forA[0].group).toBe('A')
    expect(forB).toHaveLength(1)
    expect(forB[0].subjectCode).toBe('IT-355')
    expect(forB[0].group).toBe('B')
  })

  it('round-trips saved entries through getTimetable', async () => {
    await saveTimetable('u1', [
      entry(),
      entry({ day: 'Tuesday', startTime: '11:00', endTime: '12:00' }),
    ])
    const result = await getTimetable('u1')
    expect(result).toHaveLength(2)
    expect(entryId(result[0])).toBe('Monday-09:00')
  })
})