import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Holiday } from '../data/calendar'
import type { TimetableEntry } from './timetable'
import { weekdayForDate, todayISO, formatDateLabel } from './dates'
import {
  attendanceDocId,
  defaultStatus,
  getAttendanceForDate,
  onAttendanceSnapshot,
  setAttendance,
  slotsForWeekday,
} from './attendance'
import type { AttendanceRecord } from './attendance'

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
  getDocs: vi.fn(async (ref: { path: string }) => firestoreState.snapshotFor(ref)),
  setDoc: vi.fn(async (ref: { path: string }, data: unknown) => {
    firestoreState.store.set(ref.path, data)
  }),
  onSnapshot: vi.fn((ref: Parameters<typeof firestoreState.snapshotFor>[0], next: (snap: unknown) => void) => {
    next(firestoreState.snapshotFor(ref))
    return vi.fn()
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

const mondayHoliday: Holiday = {
  date: '2026-10-26',
  day: 'Monday',
  name: "Maharishi Valmiki's Birthday",
  fallsOnWeekend: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  firestoreState.store.clear()
})

describe('dates', () => {
  it('todayISO returns YYYY-MM-DD', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('weekdayForDate maps known dates', () => {
    expect(weekdayForDate('2026-09-14')).toBe('Monday')
    expect(weekdayForDate('2026-10-02')).toBe('Friday')
    expect(weekdayForDate('2026-09-13')).toBe('Sunday')
    expect(weekdayForDate('2026-09-12')).toBe('Saturday')
  })

  it('formatDateLabel returns a human-readable label', () => {
    expect(formatDateLabel('2026-09-14')).toContain('Monday')
    expect(formatDateLabel('2026-09-14')).toContain('2026')
  })
})

describe('attendanceDocId', () => {
  it('joins date and slotId', () => {
    expect(attendanceDocId('2026-09-14', 'Monday-09:00')).toBe(
      '2026-09-14_Monday-09:00',
    )
  })
})

describe('slotsForWeekday', () => {
  it('expands a lab into two independently-loggable slots', () => {
    const lab = entry({
      day: 'Tuesday',
      startTime: '09:00',
      endTime: '11:00',
      type: 'Lab',
      units: 2,
      group: 'A',
    })
    const slots = slotsForWeekday([lab], 'Tuesday', 'A')
    expect(slots).toHaveLength(2)
    expect(slots[0].slotId).toBe('Tuesday-09:00')
    expect(slots[1].slotId).toBe('Tuesday-10:00')
    expect(slots[0].group).toBe('A')
    expect(slots[1].group).toBe('A')
  })

  it('filters labs belonging to other groups', () => {
    const labA = entry({
      day: 'Tuesday',
      startTime: '09:00',
      endTime: '11:00',
      type: 'Lab',
      units: 2,
      group: 'A',
    })
    const labB = entry({
      day: 'Tuesday',
      startTime: '14:00',
      endTime: '16:00',
      subjectCode: 'IT-356',
      subjectName: 'OS Lab',
      type: 'Lab',
      units: 2,
      group: 'B',
    })
    const slots = slotsForWeekday([labA, labB], 'Tuesday', 'A')
    expect(slots).toHaveLength(2)
    expect(slots.every((s) => s.group === 'A')).toBe(true)
  })

  it('includes lectures regardless of group', () => {
    const lecture = entry({ day: 'Monday', startTime: '11:00', endTime: '12:00' })
    const slots = slotsForWeekday([lecture], 'Monday', 'A')
    expect(slots).toHaveLength(1)
    expect(slots[0].slotId).toBe('Monday-11:00')
  })

  it('sorts slots by start time', () => {
    const e1 = entry({ day: 'Wednesday', startTime: '14:00', endTime: '15:00' })
    const e2 = entry({ day: 'Wednesday', startTime: '09:00', endTime: '10:00' })
    const slots = slotsForWeekday([e1, e2], 'Wednesday', 'A')
    expect(slots[0].startTime).toBe('09:00')
    expect(slots[1].startTime).toBe('14:00')
  })

  it('returns empty for a day with no timetable entries', () => {
    const slots = slotsForWeekday([entry()], 'Friday', 'A')
    expect(slots).toHaveLength(0)
  })
})

describe('defaultStatus', () => {
  const range = { start: '2026-10-14', end: '2026-10-16' }
  const noRange = { start: null, end: null }

  it('returns Holiday for a date in the holiday list', () => {
    expect(defaultStatus('2026-10-26', [mondayHoliday], noRange)).toBe('Holiday')
  })

  it('returns Holiday for a sports meet date', () => {
    expect(defaultStatus('2026-10-15', [], range)).toBe('Holiday')
  })

  it('returns null for a normal weekday', () => {
    expect(defaultStatus('2026-09-14', [mondayHoliday], noRange)).toBe(null)
  })

  it('returns null when holiday falls on a weekend', () => {
    const weekendHoliday: Holiday = {
      ...mondayHoliday,
      date: '2026-11-08',
      fallsOnWeekend: true,
    }
    expect(defaultStatus('2026-11-08', [weekendHoliday], noRange)).toBe(null)
  })
})

describe('attendance store', () => {
  it('setAttendance writes to users/{uid}/attendance/{date}_{slotId}', async () => {
    await setAttendance('u1', rec())
    expect(firestoreState.store.has('users/u1/attendance/2026-09-14_Monday-09:00')).toBe(
      true,
    )
    const stored = firestoreState.store.get(
      'users/u1/attendance/2026-09-14_Monday-09:00',
    ) as AttendanceRecord
    expect(stored.status).toBe('Present')
    expect(stored.subjectCode).toBe('IT-301')
  })

  it('getAttendanceForDate returns only matching date records', async () => {
    firestoreState.store.set(
      'users/u1/attendance/2026-09-14_Monday-09:00',
      rec({ date: '2026-09-14', slotId: 'Monday-09:00', status: 'Absent' }),
    )
    firestoreState.store.set(
      'users/u1/attendance/2026-09-15_Tuesday-09:00',
      rec({
        date: '2026-09-15',
        day: 'Tuesday',
        slotId: 'Tuesday-09:00',
        status: 'Present',
      }),
    )

    const results = await getAttendanceForDate('u1', '2026-09-14')
    expect(results).toHaveLength(1)
    expect(results[0].status).toBe('Absent')
    expect(results[0].date).toBe('2026-09-14')
  })

  it('onAttendanceSnapshot emits the current records and returns an unsubscribe', () => {
    firestoreState.store.set(
      'users/u1/attendance/2026-09-14_Monday-09:00',
      rec({ status: 'Absent' }),
    )
    const cb = vi.fn()
    const unsub = onAttendanceSnapshot('u1', cb)
    expect(cb).toHaveBeenCalledTimes(1)
    const emitted = cb.mock.calls[0][0] as AttendanceRecord[]
    expect(emitted).toHaveLength(1)
    expect(emitted[0].status).toBe('Absent')
    expect(typeof unsub).toBe('function')
  })
})