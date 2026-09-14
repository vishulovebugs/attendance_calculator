import { describe, expect, it } from 'vitest'
import type { AttendanceRecord } from './attendance'
import {
  attendancePercent,
  attendanceTotals,
  bunkProjection,
  perSubjectStats,
} from './stats'

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

describe('attendanceTotals', () => {
  it('counts Present as attended and conducted, Absent as conducted only', () => {
    const records = [
      rec({ subjectCode: 'IT-301', status: 'Present' }),
      rec({ slotId: 'Monday-10:00', subjectCode: 'IT-301', status: 'Present' }),
      rec({ slotId: 'Monday-11:00', subjectCode: 'IT-301', status: 'Absent' }),
      rec({ slotId: 'Monday-12:00', subjectCode: 'IT-301', status: 'No Class' }),
      rec({ slotId: 'Monday-13:00', subjectCode: 'IT-301', status: 'Holiday' }),
    ]
    expect(attendanceTotals(records)).toEqual({ attended: 2, conducted: 3 })
  })

  it('excludes No Class and Holiday from the denominator entirely', () => {
    const records = [
      rec({ status: 'No Class' }),
      rec({ slotId: 'Monday-10:00', status: 'Holiday' }),
    ]
    expect(attendanceTotals(records)).toEqual({ attended: 0, conducted: 0 })
  })

  it('filters records past the cutoff when one is given', () => {
    const records = [
      rec({ date: '2026-09-24', status: 'Present' }),
      rec({ date: '2026-10-05', status: 'Absent' }),
    ]
    expect(attendanceTotals(records, '2026-09-27')).toEqual({
      attended: 1,
      conducted: 1,
    })
    expect(attendanceTotals(records)).toEqual({ attended: 1, conducted: 2 })
  })
})

describe('attendancePercent', () => {
  it('computes attended / conducted × 100', () => {
    expect(attendancePercent(35, 40)).toBe(87.5)
    expect(attendancePercent(30, 40)).toBe(75)
    expect(attendancePercent(20, 40)).toBe(50)
  })

  it('returns null instead of NaN when conducted is zero', () => {
    expect(attendancePercent(0, 0)).toBe(null)
    expect(Number.isNaN(attendancePercent(0, 0))).toBe(false)
  })
})

describe('bunkProjection', () => {
  it('at exactly 75% the classes you can still miss is 0', () => {
    expect(bunkProjection(30, 40)).toEqual({ kind: 'miss', count: 0 })
  })

  it('at 87.5% you can miss 6 more classes', () => {
    expect(bunkProjection(35, 40)).toEqual({ kind: 'miss', count: 6 })
  })

  it('at 50% you need to attend the next 40 classes', () => {
    expect(bunkProjection(20, 40)).toEqual({ kind: 'need', count: 40 })
  })

  it('returns a large positive miss count, not negative or NaN', () => {
    const p = bunkProjection(39, 40)
    expect(p?.kind).toBe('miss')
    expect(p && p.count).toBeGreaterThan(0)
    expect(Number.isInteger(p?.count)).toBe(true)
  })

  it('returns null for no conducted classes', () => {
    expect(bunkProjection(0, 0)).toBe(null)
  })

  it('clamps a negative result to 0', () => {
    expect(bunkProjection(0, 5)).toEqual({ kind: 'need', count: 15 })
  })
})

describe('perSubjectStats', () => {
  it('groups records by subject, computing both till-Minor-1 and cumulative totals', () => {
    const records = [
      rec({ date: '2026-09-24', subjectCode: 'IT-301', status: 'Present' }),
      rec({
        date: '2026-10-05',
        slotId: 'Thursday-09:00',
        day: 'Thursday',
        subjectCode: 'IT-301',
        status: 'Absent',
      }),
      rec({
        date: '2026-09-21',
        slotId: 'Tuesday-09:00',
        day: 'Tuesday',
        subjectCode: 'IT-302',
        subjectName: 'OS',
        type: 'Lecture',
        status: 'Present',
      }),
    ]
    const rows = perSubjectStats(records, '2026-09-27')
    expect(rows).toHaveLength(2)
    const [a, b] = rows
    expect(a.subjectCode).toBe('IT-301')
    expect(a.tillMinor1).toEqual({ attended: 1, conducted: 1 })
    expect(a.cumulative).toEqual({ attended: 1, conducted: 2 })
    expect(b.subjectCode).toBe('IT-302')
    expect(b.cumulative).toEqual({ attended: 1, conducted: 1 })
  })

  it('excludes No Class and Holiday from both splits', () => {
    const records = [
      rec({ subjectCode: 'IT-301', status: 'Present' }),
      rec({ slotId: 'Monday-10:00', subjectCode: 'IT-301', status: 'No Class' }),
      rec({ slotId: 'Monday-11:00', subjectCode: 'IT-301', status: 'Holiday' }),
    ]
    const rows = perSubjectStats(records)
    expect(rows[0].cumulative).toEqual({ attended: 1, conducted: 1 })
  })

  it('keeps a subject with only No Class/Holiday records at conducted 0', () => {
    const records = [
      rec({ subjectCode: 'IT-302', subjectName: 'OS', status: 'No Class' }),
      rec({ slotId: 'Monday-10:00', subjectCode: 'IT-302', status: 'Holiday' }),
    ]
    const rows = perSubjectStats(records)
    expect(rows).toHaveLength(1)
    expect(rows[0].cumulative).toEqual({ attended: 0, conducted: 0 })
    expect(attendancePercent(rows[0].cumulative.attended, rows[0].cumulative.conducted)).toBe(
      null,
    )
  })

  it('sorts rows by subject code', () => {
    const records = [
      rec({ subjectCode: 'IT-303', subjectName: 'CN' }),
      rec({ slotId: 'Monday-10:00', subjectCode: 'IT-301', subjectName: 'DS', status: 'Absent' }),
    ]
    const rows = perSubjectStats(records)
    expect(rows.map((r) => r.subjectCode)).toEqual(['IT-301', 'IT-303'])
  })
})

describe('overall combined row', () => {
  it('sums all subjects into one total', () => {
    const records = [
      rec({ subjectCode: 'IT-301', status: 'Present' }),
      rec({ slotId: 'Monday-10:00', subjectCode: 'IT-301', status: 'Absent' }),
      rec({ slotId: 'Monday-11:00', subjectCode: 'IT-302', status: 'Present' }),
    ]
    expect(attendanceTotals(records)).toEqual({ attended: 2, conducted: 3 })
    expect(attendancePercent(2, 3)).toBeCloseTo(66.7, 1)
    expect(bunkProjection(2, 3)).toEqual({ kind: 'need', count: 1 })
  })
})