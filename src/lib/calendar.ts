import type { Holiday } from '../data/calendar'

export function isHoliday(date: string, holidays: readonly Holiday[]): boolean {
  return holidays.some((h) => h.date === date && !h.fallsOnWeekend)
}

export function isInSportsMeet(
  date: string,
  range: { start: string | null; end: string | null },
): boolean {
  if (!range.start || !range.end) {
    return false
  }
  return date >= range.start && date <= range.end
}