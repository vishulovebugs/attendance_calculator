import { describe, expect, it } from 'vitest'
import { HOLIDAYS } from '../data/calendar'
import { isHoliday, isInSportsMeet } from './calendar'

describe('isHoliday', () => {
  const weekdayHolidayDates = [
    '2026-08-26',
    '2026-09-04',
    '2026-10-02',
    '2026-10-20',
    '2026-10-26',
    '2026-11-24',
  ]

  it('returns true for weekday holidays', () => {
    for (const date of weekdayHolidayDates) {
      expect(isHoliday(date, HOLIDAYS)).toBe(true)
    }
  })

  it('returns false for weekend-flagged holidays', () => {
    expect(isHoliday('2026-08-15', HOLIDAYS)).toBe(false)
    expect(isHoliday('2026-11-08', HOLIDAYS)).toBe(false)
  })

  it('returns false for a non-holiday date', () => {
    expect(isHoliday('2026-09-15', HOLIDAYS)).toBe(false)
  })

  it('returns false when given an empty holiday list', () => {
    expect(isHoliday('2026-08-26', [])).toBe(false)
  })
})

describe('isInSportsMeet', () => {
  const range = { start: '2026-10-14', end: '2026-10-16' }

  it('returns true for dates within the inclusive range', () => {
    expect(isInSportsMeet('2026-10-14', range)).toBe(true)
    expect(isInSportsMeet('2026-10-15', range)).toBe(true)
    expect(isInSportsMeet('2026-10-16', range)).toBe(true)
  })

  it('returns false for dates just outside the range', () => {
    expect(isInSportsMeet('2026-10-13', range)).toBe(false)
    expect(isInSportsMeet('2026-10-17', range)).toBe(false)
  })

  it('returns false when range bounds are null', () => {
    expect(isInSportsMeet('2026-10-15', { start: null, end: null })).toBe(false)
  })
})